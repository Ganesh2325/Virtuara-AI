from django.contrib import admin
from .models import LearningSession, SessionMessage, SessionAnalytics


class SessionMessageInline(admin.TabularInline):
    model = SessionMessage
    extra = 0
    fields = ("role", "content", "timestamp", "tokens_used")
    readonly_fields = ("timestamp",)


@admin.register(LearningSession)
class LearningSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "subject", "status", "session_type", "score", "duration_minutes", "started_at")
    list_filter = ("status", "session_type", "subject")
    search_fields = ("user__email", "subject__name")
    raw_id_fields = ("user",)
    inlines = [SessionMessageInline]
    readonly_fields = ("started_at", "ended_at", "duration_minutes")
    ordering = ("-started_at",)


@admin.register(SessionAnalytics)
class SessionAnalyticsAdmin(admin.ModelAdmin):
    list_display = ("session", "mastery_score", "engagement_score", "created_at")
    raw_id_fields = ("session",)
