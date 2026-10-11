import uuid

from django.conf import settings
from django.db import models


class GeneralConversation(models.Model):
    STATUSES = [("active", "Active"), ("ended", "Ended")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="general_conversations")
    subject_ref = models.ForeignKey(
        "subjects.Subject",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="general_conversations",
    )
    subject = models.CharField(max_length=120, blank=True)
    topic = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "general_conversations"
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["user", "updated_at"], name="general_conv_owner_time")]


class GeneralTurn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(GeneralConversation, on_delete=models.CASCADE, related_name="turns")
    client_turn_id = models.CharField(max_length=80, unique=True)
    user_text = models.TextField()
    assistant_text = models.TextField()
    response_payload = models.JSONField(default=dict)
    provider = models.CharField(max_length=40)
    model = models.CharField(max_length=120)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "general_turns"
        ordering = ["created_at"]
        indexes = [models.Index(fields=["conversation", "created_at"], name="general_turn_context")]


class ProviderUsage(models.Model):
    STATUSES = [
        ("success", "Success"),
        ("unavailable", "Unavailable"),
        ("timeout", "Timeout"),
        ("rate_limited", "Rate limited"),
        ("invalid_response", "Invalid response"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="provider_usage")
    conversation = models.ForeignKey(
        GeneralConversation, on_delete=models.SET_NULL, null=True, blank=True, related_name="provider_usage"
    )
    correlation_id = models.CharField(max_length=80)
    provider = models.CharField(max_length=40)
    model = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=30, choices=STATUSES)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "provider_usage"
        indexes = [
            models.Index(fields=["user", "created_at"], name="provider_usage_owner"),
            models.Index(fields=["provider", "status"], name="provider_usage_status"),
        ]
