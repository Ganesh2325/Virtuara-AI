from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile
from apps.sessions.models import MasteryEvidence
from apps.subjects.models import LearningObjective, LearningResource, Module, PracticeQuestion, Subject

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
class VoiceRuntimeTests(APITestCase):
    def setUp(self):
        self.learner = User.objects.create_user(email="voice@example.com", password="pass-12345", full_name="Voice Learner")
        UserProfile.objects.create(user=self.learner, level="beginner")
        self.other = User.objects.create_user(email="voice-other@example.com", password="pass-12345", full_name="Other")
        subject = Subject.objects.create(name="Mathematics", slug="mathematics-voice", category="mathematics", is_active=True)
        module = Module.objects.create(subject=subject, title="Algebra Fundamentals", difficulty="beginner", order=1)
        objective = LearningObjective.objects.create(
            module=module, slug="solve-one-step-equations", title="Solve one-step linear equations", status="published", order=1,
        )
        LearningResource.objects.create(
            objective=objective, title="Inverse of addition", source_label="Algebra Fundamentals — inverse operations",
            body="To solve x + a = b, subtract a from both sides.", order=1,
        )
        PracticeQuestion.objects.create(
            objective=objective, role="diagnostic", order=1,
            prompt="Solve for x: x + 5 = 12. Reply with the value of x.",
            acceptable_answers=["7"],
            misconception_patterns=[{"key": "sign_error", "answers": ["17"], "rationale": "Added instead of subtracted."}],
            hint="Subtract 5 from 12.",
            remediation="Adding 5 again does not isolate x. Subtract 5 from 12 and use that inverse step on the next equation.",
        )
        PracticeQuestion.objects.create(
            objective=objective, role="practice", order=2,
            prompt="Solve for x: x + 6 = 15. Reply with the value of x.",
            acceptable_answers=["9"], remediation="Subtract 6 from 15.",
        )
        self.client.force_authenticate(self.learner)
        created = self.client.post(
            "/api/v1/sessions/",
            {"subject": str(subject.id), "objective": str(objective.id)},
            format="json",
        )
        self.session_id = created.data["id"]
        self.client.post(f"/api/v1/sessions/{self.session_id}/begin/", {}, format="json")

    def test_status_does_not_claim_a_live_stream(self):
        status = self.client.get("/api/v1/voice/status/")
        self.assertEqual(status.status_code, 200)
        self.assertFalse(status.data["realtime_webrtc"])
        self.assertFalse(status.data["live_avatar_stream"])
        self.assertEqual(status.data["speech_transport"], "browser_speech_api")
        self.assertFalse(status.data["text_provider_configured"])

    def test_spoken_learning_answer_uses_the_same_evidence_path(self):
        spoken = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "learning",
                "learning_session_id": self.session_id,
                "content": "17",
                "client_turn_id": "voice-wrong",
            },
            format="json",
        )
        self.assertEqual(spoken.status_code, 200, spoken.data)
        self.assertEqual(spoken.data["action"], "ADDRESS_MISCONCEPTION")
        self.assertEqual(spoken.data["input_modality"], "speech")
        self.assertFalse(spoken.data["realtime_webrtc"])
        self.assertNotIn("The answer is 7", spoken.data["spoken_text"])
        self.assertEqual(spoken.data["mastery"]["evidence_count"], 1)
        self.assertEqual(MasteryEvidence.objects.filter(user=self.learner).count(), 1)

        quiz = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "quiz",
                "learning_session_id": self.session_id,
                "content": "9",
                "client_turn_id": "voice-quiz",
            },
            format="json",
        )
        self.assertEqual(quiz.status_code, 200, quiz.data)
        self.assertEqual(quiz.data["context"], "quiz")
        self.assertEqual(quiz.data["evaluation"]["outcome"], "correct")
        self.assertEqual(MasteryEvidence.objects.filter(user=self.learner).count(), 2)

        self.client.force_authenticate(self.other)
        hidden = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "learning",
                "learning_session_id": self.session_id,
                "content": "7",
                "client_turn_id": "stolen",
            },
            format="json",
        )
        self.assertEqual(hidden.status_code, 409)
        self.assertEqual(MasteryEvidence.objects.filter(user=self.learner).count(), 2)

    def test_general_speech_does_not_invent_a_reply(self):
        before = MasteryEvidence.objects.count()
        general = self.client.post(
            "/api/v1/voice/turns/",
            {"context": "general", "content": "Explain gravity", "client_turn_id": "general-1"},
            format="json",
        )
        self.assertEqual(general.status_code, 503)
        self.assertIsNone(general.data["spoken_text"])
        self.assertEqual(general.data["heard"], "Explain gravity")
        self.assertEqual(MasteryEvidence.objects.count(), before)

    def test_spoken_interview_answer_stays_on_the_interview(self):
        upload = SimpleUploadedFile("resume.txt", RESUME.encode(), content_type="text/plain")
        created = self.client.post("/api/v1/interviews/resumes/", {"file": upload}, format="multipart")
        started = self.client.post(
            "/api/v1/interviews/sessions/",
            {"resume_id": created.data["id"], "duration_minutes": 10, "target_role": "Backend engineer"},
            format="json",
        )
        spoken = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "interview",
                "interview_session_id": started.data["id"],
                "content": "I used it.",
                "client_turn_id": "voice-interview-1",
            },
            format="json",
        )
        self.assertEqual(spoken.status_code, 200, spoken.data)
        self.assertEqual(spoken.data["context"], "interview")
        self.assertIn("briefly", spoken.data["spoken_text"].lower())
        self.assertFalse(spoken.data["completed"])
        again = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "interview",
                "interview_session_id": started.data["id"],
                "content": "I used it.",
                "client_turn_id": "voice-interview-1",
            },
            format="json",
        )
        self.assertTrue(again.data["duplicate"])
