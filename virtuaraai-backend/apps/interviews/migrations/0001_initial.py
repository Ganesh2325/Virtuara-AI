import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Resume",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("file", models.FileField(upload_to="resumes/%Y/%m/")),
                ("original_name", models.CharField(max_length=255)),
                ("status", models.CharField(choices=[("processing", "Processing"), ("ready", "Ready"), ("failed", "Failed")], default="processing", max_length=20)),
                ("extracted_text", models.TextField(blank=True)),
                ("profile", models.JSONField(blank=True, default=dict)),
                ("error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="resumes", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "resumes", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="InterviewSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("target_role", models.CharField(blank=True, max_length=200)),
                ("interview_type", models.CharField(choices=[("technical", "Technical"), ("behavioral", "Behavioral"), ("project", "Project deep dive"), ("mixed", "Mixed")], default="mixed", max_length=20)),
                ("duration_minutes", models.PositiveSmallIntegerField()),
                ("status", models.CharField(choices=[("ready", "Ready"), ("running", "Running"), ("completed", "Completed"), ("aborted", "Aborted"), ("failed", "Failed")], default="running", max_length=20)),
                ("started_at", models.DateTimeField()),
                ("deadline_at", models.DateTimeField()),
                ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("current_prompt", models.TextField(blank=True)),
                ("asked_topics", models.JSONField(default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("resume", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="interviews", to="interviews.resume")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="interview_sessions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "interview_sessions", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="interviewsession",
            index=models.Index(fields=["user", "status"], name="interview_user_status"),
        ),
        migrations.CreateModel(
            name="InterviewTurn",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("client_turn_id", models.CharField(max_length=80)),
                ("sequence", models.PositiveIntegerField()),
                ("question", models.TextField()),
                ("answer", models.TextField(blank=True)),
                ("evaluation", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="turns", to="interviews.interviewsession")),
            ],
            options={"db_table": "interview_turns", "ordering": ["sequence"]},
        ),
        migrations.AddConstraint(
            model_name="interviewturn",
            constraint=models.UniqueConstraint(fields=("session", "client_turn_id"), name="uniq_interview_client_turn"),
        ),
        migrations.CreateModel(
            name="InterviewReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("actual_minutes", models.FloatField()),
                ("completed", models.BooleanField(default=False)),
                ("strengths", models.JSONField(default=list)),
                ("improvements", models.JSONField(default=list)),
                ("questions", models.JSONField(default=list)),
                ("summary", models.TextField()),
                ("disclaimer", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("session", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="report", to="interviews.interviewsession")),
            ],
            options={"db_table": "interview_reports"},
        ),
    ]
