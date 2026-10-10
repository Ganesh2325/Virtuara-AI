from datetime import timedelta
from django.db.models import Count, Avg, Q
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import LearningSession, SessionMessage, SessionAnalytics, LearnerObjectiveState
from .serializers import (
    LearningSessionSerializer, LearningSessionDetailSerializer,
    SessionMessageSerializer, SessionCompleteSerializer, UserStatsSerializer,
    TurnSerializer, EnrichSerializer,
)
from .teaching import answer_turn, begin_session, enrich_saved_turn, resume_session


class LearningSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "session_type", "subject"]
    ordering_fields = ["started_at", "score", "duration_minutes"]
    ordering = ["-started_at"]
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return LearningSession.objects.filter(user=self.request.user).annotate(
            message_count=Count("messages")
        ).select_related("subject", "module")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return LearningSessionDetailSerializer
        return LearningSessionSerializer

    def perform_create(self, serializer):
        objective = serializer.validated_data.get("objective")
        subject = serializer.validated_data.get("subject")
        if objective is not None and objective.status != "published":
            raise ValidationError({"objective": "Only a published objective can be selected."})
        if objective is not None and subject is not None and objective.module.subject_id != subject.id:
            raise ValidationError({"objective": "That objective does not belong to the selected subject."})
        if objective is not None and subject is None:
            subject = objective.module.subject
            serializer.save(user=self.request.user, status="active", subject=subject, module=objective.module)
            return
        module = objective.module if objective is not None else serializer.validated_data.get("module")
        serializer.save(user=self.request.user, status="active", module=module)

    def _teaching_error(self, exc: ValueError):
        if str(exc) == "objective_required":
            return Response(
                {"error": "objective_required", "recoverable": True, "message": "Select a learning objective for this session."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        raise exc

    @action(detail=True, methods=["post"])
    def begin(self, request, pk=None):
        session = self.get_object()
        try:
            payload = begin_session(session)
        except ValueError as exc:
            return self._teaching_error(exc)
        return Response(payload)

    @action(detail=True, methods=["post"])
    def turns(self, request, pk=None):
        session = self.get_object()
        serializer = TurnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            code, payload = answer_turn(
                session,
                data["content"],
                data["client_turn_id"],
                request_model=data["request_model"],
            )
        except ValueError as exc:
            return self._teaching_error(exc)
        return Response(payload, status=code)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        session = self.get_object()
        try:
            payload = resume_session(session)
        except ValueError as exc:
            return self._teaching_error(exc)
        return Response(payload)

    @action(detail=True, methods=["get"])
    def progress(self, request, pk=None):
        session = self.get_object()
        if session.objective_id is None:
            return Response({"objective": None, "mastery": None})
        row = LearnerObjectiveState.objects.filter(user=request.user, objective=session.objective).first()
        if row is None:
            return Response({
                "objective": {"id": str(session.objective_id), "slug": session.objective.slug, "title": session.objective.title},
                "mastery": {"status": "unseen", "estimate": 0, "confidence": 0, "evidence_count": 0, "correct_count": 0},
            })
        return Response({
            "objective": {"id": str(session.objective_id), "slug": session.objective.slug, "title": session.objective.title},
            "mastery": {
                "status": row.status,
                "estimate": row.mastery_estimate,
                "confidence": row.confidence,
                "evidence_count": row.evidence_count,
                "correct_count": row.correct_count,
                "last_misconception": row.last_misconception,
            },
        })

    @action(detail=True, methods=["post"])
    def enrich(self, request, pk=None):
        session = self.get_object()
        serializer = EnrichSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code, payload = enrich_saved_turn(session, serializer.validated_data["client_turn_id"])
        return Response(payload, status=code)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        session = self.get_object()
        if session.status == "completed":
            return Response({"error": "Session already completed."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SessionCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        session.complete(score=data.get("score"))
        if data.get("notes"):
            session.notes = data["notes"]
            session.save(update_fields=["notes"])

        if data.get("analytics"):
            SessionAnalytics.objects.update_or_create(
                session=session, defaults=data["analytics"]
            )

        return Response(LearningSessionDetailSerializer(session).data)

    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        session = self.get_object()
        if request.method == "GET":
            msgs = session.messages.all()
            return Response(SessionMessageSerializer(msgs, many=True).data)
        serializer = SessionMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(session=session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        profile = request.user.profile
        week_ago = timezone.now() - timedelta(days=7)
        sessions = LearningSession.objects.filter(user=request.user)

        avg_score = sessions.filter(
            status="completed", score__isnull=False
        ).aggregate(avg=Avg("score"))["avg"]

        sessions_this_week = sessions.filter(started_at__gte=week_ago).count()

        favourite = (
            sessions.filter(subject__isnull=False)
            .values("subject__name")
            .annotate(cnt=Count("id"))
            .order_by("-cnt")
            .first()
        )

        data = {
            "total_sessions": profile.total_sessions,
            "total_study_minutes": profile.total_study_minutes,
            "streak_days": profile.streak_days,
            "average_score": round(avg_score, 1) if avg_score else None,
            "sessions_this_week": sessions_this_week,
            "favourite_subject": favourite["subject__name"] if favourite else None,
        }
        return Response(UserStatsSerializer(data).data)
