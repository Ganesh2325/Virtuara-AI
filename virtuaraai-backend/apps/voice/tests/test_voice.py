import json
import os

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase
from unittest.mock import patch

from apps.accounts.models import UserProfile
from apps.sessions.providers import ProviderResponseError, ProviderResult, ProviderTimeout
from apps.sessions.models import MasteryEvidence
from apps.subjects.models import LearningObjective, LearningResource, Module, PracticeQuestion, Subject
from apps.voice.general import MAX_CONTEXT_TURNS
from apps.voice.models import GeneralConversation, GeneralTurn, ProviderUsage

User = get_user_model()


def structured_response(text: str, *, mode: str = "concise", follow_up=None, blocks=None) -> str:
    return json.dumps(
        {
            "response_mode": mode,
            "spoken_text": text,
            "display_blocks": blocks or [{"type": "paragraph", "text": text}],
            "follow_up": follow_up,
        }
    )


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
@patch.dict(
    os.environ,
    {
        "VIRTUARA_TEXT_PROVIDER": "",
        "VIRTUARA_TEXT_PROVIDER_API_KEY": "",
        "VIRTUARA_TEXT_PROVIDER_MODEL": "",
    },
)
class VoiceRuntimeTests(APITestCase):
    def setUp(self):
        self.learner = User.objects.create_user(email="voice@example.com", password="pass-12345", full_name="Voice Learner")
        UserProfile.objects.create(user=self.learner, level="beginner")
        self.other = User.objects.create_user(email="voice-other@example.com", password="pass-12345", full_name="Other")
        self.subject = Subject.objects.create(name="Mathematics", slug="mathematics-voice", category="mathematics", is_active=True)
        module = Module.objects.create(subject=self.subject, title="Algebra Fundamentals", difficulty="beginner", order=1)
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
            {"subject": str(self.subject.id), "objective": str(objective.id)},
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

        chemistry = Subject.objects.create(
            name="Chemistry",
            slug="chemistry-stale-voice",
            category="science",
            is_active=True,
        )
        stale = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "learning",
                "learning_session_id": self.session_id,
                "subject_id": str(chemistry.id),
                "subject_slug": chemistry.slug,
                "content": "7",
                "client_turn_id": "stale-subject",
            },
            format="json",
        )
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.data["error"], "stale_learning_context")
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
        self.assertEqual(GeneralTurn.objects.count(), 0)

    @patch("apps.voice.general.get_text_provider")
    def test_general_conversation_is_durable_bounded_and_idempotent(self, provider_factory):
        class Provider:
            configured = True
            name = "test-provider"
            model = "test-model"
            calls = []

            def generate_chat(self, messages, max_tokens=500):
                self.calls.append(messages)
                return ProviderResult(
                    text=structured_response("Gravity attracts masses."),
                    provider=self.name,
                    model=self.model,
                    prompt_tokens=10,
                    completion_tokens=4,
                    latency_ms=12,
                )

        provider = Provider()
        provider_factory.return_value = provider
        first = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "general",
                "subject_id": str(self.subject.id),
                "subject_slug": self.subject.slug,
                "content": "Explain gravity",
                "client_turn_id": "general-success-1",
            },
            format="json",
        )
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(first.data["spoken_text"], "Gravity attracts masses.")
        self.assertEqual(first.data["subject_context"]["slug"], self.subject.slug)
        self.assertEqual(first.data["response_mode"], "concise")
        self.assertIn("validated active subject is Mathematics", provider.calls[0][0]["content"])
        conversation_id = first.data["conversation_id"]

        duplicate = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "general",
                "subject_id": str(self.subject.id),
                "subject_slug": self.subject.slug,
                "conversation_id": conversation_id,
                "content": "Explain gravity",
                "client_turn_id": "general-success-1",
            },
            format="json",
        )
        self.assertTrue(duplicate.data["duplicate"])
        self.assertEqual(len(provider.calls), 1)
        self.assertEqual(GeneralTurn.objects.count(), 1)
        self.assertEqual(ProviderUsage.objects.filter(status="success").count(), 1)

        for index in range(MAX_CONTEXT_TURNS + 3):
            GeneralTurn.objects.create(
                conversation_id=conversation_id,
                client_turn_id=f"seed-{index}",
                user_text=f"user-{index}",
                assistant_text=f"assistant-{index}",
                provider="test",
                model="test",
            )
        follow_up = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "general",
                "subject_id": str(self.subject.id),
                "subject_slug": self.subject.slug,
                "conversation_id": conversation_id,
                "content": "What did I ask before?",
                "client_turn_id": "general-success-2",
            },
            format="json",
        )
        self.assertEqual(follow_up.status_code, 200)
        supplied = provider.calls[-1]
        self.assertLessEqual(
            len([item for item in supplied if item["role"] == "assistant"]),
            MAX_CONTEXT_TURNS,
        )
        self.assertEqual(supplied[-1]["content"], "What did I ask before?")

        chemistry = Subject.objects.create(
            name="Chemistry",
            slug="chemistry-voice",
            category="science",
            is_active=True,
        )
        changed = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "general",
                "subject_id": str(chemistry.id),
                "subject_slug": chemistry.slug,
                "conversation_id": conversation_id,
                "content": "Change topic",
                "client_turn_id": "general-changed",
            },
            format="json",
        )
        self.assertEqual(changed.status_code, 409)

        switched = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "general",
                "subject_id": str(chemistry.id),
                "subject_slug": chemistry.slug,
                "content": "Explain atoms simply",
                "client_turn_id": "general-chemistry",
            },
            format="json",
        )
        self.assertEqual(switched.status_code, 200)
        switched_prompt = provider.calls[-1][0]["content"]
        self.assertIn("validated active subject is Chemistry", switched_prompt)
        self.assertNotIn("validated active subject is Mathematics", switched_prompt)

    @patch("apps.voice.general.get_text_provider")
    def test_invalid_subject_is_rejected_before_provider_use(self, provider_factory):
        response = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "general",
                "subject_slug": "not-a-real-subject",
                "content": "Hello",
                "client_turn_id": "invalid-subject",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "invalid_subject")
        provider_factory.assert_not_called()
        self.assertEqual(GeneralConversation.objects.count(), 0)

    @patch("apps.voice.general.get_text_provider")
    def test_general_response_streams_and_is_persisted(self, provider_factory):
        class Provider:
            configured = True
            name = "stream-provider"
            model = "stream-model"

            def stream_chat(self, messages, max_tokens=500):
                payload = structured_response("First visible text.")
                yield payload[:20]
                yield payload[20:]
                return ProviderResult(
                    text=payload,
                    provider=self.name,
                    model=self.model,
                    latency_ms=9,
                )

        provider_factory.return_value = Provider()
        response = self.client.post(
            "/api/v1/voice/general-stream/",
            {
                "subject_id": str(self.subject.id),
                "subject_slug": self.subject.slug,
                "content": "Explain inertia",
                "client_turn_id": "stream-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        body = b"".join(response.streaming_content).decode()
        self.assertIn('"type":"done"', body)
        self.assertIn('"type":"paragraph"', body)
        turn = GeneralTurn.objects.get(client_turn_id="stream-1")
        self.assertEqual(turn.assistant_text, "First visible text.")
        self.assertEqual(ProviderUsage.objects.get(correlation_id="stream-1").latency_ms, 9)

    @patch("apps.voice.general.get_text_provider")
    def test_structured_stream_failure_retries_once_without_streaming(self, provider_factory):
        class Provider:
            configured = True
            name = "stream-provider"
            model = "stream-model"
            fallback_calls = 0

            def stream_chat(self, messages, max_tokens=500):
                raise ProviderResponseError(
                    self.name,
                    "The AI provider could not produce the required response format.",
                )
                yield  # pragma: no cover

            def generate_chat(self, messages, max_tokens=500):
                self.fallback_calls += 1
                return ProviderResult(
                    text=structured_response("Recovered concise answer."),
                    provider=self.name,
                    model=self.model,
                    prompt_tokens=9,
                    completion_tokens=5,
                )

        provider = Provider()
        provider_factory.return_value = provider
        response = self.client.post(
            "/api/v1/voice/general-stream/",
            {
                "subject_id": str(self.subject.id),
                "subject_slug": self.subject.slug,
                "content": "Explain inertia",
                "client_turn_id": "stream-retry-1",
            },
            format="json",
        )
        body = b"".join(response.streaming_content).decode()
        self.assertEqual(response.status_code, 200)
        self.assertIn("Recovered concise answer.", body)
        self.assertEqual(provider.fallback_calls, 1)
        self.assertTrue(GeneralTurn.objects.filter(client_turn_id="stream-retry-1").exists())

    @patch("apps.voice.general.get_text_provider")
    def test_failed_stream_keeps_published_conversation_available_for_retry(self, provider_factory):
        class Provider:
            configured = True
            name = "stream-provider"
            model = "stream-model"
            failing = True

            def stream_chat(self, messages, max_tokens=500):
                if self.failing:
                    raise ProviderResponseError(
                        self.name,
                        "The AI provider could not produce the required response format.",
                    )
                payload = structured_response("Recovered on the next turn.")
                yield payload
                return ProviderResult(
                    text=payload,
                    provider=self.name,
                    model=self.model,
                )

            def generate_chat(self, messages, max_tokens=500):
                raise ProviderResponseError(
                    self.name,
                    "The AI provider could not produce the required response format.",
                )

        provider = Provider()
        provider_factory.return_value = provider
        failed = self.client.post(
            "/api/v1/voice/general-stream/",
            {
                "subject_id": str(self.subject.id),
                "subject_slug": self.subject.slug,
                "content": "Explain inertia",
                "client_turn_id": "stream-failed-1",
            },
            format="json",
        )
        failed_body = b"".join(failed.streaming_content).decode()
        conversation = GeneralConversation.objects.get(user=self.learner)
        self.assertIn('"type":"error"', failed_body)
        self.assertEqual(conversation.turns.count(), 0)

        provider.failing = False
        retried = self.client.post(
            "/api/v1/voice/general-stream/",
            {
                "conversation_id": str(conversation.id),
                "subject_id": str(self.subject.id),
                "subject_slug": self.subject.slug,
                "content": "Explain inertia",
                "client_turn_id": "stream-retry-2",
            },
            format="json",
        )
        retried_body = b"".join(retried.streaming_content).decode()
        self.assertIn("Recovered on the next turn.", retried_body)
        self.assertEqual(conversation.turns.count(), 1)

    @patch("apps.voice.general.get_text_provider")
    def test_provider_timeout_does_not_create_a_turn(self, provider_factory):
        class Provider:
            configured = True
            name = "slow-provider"
            model = "slow-model"

            def generate_chat(self, messages, max_tokens=500):
                raise ProviderTimeout(self.name, "The AI provider timed out.")

        provider_factory.return_value = Provider()
        response = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "general",
                "content": "Hello",
                "client_turn_id": "timeout-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error"], "timeout")
        self.assertEqual(GeneralTurn.objects.count(), 0)
        self.assertEqual(ProviderUsage.objects.filter(status="timeout").count(), 1)

    @patch("apps.voice.general.get_text_provider")
    def test_conversation_history_is_owner_only(self, provider_factory):
        class Provider:
            configured = True
            name = "test"
            model = "test"

            def generate_chat(self, messages, max_tokens=500):
                return ProviderResult(
                    text=structured_response("Answer"),
                    provider="test",
                    model="test",
                )

        provider_factory.return_value = Provider()
        created = self.client.post(
            "/api/v1/voice/turns/",
            {"context": "general", "content": "Private", "client_turn_id": "private-1"},
            format="json",
        )
        conversation_id = created.data["conversation_id"]
        own = self.client.get(f"/api/v1/voice/conversations/{conversation_id}/")
        self.assertEqual(own.status_code, 200)
        self.assertEqual(own.data["turns"][0]["user_text"], "Private")

        self.client.force_authenticate(self.other)
        hidden = self.client.get(f"/api/v1/voice/conversations/{conversation_id}/")
        self.assertEqual(hidden.status_code, 404)

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
