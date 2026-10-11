import socket
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile
from apps.knowledge.models import KnowledgeChunk, KnowledgeSource
from apps.knowledge.research import validate_public_url
from apps.knowledge.retrieve import retrieve_chunks
from apps.subjects.models import Subject
from apps.voice.models import GeneralConversation, GeneralTurn
from apps.voice.responses import attach_requested_diagram

User = get_user_model()


class KnowledgeAccessTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@example.com", password="pass-12345", full_name="Owner")
        self.other = User.objects.create_user(email="other@example.com", password="pass-12345", full_name="Other")
        UserProfile.objects.create(user=self.owner)
        self.subject = Subject.objects.create(name="Physics", slug="physics-knowledge", category="science")
        self.client.force_authenticate(self.owner)

    def test_custom_subject_is_private_and_platform_subjects_remain(self):
        created = self.client.post("/api/v1/subjects/custom/", {"name": "Indian History", "description": "Mughal to modern India"}, format="json")
        self.assertEqual(created.status_code, 201)
        self.client.force_authenticate(self.other)
        hidden = self.client.get("/api/v1/subjects/indian-history/")
        self.assertEqual(hidden.status_code, 404)
        self.client.force_authenticate(self.owner)
        visible = self.client.get("/api/v1/subjects/indian-history/")
        self.assertEqual(visible.status_code, 200)
        platform = self.client.get("/api/v1/subjects/physics-knowledge/")
        self.assertEqual(platform.status_code, 200)

    def test_platform_subject_cannot_be_deleted(self):
        response = self.client.delete(f"/api/v1/subjects/custom/{self.subject.id}/")
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Subject.objects.filter(pk=self.subject.id).exists())

    def test_chat_upload_is_retrieved_only_for_its_owner(self):
        conversation = GeneralConversation.objects.create(user=self.owner, subject_ref=self.subject, subject=self.subject.slug)
        upload = SimpleUploadedFile("notes.txt", b"Supply increases when producers make more goods at a higher price.", content_type="text/plain")
        response = self.client.post(
            "/api/v1/knowledge/sources/",
            {"file": upload, "conversation_id": str(conversation.id), "save_to_subject": "false"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "indexed")
        hits = retrieve_chunks(user=self.owner, query="What happens when supply increases?", conversation=conversation)
        self.assertEqual(len(hits), 1)
        self.assertEqual(retrieve_chunks(user=self.other, query="supply increases", conversation=conversation), [])

    def test_duplicate_text_is_not_indexed_twice(self):
        body = "Elasticity measures how quantity responds to price."
        first = self.client.post(
            "/api/v1/knowledge/sources/",
            {"text": body, "title": "Elasticity", "save_to_subject": "true", "subject_id": str(self.subject.id)},
            format="multipart",
        )
        second = self.client.post(
            "/api/v1/knowledge/sources/",
            {"text": body, "title": "Elasticity again", "save_to_subject": "true", "subject_id": str(self.subject.id)},
            format="multipart",
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(KnowledgeSource.objects.filter(owner=self.owner).count(), 1)
        self.assertGreater(KnowledgeChunk.objects.count(), 0)

    def test_first_question_comes_from_stored_history(self):
        conversation = GeneralConversation.objects.create(user=self.owner, subject_ref=self.subject, subject=self.subject.slug)
        GeneralTurn.objects.create(
            conversation=conversation,
            client_turn_id="earliest",
            user_text="What is opportunity cost?",
            assistant_text="Opportunity cost is the next best alternative you give up.",
            provider="test",
            model="test",
        )
        response = self.client.post(
            "/api/v1/voice/turns/",
            {
                "context": "general",
                "conversation_id": str(conversation.id),
                "subject_id": str(self.subject.id),
                "subject_slug": self.subject.slug,
                "content": "What was my first question at the beginning?",
                "client_turn_id": "recall-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("What is opportunity cost?", response.data["response_text"])
        self.assertEqual(response.data["provider"]["name"], "conversation-memory")

    def test_onboarding_keeps_custom_subjects_private_and_stores_profile(self):
        platform = Subject.objects.create(name="Mathematics", slug="mathematics-onboarding", category="mathematics")
        response = self.client.post(
            "/api/v1/auth/onboarding/",
            {
                "full_name": "Sai",
                "age_group": "under-18",
                "learning_goal": "I want to learn by building small programs.",
                "level": "advanced",
                "subject_ids": [str(platform.id)],
                "custom_subjects": ["Python"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["full_name"], "Sai")
        self.assertEqual(response.data["level"], "advanced")
        self.assertEqual(sorted(subject["name"] for subject in response.data["subjects"]), ["Mathematics", "Python"])
        self.client.force_authenticate(self.other)
        python = next(subject for subject in response.data["subjects"] if subject["name"] == "Python")
        self.assertEqual(self.client.get(f"/api/v1/subjects/{python['slug']}/").status_code, 404)
        self.client.force_authenticate(self.owner)
        profile = self.client.get("/api/v1/auth/profile/")
        self.assertEqual(profile.data["age_group"], "under-18")
        self.assertIn("small programs", profile.data["learning_goal"])

    def test_private_url_is_rejected(self):
        with patch("apps.knowledge.research.socket.getaddrinfo", return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 80))]):
            with self.assertRaises(ValueError):
                validate_public_url("http://example.test/secret")
        response = self.client.post("/api/v1/knowledge/research/", {"url": "http://169.254.169.254/latest"}, format="json")
        self.assertEqual(response.status_code, 400)


class DiagramContractTests(SimpleTestCase):
    def test_explicit_diagram_request_adds_structured_nodes(self):
        contract = attach_requested_diagram(
            "Can you draw a diagram of this?",
            {"display_blocks": [{"type": "paragraph", "text": "Demand falls. Price then decreases."}], "spoken_text": "Demand falls."},
        )
        diagram = contract["display_blocks"][-1]
        self.assertEqual(diagram["type"], "diagram")
        self.assertGreaterEqual(len(diagram["nodes"]), 2)
        self.assertNotIn("<", diagram["alt"])
