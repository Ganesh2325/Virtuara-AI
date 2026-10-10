import uuid

from django.conf import settings
from django.db import models


ALLOWED_DURATIONS = (10, 15, 20, 25, 30)


class Resume(models.Model):
    STATUSES = [
        ("processing", "Processing"),
        ("ready", "Ready"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resumes")
    file = models.FileField(upload_to="resumes/%Y/%m/")
    original_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUSES, default="processing")
    extracted_text = models.TextField(blank=True)
    profile = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resumes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.original_name} ({self.status})"


class InterviewSession(models.Model):
    TYPES = [
        ("technical", "Technical"),
        ("behavioral", "Behavioral"),
        ("project", "Project deep dive"),
        ("mixed", "Mixed"),
    ]
    STATUSES = [
        ("ready", "Ready"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("aborted", "Aborted"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="interview_sessions")
    resume = models.ForeignKey(Resume, on_delete=models.PROTECT, related_name="interviews")
    target_role = models.CharField(max_length=200, blank=True)
    interview_type = models.CharField(max_length=20, choices=TYPES, default="mixed")
    duration_minutes = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=STATUSES, default="running")
    started_at = models.DateTimeField()
    deadline_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    current_prompt = models.TextField(blank=True)
    asked_topics = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_sessions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"], name="interview_user_status"),
        ]

    def __str__(self):
        return f"{self.user_id} {self.status} {self.duration_minutes}m"


class InterviewTurn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name="turns")
    client_turn_id = models.CharField(max_length=80)
    sequence = models.PositiveIntegerField()
    question = models.TextField()
    answer = models.TextField(blank=True)
    evaluation = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_turns"
        ordering = ["sequence"]
        constraints = [
            models.UniqueConstraint(fields=["session", "client_turn_id"], name="uniq_interview_client_turn"),
        ]


class InterviewReport(models.Model):
    session = models.OneToOneField(InterviewSession, on_delete=models.CASCADE, related_name="report")
    actual_minutes = models.FloatField()
    completed = models.BooleanField(default=False)
    strengths = models.JSONField(default=list)
    improvements = models.JSONField(default=list)
    questions = models.JSONField(default=list)
    summary = models.TextField()
    disclaimer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_reports"
