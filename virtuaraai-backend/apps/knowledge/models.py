import uuid

from django.conf import settings
from django.db import models


class KnowledgeSource(models.Model):
    """A private document. Chat scope stays with one conversation; subject scope is reusable."""

    SCOPES = [("chat", "This chat"), ("subject", "Subject knowledge")]
    STATUSES = [
        ("pending", "Pending"),
        ("indexed", "Indexed"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="knowledge_sources")
    subject = models.ForeignKey(
        "subjects.Subject",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="knowledge_sources",
    )
    conversation = models.ForeignKey(
        "voice.GeneralConversation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="knowledge_sources",
    )
    title = models.CharField(max_length=300)
    filename = models.CharField(max_length=300, blank=True)
    scope = models.CharField(max_length=20, choices=SCOPES, default="chat")
    status = models.CharField(max_length=20, choices=STATUSES, default="pending")
    error = models.TextField(blank=True)
    fingerprint = models.CharField(max_length=64, blank=True)
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "knowledge_sources"
        indexes = [models.Index(fields=["owner", "scope", "created_at"], name="knowledge_owner_scope")]


class KnowledgeChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey(KnowledgeSource, on_delete=models.CASCADE, related_name="chunks")
    ordinal = models.PositiveIntegerField()
    heading = models.CharField(max_length=300, blank=True)
    text = models.TextField()

    class Meta:
        db_table = "knowledge_chunks"
        ordering = ["ordinal"]
        constraints = [
            models.UniqueConstraint(fields=["source", "ordinal"], name="uniq_knowledge_chunk_order"),
        ]
