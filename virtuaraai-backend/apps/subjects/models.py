import uuid
from django.db import models


class Subject(models.Model):
    CATEGORIES = [
        ("science", "Science"),
        ("mathematics", "Mathematics"),
        ("humanities", "Humanities"),
        ("technology", "Technology"),
        ("arts", "Arts"),
        ("business", "Business"),
        ("languages", "Languages"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, blank=True, help_text="Emoji icon")
    category = models.CharField(max_length=50, choices=CATEGORIES, default="science")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "subjects"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Module(models.Model):
    DIFFICULTIES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTIES, default="beginner")
    order = models.PositiveIntegerField(default=0)
    estimated_minutes = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "modules"
        ordering = ["order"]
        unique_together = [["subject", "order"]]

    def __str__(self):
        return f"{self.subject.name} — {self.title}"


class LearningObjective(models.Model):
    """A measurable goal inside a module. Mastery is evidence, not a page view."""

    STATUSES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="objectives")
    slug = models.SlugField(max_length=120)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    difficulty = models.CharField(max_length=20, choices=Module.DIFFICULTIES, default="beginner")
    status = models.CharField(max_length=20, choices=STATUSES, default="draft")
    order = models.PositiveIntegerField(default=0)
    prerequisites = models.ManyToManyField(
        "self", symmetrical=False, blank=True, related_name="dependents"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "learning_objectives"
        ordering = ["order", "title"]
        constraints = [
            models.UniqueConstraint(fields=["module", "slug"], name="uniq_objective_slug_per_module"),
        ]

    def __str__(self):
        return self.title


class LearningResource(models.Model):
    """Curriculum text the tutor may cite. This is not learner-private content."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objective = models.ForeignKey(LearningObjective, on_delete=models.CASCADE, related_name="resources")
    title = models.CharField(max_length=300)
    body = models.TextField()
    source_label = models.CharField(max_length=300)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "learning_resources"
        ordering = ["order"]

    def __str__(self):
        return self.title


class PracticeQuestion(models.Model):
    ROLES = [
        ("diagnostic", "Diagnostic"),
        ("practice", "Practice"),
        ("mastery_check", "Mastery check"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objective = models.ForeignKey(LearningObjective, on_delete=models.CASCADE, related_name="questions")
    prompt = models.TextField()
    role = models.CharField(max_length=20, choices=ROLES, default="practice")
    acceptable_answers = models.JSONField(default=list)
    misconception_patterns = models.JSONField(default=list)
    hint = models.TextField(blank=True)
    remediation = models.TextField(blank=True)
    worked_example = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "practice_questions"
        ordering = ["order"]

    def __str__(self):
        return f"{self.role}: {self.prompt[:60]}"
