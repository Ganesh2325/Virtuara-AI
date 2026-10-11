import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile
from apps.sessions.models import LearnerObjectiveState, MasteryEvidence
from apps.subjects.models import LearningObjective, LearningResource, Module, PracticeQuestion, Subject

User = get_user_model()


class LearningLoopTests(APITestCase):
    def setUp(self):
        self.learner = User.objects.create_user(email="learner@example.com", password="pass-12345", full_name="Learner")
        UserProfile.objects.create(user=self.learner, level="beginner")
        self.other = User.objects.create_user(email="other@example.com", password="pass-12345", full_name="Other")
        subject = Subject.objects.create(name="Mathematics", slug="mathematics", category="mathematics", is_active=True)
        module = Module.objects.create(subject=subject, title="Algebra Fundamentals", difficulty="beginner", order=1)
        self.objective = LearningObjective.objects.create(
            module=module,
            slug="solve-one-step-equations",
            title="Solve one-step linear equations",
            status="published",
            order=1,
        )
        LearningResource.objects.create(
            objective=self.objective,
            title="Inverse of addition",
            source_label="Algebra Fundamentals — inverse operations",
            body="To solve x + a = b, subtract a from both sides.",
            order=1,
        )
        PracticeQuestion.objects.create(
            objective=self.objective,
            role="diagnostic",
            order=1,
            prompt="Solve for x: x + 5 = 12. Reply with the value of x.",
            acceptable_answers=["7"],
            misconception_patterns=[{"key": "sign_error", "answers": ["17"], "rationale": "Added instead of subtracted."}],
            hint="Subtract 5 from 12.",
            remediation="Adding 5 again does not isolate x. Subtract 5 from 12 and use that inverse step on the next equation.",
        )
        PracticeQuestion.objects.create(
            objective=self.objective,
            role="practice",
            order=2,
            prompt="Solve for x: x + 6 = 15. Reply with the value of x.",
            acceptable_answers=["9"],
            misconception_patterns=[{"key": "copied_previous", "answers": ["7"], "rationale": "Copied the previous result."}],
            remediation="This is a new equation. Subtract 6 from 15.",
        )
        PracticeQuestion.objects.create(
            objective=self.objective,
            role="mastery_check",
            order=3,
            prompt="Solve for x: x + 4 = 11. Reply with the value of x.",
            acceptable_answers=["7"],
            remediation="Subtract 4 from 11.",
        )
        self.client.force_authenticate(self.learner)

    def test_learning_loop_persists_and_resumes(self):
        catalogue = self.client.get("/api/v1/subjects/mathematics/objectives/")
        self.assertEqual(catalogue.status_code, 200)
        self.assertEqual(catalogue.data[0]["slug"], "solve-one-step-equations")
        self.assertEqual(catalogue.data[0]["resources"][0]["source_label"], "Algebra Fundamentals — inverse operations")
        self.assertNotIn("acceptable_answers", str(catalogue.data))

        created = self.client.post("/api/v1/sessions/", {"subject": str(self.objective.module.subject_id), "objective": str(self.objective.id)}, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        session_id = created.data["id"]

        started = self.client.post(f"/api/v1/sessions/{session_id}/begin/", {}, format="json")
        self.assertEqual(started.status_code, 200)
        self.assertEqual(started.data["action"], "DIAGNOSE")
        self.assertIn("beginner", started.data["response_text"])
        self.assertIn("x + 5 = 12", started.data["response_text"])
        self.assertEqual(started.data["sources"][0]["source_label"], "Algebra Fundamentals — inverse operations")
        self.assertEqual(started.data["mastery"]["status"], "unseen")
        self.assertEqual(started.data["mastery"]["evidence_count"], 0)
        self.assertEqual(started.data["provider"]["name"], "curriculum")
        self.assertIsNone(started.data["model_response"])

        wrong = self.client.post(
            f"/api/v1/sessions/{session_id}/turns/",
            {"content": "17", "client_turn_id": "turn-wrong"},
            format="json",
        )
        self.assertEqual(wrong.status_code, 200)
        self.assertEqual(wrong.data["action"], "ADDRESS_MISCONCEPTION")
        self.assertEqual(wrong.data["evaluation"]["outcome"], "incorrect")
        self.assertNotIn("The answer is 7", wrong.data["response_text"])
        self.assertIn("Subtract", wrong.data["response_text"])
        self.assertIn("x + 6 = 15", wrong.data["response_text"])
        self.assertEqual(wrong.data["mastery"]["evidence_count"], 1)

        again = self.client.post(
            f"/api/v1/sessions/{session_id}/turns/",
            {"content": "17", "client_turn_id": "turn-wrong"},
            format="json",
        )
        self.assertTrue(again.data["duplicate"])
        self.assertEqual(MasteryEvidence.objects.filter(session_id=session_id).count(), 1)

        follow = self.client.post(
            f"/api/v1/sessions/{session_id}/turns/",
            {"content": "9", "client_turn_id": "turn-follow"},
            format="json",
        )
        self.assertEqual(follow.status_code, 200)
        self.assertEqual(follow.data["evaluation"]["outcome"], "correct")
        self.assertEqual(follow.data["mastery"]["status"], "demonstrated")
        self.assertEqual(follow.data["mastery"]["evidence_count"], 2)
        self.assertEqual(MasteryEvidence.objects.filter(session_id=session_id).count(), 2)
        self.assertNotEqual(
            MasteryEvidence.objects.filter(session_id=session_id).order_by("created_at").first().outcome,
            MasteryEvidence.objects.filter(session_id=session_id).order_by("created_at").last().outcome,
        )

        closed = self.client.post(f"/api/v1/sessions/{session_id}/complete/", {}, format="json")
        self.assertEqual(closed.status_code, 200)
        state = LearnerObjectiveState.objects.get(user=self.learner, objective=self.objective)
        self.assertEqual(state.evidence_count, 2)
        self.assertEqual(state.status, "demonstrated")

        resumed = self.client.post(f"/api/v1/sessions/{session_id}/resume/", {}, format="json")
        self.assertEqual(resumed.status_code, 200)
        self.assertIn("x + 4 = 11", resumed.data["response_text"])
        self.assertEqual(LearnerObjectiveState.objects.get(pk=state.pk).evidence_count, 2)

        with patch.dict(
            os.environ,
            {
                "VIRTUARA_TEXT_PROVIDER": "",
                "VIRTUARA_TEXT_PROVIDER_API_KEY": "",
            },
        ):
            blocked = self.client.post(
                f"/api/v1/sessions/{session_id}/enrich/",
                {"client_turn_id": "turn-follow"},
                format="json",
            )
        self.assertEqual(blocked.status_code, 503)
        self.assertEqual(blocked.data["error"], "ai_provider_unavailable")
        self.assertIsNone(blocked.data["model_response"])
        self.assertIn("curriculum", blocked.data["curriculum_recovery"]["provider"]["name"])
        self.assertEqual(blocked.data["evidence_count"], 2)

        self.client.force_authenticate(self.other)
        hidden = self.client.post(
            f"/api/v1/sessions/{session_id}/turns/",
            {"content": "9", "client_turn_id": "intruder"},
            format="json",
        )
        self.assertEqual(hidden.status_code, 404)
        self.assertEqual(MasteryEvidence.objects.filter(user=self.learner).count(), 2)
