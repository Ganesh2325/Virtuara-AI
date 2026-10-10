import uuid
from django.db import models
from django.conf import settings


class LearningSession(models.Model):
    STATUS = [
        ("pending", "Pending"),
        ("active", "Active"),
        ("completed", "Completed"),
        ("interrupted", "Interrupted"),
    ]
    SESSION_TYPES = [
        ("tutor", "AI Tutoring"),
        ("quiz", "Quiz"),
        ("practice", "Practice"),
        ("review", "Review"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_sessions")
    subject = models.ForeignKey("subjects.Subject", on_delete=models.SET_NULL, null=True, related_name="learning_sessions")
    module = models.ForeignKey("subjects.Module", on_delete=models.SET_NULL, null=True, blank=True, related_name="learning_sessions")
    objective = models.ForeignKey(
        "subjects.LearningObjective", on_delete=models.SET_NULL, null=True, blank=True, related_name="learning_sessions"
    )
    pending_question = models.ForeignKey(
        "subjects.PracticeQuestion", on_delete=models.SET_NULL, null=True, blank=True, related_name="pending_in_sessions"
    )
    hint_given = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES, default="tutor")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    score = models.PositiveSmallIntegerField(null=True, blank=True, help_text="0–100")
    ai_model = models.CharField(max_length=100, default="claude-sonnet-4-6")
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "learning_sessions"
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "started_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.subject} ({self.status})"

    def complete(self, score=None):
        from django.utils import timezone
        import math
        self.status = "completed"
        self.ended_at = timezone.now()
        duration = (self.ended_at - self.started_at).total_seconds() / 60
        self.duration_minutes = math.ceil(duration)
        if score is not None:
            self.score = score
        self.save()
        self._update_user_stats()

    def _update_user_stats(self):
        from django.utils import timezone
        profile = self.user.profile
        profile.total_sessions = models.F("total_sessions") + 1
        if self.duration_minutes:
            profile.total_study_minutes = models.F("total_study_minutes") + self.duration_minutes
        today = timezone.now().date()
        if profile.last_session_date == today - __import__("datetime").timedelta(days=1):
            profile.streak_days = models.F("streak_days") + 1
        elif profile.last_session_date != today:
            profile.streak_days = 1
        profile.last_session_date = today
        profile.save()


class SessionMessage(models.Model):
    ROLES = [("user", "User"), ("assistant", "Assistant"), ("system", "System")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=20, choices=ROLES)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    tokens_used = models.PositiveIntegerField(default=0)
    is_flagged = models.BooleanField(default=False)

    class Meta:
        db_table = "session_messages"
        ordering = ["timestamp"]

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}"


class SessionAnalytics(models.Model):
    session = models.OneToOneField(LearningSession, on_delete=models.CASCADE, related_name="analytics")
    concepts_covered = models.JSONField(default=list)
    mastery_score = models.FloatField(null=True, blank=True)
    engagement_score = models.FloatField(null=True, blank=True)
    difficulty_level = models.FloatField(null=True, blank=True)
    improvement_areas = models.JSONField(default=list)
    summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "session_analytics"

    def __str__(self):
        return f"Analytics({self.session_id})"


class LearnerObjectiveState(models.Model):
    """Evidence-based picture of one learner on one objective.

    Status meanings:
    - unseen: no scored attempt
    - practising: at least one attempt, mastery not shown
    - demonstrated: one correct attempt; not yet retained
    - retained: two correct attempts after the policy threshold
    """

    STATUSES = [
        ("unseen", "Unseen"),
        ("practising", "Practising"),
        ("demonstrated", "Demonstrated"),
        ("retained", "Retained"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="objective_states")
    objective = models.ForeignKey("subjects.LearningObjective", on_delete=models.CASCADE, related_name="learner_states")
    status = models.CharField(max_length=20, choices=STATUSES, default="unseen")
    mastery_estimate = models.FloatField(default=0.0)
    confidence = models.FloatField(default=0.0)
    evidence_count = models.PositiveIntegerField(default=0)
    correct_count = models.PositiveIntegerField(default=0)
    incorrect_streak = models.PositiveIntegerField(default=0)
    last_misconception = models.CharField(max_length=80, blank=True)
    declared_level = models.CharField(max_length=40, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "learner_objective_states"
        constraints = [
            models.UniqueConstraint(fields=["user", "objective"], name="uniq_learner_objective_state"),
        ]

    def __str__(self):
        return f"{self.user_id} {self.objective_id} {self.status}"


class MasteryEvidence(models.Model):
    OUTCOMES = [
        ("correct", "Correct"),
        ("incorrect", "Incorrect"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mastery_evidence")
    objective = models.ForeignKey("subjects.LearningObjective", on_delete=models.CASCADE, related_name="evidence")
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="evidence")
    question = models.ForeignKey("subjects.PracticeQuestion", on_delete=models.SET_NULL, null=True, related_name="evidence")
    outcome = models.CharField(max_length=20, choices=OUTCOMES)
    response_text = models.TextField()
    misconception = models.CharField(max_length=80, blank=True)
    action = models.CharField(max_length=40)
    rationale = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "mastery_evidence"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["user", "objective", "created_at"], name="mastery_evidence_lookup"),
        ]

    def __str__(self):
        return f"{self.outcome} {self.action}"


class SessionTurn(models.Model):
    """One learner submission and the teaching decision it produced."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="turns")
    client_turn_id = models.CharField(max_length=80)
    sequence = models.PositiveIntegerField()
    learner_message = models.TextField(blank=True)
    action = models.CharField(max_length=40)
    response_payload = models.JSONField(default=dict)
    http_status = models.PositiveSmallIntegerField(default=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "session_turns"
        ordering = ["sequence"]
        constraints = [
            models.UniqueConstraint(fields=["session", "client_turn_id"], name="uniq_session_client_turn"),
        ]
