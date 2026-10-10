import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("subjects", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="LearningObjective",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("slug", models.SlugField(max_length=120)),
                ("title", models.CharField(max_length=300)),
                ("description", models.TextField(blank=True)),
                ("difficulty", models.CharField(choices=[("beginner", "Beginner"), ("intermediate", "Intermediate"), ("advanced", "Advanced")], default="beginner", max_length=20)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("published", "Published"), ("archived", "Archived")], default="draft", max_length=20)),
                ("order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("module", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="objectives", to="subjects.module")),
                ("prerequisites", models.ManyToManyField(blank=True, related_name="dependents", to="subjects.learningobjective")),
            ],
            options={
                "db_table": "learning_objectives",
                "ordering": ["order", "title"],
            },
        ),
        migrations.AddConstraint(
            model_name="learningobjective",
            constraint=models.UniqueConstraint(fields=("module", "slug"), name="uniq_objective_slug_per_module"),
        ),
        migrations.CreateModel(
            name="LearningResource",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=300)),
                ("body", models.TextField()),
                ("source_label", models.CharField(max_length=300)),
                ("order", models.PositiveIntegerField(default=0)),
                ("objective", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="resources", to="subjects.learningobjective")),
            ],
            options={"db_table": "learning_resources", "ordering": ["order"]},
        ),
        migrations.CreateModel(
            name="PracticeQuestion",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("prompt", models.TextField()),
                ("role", models.CharField(choices=[("diagnostic", "Diagnostic"), ("practice", "Practice"), ("mastery_check", "Mastery check")], default="practice", max_length=20)),
                ("acceptable_answers", models.JSONField(default=list)),
                ("misconception_patterns", models.JSONField(default=list)),
                ("hint", models.TextField(blank=True)),
                ("remediation", models.TextField(blank=True)),
                ("worked_example", models.TextField(blank=True)),
                ("order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("objective", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="questions", to="subjects.learningobjective")),
            ],
            options={"db_table": "practice_questions", "ordering": ["order"]},
        ),
    ]
