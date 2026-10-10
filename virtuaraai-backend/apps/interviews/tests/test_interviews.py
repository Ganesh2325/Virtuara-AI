from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.interviews.models import InterviewSession, Resume
from apps.interviews.parsing import parse_profile

User = get_user_model()

RESUME = """Jane Doe
Skills
Python, Django, PostgreSQL
Projects
Built a tutoring API that stores learner evidence in PostgreSQL.
Experience
Backend engineer at Northwind, owned session APIs and review queues.
Education
BSc Computer Science
"""


@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
class InterviewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="interview@example.com", password="pass-12345", full_name="Interview User")
        self.other = User.objects.create_user(email="other-interview@example.com", password="pass-12345", full_name="Other")
        self.client.force_authenticate(self.user)

    def upload(self, name="resume.txt", content=RESUME):
        from django.core.files.uploadedfile import SimpleUploadedFile

        upload = SimpleUploadedFile(name, content.encode(), content_type="text/plain")
        return self.client.post("/api/v1/interviews/resumes/", {"file": upload}, format="multipart")

    def test_parser_does_not_invent_sections(self):
        profile, error = parse_profile(RESUME)
        self.assertEqual(error, "")
        self.assertIn("Python", profile["skills"])
        self.assertNotIn("Java", profile["skills"])
        empty, reason = parse_profile("too short")
        self.assertIsNone(empty)
        self.assertTrue(reason)

    def test_resume_required_and_duration_bounds(self):
        missing = self.client.post("/api/v1/interviews/sessions/", {"duration_minutes": 10}, format="json")
        self.assertEqual(missing.status_code, 400)
        self.assertEqual(missing.data["error"], "resume_required")

        created = self.upload()
        self.assertEqual(created.status_code, 200, created.data)
        self.assertEqual(created.data["status"], "ready")
        self.assertIn("Django", created.data["profile"]["skills"])
        resume_id = created.data["id"]

        too_short = self.client.post(
            "/api/v1/interviews/sessions/",
            {"resume_id": resume_id, "duration_minutes": 5, "target_role": "Backend engineer"},
            format="json",
        )
        self.assertEqual(too_short.status_code, 400)
        too_long = self.client.post(
            "/api/v1/interviews/sessions/",
            {"resume_id": resume_id, "duration_minutes": 45, "target_role": "Backend engineer"},
            format="json",
        )
        self.assertEqual(too_long.status_code, 400)

        for minutes in (10, 15, 20, 25, 30):
            started = self.client.post(
                "/api/v1/interviews/sessions/",
                {"resume_id": resume_id, "duration_minutes": minutes, "target_role": "Backend engineer", "interview_type": "technical"},
                format="json",
            )
            self.assertEqual(started.status_code, 201, started.data)
            self.assertIn("Python", started.data["response_text"])
            self.assertFalse(started.data["avatar"]["live_stream"])
            self.client.post(f"/api/v1/interviews/sessions/{started.data['id']}/abort/", {}, format="json")

    def test_rejects_invalid_file_and_hides_other_users(self):
        bad = self.upload("notes.md", "Skills\nPython\nExperience\nBuilt services for five years at a company.")
        self.assertEqual(bad.status_code, 400)

        thin = self.upload("empty.txt", "hello")
        self.assertEqual(thin.status_code, 200)
        self.assertEqual(thin.data["status"], "failed")
        blocked = self.client.post(
            "/api/v1/interviews/sessions/",
            {"resume_id": thin.data["id"], "duration_minutes": 10},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400)

        ready = self.upload()
        started = self.client.post(
            "/api/v1/interviews/sessions/",
            {"resume_id": ready.data["id"], "duration_minutes": 10, "target_role": "Backend engineer"},
            format="json",
        )
        session_id = started.data["id"]
        self.client.force_authenticate(self.other)
        hidden = self.client.get(f"/api/v1/interviews/sessions/{session_id}/report/")
        self.assertEqual(hidden.status_code, 404)

    def test_deadline_completes_and_abort_does_not(self):
        ready = self.upload()
        started = self.client.post(
            "/api/v1/interviews/sessions/",
            {"resume_id": ready.data["id"], "duration_minutes": 10, "interview_type": "project"},
            format="json",
        )
        session = InterviewSession.objects.get(pk=started.data["id"])
        session.deadline_at = timezone.now() - timedelta(seconds=1)
        session.started_at = session.deadline_at - timedelta(minutes=10)
        session.save(update_fields=["deadline_at", "started_at"])

        answer = (
            "I built the tutoring API myself, stored evidence in PostgreSQL, and checked retries by replaying failed jobs."
        )
        first = self.client.post(
            f"/api/v1/interviews/sessions/{session.id}/answers/",
            {"content": answer, "client_turn_id": "ans-1"},
            format="json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.data["completed"])
        self.assertEqual(first.data["status"], "completed")
        again = self.client.post(
            f"/api/v1/interviews/sessions/{session.id}/answers/",
            {"content": answer, "client_turn_id": "ans-1"},
            format="json",
        )
        self.assertTrue(again.data["duplicate"])
        self.assertEqual(session.turns.count(), 1)
        report = self.client.get(f"/api/v1/interviews/sessions/{session.id}/report/")
        self.assertEqual(report.status_code, 200)
        self.assertTrue(report.data["completed"])
        self.assertIn("not a hiring decision", report.data["disclaimer"])
        self.assertGreaterEqual(report.data["actual_minutes"], 10)

        second = self.client.post(
            "/api/v1/interviews/sessions/",
            {"resume_id": ready.data["id"], "duration_minutes": 15, "target_role": "Backend engineer"},
            format="json",
        )
        aborted = self.client.post(f"/api/v1/interviews/sessions/{second.data['id']}/abort/", {}, format="json")
        self.assertEqual(aborted.data["status"], "aborted")
        aborted_report = self.client.get(f"/api/v1/interviews/sessions/{second.data['id']}/report/")
        self.assertFalse(aborted_report.data["completed"])
        self.assertIn("not a finished interview", aborted_report.data["summary"])

    def test_short_answer_follow_up_stays_on_resume_topic(self):
        ready = self.upload()
        started = self.client.post(
            "/api/v1/interviews/sessions/",
            {"resume_id": ready.data["id"], "duration_minutes": 20, "target_role": "Backend engineer"},
            format="json",
        )
        self.assertIn("Python", started.data["response_text"])
        follow = self.client.post(
            f"/api/v1/interviews/sessions/{started.data['id']}/answers/",
            {"content": "I used it.", "client_turn_id": "short-1"},
            format="json",
        )
        self.assertFalse(follow.data["completed"])
        self.assertIn("briefly", follow.data["response_text"].lower())
        self.assertEqual(Resume.objects.get(pk=ready.data["id"]).status, "ready")
