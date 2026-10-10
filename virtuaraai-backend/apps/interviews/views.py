from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.interviews.engine import (
    abort_session,
    opening_question,
    public_session,
    record_answer,
    validate_duration,
)
from apps.interviews.models import InterviewReport, InterviewSession, Resume
from apps.interviews.parsing import MAX_RESUME_BYTES
from apps.interviews.tasks import parse_resume_task


def _resume_payload(resume: Resume) -> dict:
    return {
        "id": str(resume.id),
        "status": resume.status,
        "original_name": resume.original_name,
        "profile": resume.profile if resume.status == "ready" else {},
        "error": resume.error,
        "created_at": resume.created_at.isoformat(),
    }


class ResumeUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"error": "file_required", "message": "Upload a resume file."}, status=400)
        name = upload.name or ""
        if not name.lower().endswith((".txt", ".pdf", ".docx")):
            return Response(
                {"error": "unsupported_type", "message": "Upload a .txt, .pdf, or .docx resume."},
                status=400,
            )
        if upload.size > MAX_RESUME_BYTES:
            return Response({"error": "file_too_large", "message": "Resume files must be 5 MB or smaller."}, status=400)
        resume = Resume.objects.create(user=request.user, file=upload, original_name=name, status="processing")
        try:
            parse_resume_task.delay(str(resume.id))
        except Exception:
            resume.status = "failed"
            resume.error = "Background processing is unavailable. The resume was not parsed."
            resume.save(update_fields=["status", "error", "updated_at"])
            return Response(
                {"error": "worker_unavailable", "recoverable": True, "message": resume.error, "resume": _resume_payload(resume)},
                status=503,
            )
        resume.refresh_from_db()
        code = 201 if resume.status == "processing" else 200
        return Response(_resume_payload(resume), status=code)


class ResumeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, resume_id):
        resume = Resume.objects.filter(user=request.user, pk=resume_id).first()
        if resume is None:
            return Response({"error": "not_found"}, status=404)
        return Response(_resume_payload(resume))

    def delete(self, request, resume_id):
        resume = Resume.objects.filter(user=request.user, pk=resume_id).first()
        if resume is None:
            return Response({"error": "not_found"}, status=404)
        if resume.file:
            resume.file.delete(save=False)
        resume.extracted_text = ""
        resume.profile = {}
        resume.status = "failed"
        resume.error = "Deleted by the owner."
        resume.save(update_fields=["extracted_text", "profile", "status", "error", "updated_at"])
        return Response(status=204)


class InterviewCollectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = InterviewSession.objects.filter(user=request.user).order_by("-created_at")[:20]
        return Response([public_session(item) for item in sessions])

    def post(self, request):
        resume = Resume.objects.filter(user=request.user, pk=request.data.get("resume_id")).first()
        if resume is None:
            return Response({"error": "resume_required", "message": "Upload and parse a resume before starting."}, status=400)
        if resume.status != "ready":
            return Response(
                {"error": "resume_not_ready", "message": resume.error or "The resume is not ready.", "status": resume.status},
                status=400,
            )
        try:
            minutes = int(request.data.get("duration_minutes"))
        except (TypeError, ValueError):
            return Response({"error": "invalid_duration", "message": "Duration is required."}, status=400)
        duration_error = validate_duration(minutes)
        if duration_error:
            return Response({"error": "invalid_duration", "message": duration_error}, status=400)
        interview_type = request.data.get("interview_type") or "mixed"
        if interview_type not in {"technical", "behavioral", "project", "mixed"}:
            return Response({"error": "invalid_type", "message": "Unsupported interview type."}, status=400)
        role = (request.data.get("target_role") or "")[:200]
        prompt, topic = opening_question(resume.profile, role, interview_type)
        now = timezone.now()
        session = InterviewSession.objects.create(
            user=request.user,
            resume=resume,
            target_role=role,
            interview_type=interview_type,
            duration_minutes=minutes,
            status="running",
            started_at=now,
            deadline_at=now + timedelta(minutes=minutes),
            current_prompt=prompt,
            asked_topics=[topic],
        )
        payload = public_session(session)
        payload["response_text"] = prompt
        return Response(payload, status=201)


class InterviewDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _session(self, request, session_id):
        return InterviewSession.objects.filter(user=request.user, pk=session_id).select_related("resume").first()

    def get(self, request, session_id):
        session = self._session(request, session_id)
        if session is None:
            return Response({"error": "not_found"}, status=404)
        return Response(public_session(session))


class InterviewAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = InterviewSession.objects.filter(user=request.user, pk=session_id).select_related("resume").first()
        if session is None:
            return Response({"error": "not_found"}, status=404)
        content = (request.data.get("content") or "").strip()
        client_turn_id = (request.data.get("client_turn_id") or "").strip()
        if not content or not client_turn_id:
            return Response({"error": "invalid_turn", "message": "An answer and client turn id are required."}, status=400)
        code, payload = record_answer(session, content, client_turn_id[:80])
        return Response(payload, status=code)


class InterviewAbortView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = InterviewSession.objects.filter(user=request.user, pk=session_id).first()
        if session is None:
            return Response({"error": "not_found"}, status=404)
        return Response(abort_session(session))


class InterviewReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = InterviewSession.objects.filter(user=request.user, pk=session_id).first()
        if session is None:
            return Response({"error": "not_found"}, status=404)
        try:
            report = session.report
        except InterviewReport.DoesNotExist:
            return Response({"error": "report_not_ready", "message": "The interview has no report yet."}, status=404)
        from apps.interviews.engine import _report_payload

        return Response(_report_payload(report))
