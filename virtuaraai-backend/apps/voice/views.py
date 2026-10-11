"""Shared voice turn entry for learning, quizzes, and interviews.

Speech is captured in the browser. This view does not invent a reply.
Learning and interview turns use the existing authoritative services.
A general question fails closed when no text provider is configured.
"""

from __future__ import annotations

import json

from django.http import StreamingHttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.interviews.engine import record_answer
from apps.interviews.models import InterviewSession
from apps.sessions.models import LearningSession
from apps.sessions.providers import get_text_provider
from apps.sessions.teaching import answer_turn
from apps.voice.general import general_stream, general_turn
from apps.voice.models import GeneralConversation
from apps.voice.throttles import VoiceTurnThrottle

CONTEXTS = {"general", "learning", "quiz", "interview"}


def speech_meta() -> dict:
    provider = get_text_provider()
    payload = {
        "identity": "aria",
        "realtime_webrtc": False,
        "live_avatar_stream": False,
        "speech_transport": "browser_speech_api",
        "text_provider_configured": provider.configured,
        "text_provider": provider.name,
        "text_model": provider.model,
    }
    if not provider.configured:
        payload["text_provider_error"] = getattr(
            provider,
            "reason",
            "No text-generation provider is configured.",
        )
    return payload


class VoiceStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = speech_meta()
        payload["note"] = (
            "Browser speech recognition and synthesis carry audio. "
            "Final transcripts use the configured server-side text provider. "
            "WebRTC audio and MetaHuman streaming are not enabled in this build."
        )
        return Response(payload)


class VoiceTurnView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [VoiceTurnThrottle]

    def post(self, request):
        context = request.data.get("context")
        content = (request.data.get("content") or "").strip()
        client_turn_id = (request.data.get("client_turn_id") or "").strip()[:80]
        if context not in CONTEXTS or not content or not client_turn_id:
            return Response(
                {"error": "invalid_turn", "message": "A context, transcript, and client turn id are required."},
                status=400,
            )
        if len(content) > 4000:
            return Response(
                {"error": "message_too_large", "message": "Voice transcripts are limited to 4000 characters."},
                status=400,
            )
        if context in {"learning", "quiz"}:
            return self._learning(request, context, content, client_turn_id)
        if context == "interview":
            return self._interview(request, content, client_turn_id)
        return self._general(request, content, client_turn_id)

    def _learning(self, request, context, content, client_turn_id):
        session = LearningSession.objects.filter(
            user=request.user, pk=request.data.get("learning_session_id")
        ).first()
        if session is None:
            return Response(
                {
                    "error": "learning_context_required",
                    "message": "Start a lesson before sending a spoken answer. This transcript was not scored.",
                    **speech_meta(),
                },
                status=409,
            )
        try:
            code, payload = answer_turn(session, content, client_turn_id)
        except ValueError:
            return Response(
                {
                    "error": "objective_required",
                    "message": "This lesson has no published objective, so the spoken answer was not scored.",
                    **speech_meta(),
                },
                status=400,
            )
        payload = dict(payload)
        payload.update(speech_meta())
        payload["context"] = context
        payload["spoken_text"] = payload.get("response_text")
        payload["input_modality"] = "speech"
        return Response(payload, status=code)

    def _interview(self, request, content, client_turn_id):
        session = InterviewSession.objects.filter(
            user=request.user, pk=request.data.get("interview_session_id")
        ).select_related("resume").first()
        if session is None:
            return Response(
                {
                    "error": "interview_context_required",
                    "message": "Start an interview before sending a spoken answer.",
                    **speech_meta(),
                },
                status=409,
            )
        code, payload = record_answer(session, content, client_turn_id)
        payload = dict(payload)
        payload.update(speech_meta())
        payload["context"] = "interview"
        payload["spoken_text"] = payload.get("response_text")
        payload["input_modality"] = "speech"
        return Response(payload, status=code)

    def _general(self, request, content, client_turn_id):
        code, payload = general_turn(
            user=request.user,
            content=content,
            client_turn_id=client_turn_id,
            conversation_id=request.data.get("conversation_id"),
            subject=(request.data.get("subject") or ""),
        )
        payload.update(speech_meta())
        payload["input_modality"] = (
            "text" if request.data.get("input_modality") == "text" else "speech"
        )
        return Response(payload, status=code)


class GeneralStreamView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [VoiceTurnThrottle]

    def post(self, request):
        content = (request.data.get("content") or "").strip()
        client_turn_id = (request.data.get("client_turn_id") or "").strip()[:80]
        if not content or not client_turn_id:
            return Response(
                {"error": "invalid_turn", "message": "A transcript and client turn id are required."},
                status=400,
            )
        code, result = general_stream(
            user=request.user,
            content=content,
            client_turn_id=client_turn_id,
            conversation_id=request.data.get("conversation_id"),
            subject=(request.data.get("subject") or ""),
        )
        if code != 200 or isinstance(result, dict):
            return Response(result, status=code)

        def encoded_events():
            for event in result:
                yield f"data:{json.dumps(event, separators=(',', ':'))}\n\n"

        response = StreamingHttpResponse(encoded_events(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache, no-store"
        response["X-Accel-Buffering"] = "no"
        return response


class ConversationCollectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = GeneralConversation.objects.filter(user=request.user).order_by("-updated_at")[:30]
        return Response(
            [
                {
                    "id": str(item.id),
                    "subject": item.subject,
                    "status": item.status,
                    "turn_count": item.turns.count(),
                    "updated_at": item.updated_at.isoformat(),
                }
                for item in conversations
            ]
        )


class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        conversation = GeneralConversation.objects.filter(user=request.user, pk=conversation_id).first()
        if conversation is None:
            return Response({"error": "not_found"}, status=404)
        turns = conversation.turns.order_by("created_at")[:100]
        return Response(
            {
                "id": str(conversation.id),
                "subject": conversation.subject,
                "status": conversation.status,
                "turns": [
                    {
                        "id": str(turn.id),
                        "user_text": turn.user_text,
                        "assistant_text": turn.assistant_text,
                        "created_at": turn.created_at.isoformat(),
                    }
                    for turn in turns
                ],
            }
        )

    def delete(self, request, conversation_id):
        conversation = GeneralConversation.objects.filter(user=request.user, pk=conversation_id).first()
        if conversation is None:
            return Response({"error": "not_found"}, status=404)
        conversation.delete()
        return Response(status=204)
