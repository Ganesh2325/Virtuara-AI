from rest_framework import serializers
from apps.subjects.models import LearningObjective
from apps.subjects.serializers import SubjectSerializer, ModuleSerializer
from .models import LearningSession, SessionMessage, SessionAnalytics


class SessionMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionMessage
        fields = ("id", "role", "content", "timestamp", "tokens_used")
        read_only_fields = ("id", "timestamp")


class SessionAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionAnalytics
        fields = ("concepts_covered", "mastery_score", "engagement_score",
                  "difficulty_level", "improvement_areas", "summary")


class LearningSessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True, default=None)
    subject_icon = serializers.CharField(source="subject.icon", read_only=True, default=None)
    subject_slug = serializers.CharField(source="subject.slug", read_only=True, default=None)
    module_title = serializers.CharField(source="module.title", read_only=True, default=None)
    objective_title = serializers.CharField(source="objective.title", read_only=True, default=None)
    objective_slug = serializers.CharField(source="objective.slug", read_only=True, default=None)
    message_count = serializers.SerializerMethodField()
    objective = serializers.PrimaryKeyRelatedField(
        queryset=LearningObjective.objects.filter(status="published"),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = LearningSession
        fields = (
            "id", "subject", "subject_name", "subject_icon", "subject_slug",
            "module", "module_title",
            "objective", "objective_title", "objective_slug",
            "status", "session_type", "started_at", "ended_at",
            "duration_minutes", "score", "ai_model", "message_count",
        )
        read_only_fields = ("id", "started_at", "ended_at", "duration_minutes", "status")

    def get_message_count(self, obj):
        return getattr(obj, "message_count", None) or obj.messages.count()


class LearningSessionDetailSerializer(LearningSessionSerializer):
    messages = SessionMessageSerializer(many=True, read_only=True)
    analytics = serializers.SerializerMethodField()
    subject_detail = SubjectSerializer(source="subject", read_only=True)
    module_detail = ModuleSerializer(source="module", read_only=True)

    def get_analytics(self, obj):
        try:
            analytics = obj.analytics
        except SessionAnalytics.DoesNotExist:
            return None
        return SessionAnalyticsSerializer(analytics).data

    class Meta(LearningSessionSerializer.Meta):
        fields = LearningSessionSerializer.Meta.fields + ("messages", "analytics", "subject_detail", "module_detail", "notes")


class SessionCompleteSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=0, max_value=100, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    analytics = SessionAnalyticsSerializer(required=False)


class TurnSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=True)
    client_turn_id = serializers.CharField(max_length=80)
    request_model = serializers.BooleanField(required=False, default=False)


class EnrichSerializer(serializers.Serializer):
    client_turn_id = serializers.CharField(max_length=80)


class UserStatsSerializer(serializers.Serializer):
    total_sessions = serializers.IntegerField()
    total_study_minutes = serializers.IntegerField()
    streak_days = serializers.IntegerField()
    average_score = serializers.FloatField(allow_null=True)
    sessions_this_week = serializers.IntegerField()
    favourite_subject = serializers.CharField(allow_null=True)
