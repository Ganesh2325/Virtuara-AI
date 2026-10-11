from django.shortcuts import get_object_or_404
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.subjects.access import visible_subjects
from apps.voice.models import GeneralConversation

from .ingest import fingerprint, index_source
from .models import KnowledgeSource
from .research import research_available, validate_public_url

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _extract_text(upload) -> str:
    name = (upload.name or "").lower()
    raw = upload.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValueError("Files are limited to 5 MB.")
    if name.endswith(".pdf"):
        from io import BytesIO
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(raw))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if name.endswith((".txt", ".md", ".markdown", ".csv")):
        return raw.decode("utf-8", errors="replace")
    raise ValueError("Supported uploads are PDF, TXT, Markdown, and CSV.")


class KnowledgeSourceListView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        sources = KnowledgeSource.objects.filter(owner=request.user).order_by("-created_at")[:100]
        return Response([_source_payload(source) for source in sources])

    def post(self, request):
        upload = request.FILES.get("file")
        pasted = (request.data.get("text") or "").strip()
        if upload is None and not pasted:
            return Response({"error": "Add a file or some text."}, status=400)
        try:
            text = _extract_text(upload) if upload is not None else pasted[:200_000]
        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        except Exception:
            return Response({"error": "The file could not be read."}, status=400)

        scope = "subject" if str(request.data.get("save_to_subject", "")).lower() == "true" else "chat"
        subject = None
        conversation = None
        if request.data.get("subject_id"):
            subject = visible_subjects(request.user).filter(pk=request.data.get("subject_id")).first()
            if subject is None:
                return Response({"error": "Choose one of your subjects before saving knowledge."}, status=400)
        if scope == "subject" and subject is None:
            return Response({"error": "Choose one of your subjects before saving knowledge."}, status=400)
        if request.data.get("conversation_id"):
            conversation = GeneralConversation.objects.filter(
                user=request.user, pk=request.data.get("conversation_id")
            ).first()
            if conversation is None:
                return Response({"error": "That conversation is unavailable."}, status=404)

        digest = fingerprint(text.strip())
        existing = KnowledgeSource.objects.filter(
            owner=request.user, fingerprint=digest, scope=scope, subject=subject, status="indexed"
        ).first()
        if existing is not None:
            return Response(_source_payload(existing), status=200)

        source = KnowledgeSource.objects.create(
            owner=request.user,
            subject=subject,
            conversation=conversation,
            title=(request.data.get("title") or (upload.name if upload else "Pasted note"))[:300],
            filename=(upload.name if upload else "")[:300],
            scope=scope,
        )
        index_source(source, text)
        status = 201 if source.status == "indexed" else 422
        return Response(_source_payload(source), status=status)


class KnowledgeSourceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, source_id):
        source = get_object_or_404(KnowledgeSource, pk=source_id, owner=request.user)
        source.delete()
        return Response(status=204)


class WebResearchStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        url = (request.data.get("url") or "").strip()
        if url:
            try:
                validate_public_url(url)
            except ValueError as exc:
                return Response({"available": research_available(), "error": str(exc)}, status=400)
        if not research_available():
            return Response({
                "available": False,
                "error": "Web research is not configured on the server.",
            }, status=503)
        return Response({"available": True, "url": url or None})


def _source_payload(source: KnowledgeSource) -> dict:
    return {
        "id": str(source.id),
        "title": source.title,
        "filename": source.filename,
        "scope": source.scope,
        "status": source.status,
        "error": source.error,
        "subject_id": str(source.subject_id) if source.subject_id else None,
        "conversation_id": str(source.conversation_id) if source.conversation_id else None,
        "chunk_count": source.chunks.count(),
    }
