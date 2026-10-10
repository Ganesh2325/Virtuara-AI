"""Shared voice turn entry for learning, quizzes, and interviews.

Speech is captured in the browser. This view does not invent a reply.
Learning and interview turns use the existing authoritative services.
A general question fails closed when no text provider is configured.
"""

from __future__ import annotations

import os

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.interviews.engine import record_answer
from apps.interviews.models import InterviewSession
from apps.sessions.models import LearningSession
from apps.sessions.providers import get_text_provider
from apps.sessions.teaching import answer_turn

CONTEXTS = {"general", "learning", "quiz", "interview"}


def speech_meta() -> dict:
    provider = get_text_provider()
    configured = bool(os.environ.get("VIRTUARA_TEXT_PROVIDER_API_KEY", "").strip()) and provider.name != "unconfigured"
    return {
        "identity": "aria",
        "realtime_webrtc": False,
        "live_avatar_stream": False,
        "speech_transport": "browser_speech_api",
        "text_provider_configured": configured,
        "text_provider": provider.name,
    }


class VoiceStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = speech_meta()
        payload["note"] = (
            "Browser speech recognition and synthesis can carry turns. "
            "A live bidirectional audio provider and a MetaHuman stream are not configured."
        )
        return Response(payload)


class VoiceTurnView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        context = request.data.get("context")
        content = (request.data.get("content") or "").strip()
        client_turn_id = (request.data.get("client_turn_id") or "").strip()[:80]
        if context not in CONTEXTS or not content or not client_turn_id:
            return Response(
                {"error": "invalid_turn", "message": "A context, transcript, and client turn id are required."},
                status=400,
            )
        if context in {"learning", "quiz"}:
            return self._learning(request, context, content, client_turn_id)
        if context == "interview":
            return self._interview(request, content, client_turn_id)
        return self._general(content)

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

    def _general(self, content):
        meta = speech_meta()
        if not meta["text_provider_configured"]:
            return Response(
                {
                    "error": "ai_provider_unavailable",
                    "recoverable": True,
                    "heard": content,
                    "spoken_text": None,
                    "message": "Your words were received. No text-generation provider is configured, so Aria did not invent a reply.",
                    **meta,
                },
                status=503,
            )
        return Response(
            {
                "error": "provider_adapter_missing",
                "recoverable": True,
                "heard": content,
                "spoken_text": None,
                "message": "A text provider is named, but this build has no adapter for open conversation.",
                **meta,
            },
            status=503,
        )
