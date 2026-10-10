import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("learning_sessions", "0001_initial"),
        ("subjects", "0002_curriculum"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="learningsession",
            name="hint_given",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="learningsession",
            name="objective",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="learning_sessions", to="subjects.learningobjective"),
        ),
        migrations.AddField(
            model_name="learningsession",
            name="pending_question",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="pending_in_sessions", to="subjects.practicequestion"),
        ),
        migrations.CreateModel(
            name="LearnerObjectiveState",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("unseen", "Unseen"), ("practising", "Practising"), ("demonstrated", "Demonstrated"), ("retained", "Retained")], default="unseen", max_length=20)),
                ("mastery_estimate", models.FloatField(default=0.0)),
                ("confidence", models.FloatField(default=0.0)),
                ("evidence_count", models.PositiveIntegerField(default=0)),
                ("correct_count", models.PositiveIntegerField(default=0)),
                ("incorrect_streak", models.PositiveIntegerField(default=0)),
                ("last_misconception", models.CharField(blank=True, max_length=80)),
                ("declared_level", models.CharField(blank=True, max_length=40)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("objective", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="learner_states", to="subjects.learningobjective")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="objective_states", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "learner_objective_states"},
        ),
        migrations.AddConstraint(
            model_name="learnerobjectivestate",
            constraint=models.UniqueConstraint(fields=("user", "objective"), name="uniq_learner_objective_state"),
        ),
        migrations.CreateModel(
            name="MasteryEvidence",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("outcome", models.CharField(choices=[("correct", "Correct"), ("incorrect", "Incorrect")], max_length=20)),
                ("response_text", models.TextField()),
                ("misconception", models.CharField(blank=True, max_length=80)),
                ("action", models.CharField(max_length=40)),
                ("rationale", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("objective", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="evidence", to="subjects.learningobjective")),
                ("question", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="evidence", to="subjects.practicequestion")),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="evidence", to="learning_sessions.learningsession")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="mastery_evidence", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "mastery_evidence", "ordering": ["created_at"]},
        ),
        migrations.AddIndex(
            model_name="masteryevidence",
            index=models.Index(fields=["user", "objective", "created_at"], name="mastery_evidence_lookup"),
        ),
        migrations.CreateModel(
            name="SessionTurn",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("client_turn_id", models.CharField(max_length=80)),
                ("sequence", models.PositiveIntegerField()),
                ("learner_message", models.TextField(blank=True)),
                ("action", models.CharField(max_length=40)),
                ("response_payload", models.JSONField(default=dict)),
                ("http_status", models.PositiveSmallIntegerField(default=200)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="turns", to="learning_sessions.learningsession")),
            ],
            options={"db_table": "session_turns", "ordering": ["sequence"]},
        ),
        migrations.AddConstraint(
            model_name="sessionturn",
            constraint=models.UniqueConstraint(fields=("session", "client_turn_id"), name="uniq_session_client_turn"),
        ),
    ]
