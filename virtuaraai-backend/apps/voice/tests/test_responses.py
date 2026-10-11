import json

from django.test import SimpleTestCase

from apps.sessions.providers import ProviderResponseError
from apps.voice.responses import (
    clean_plain_text,
    parse_structured_response,
    select_response_policy,
)


class ConversationalResponsePolicyTests(SimpleTestCase):
    def test_default_is_concise_but_explicit_detail_expands_budget(self):
        concise = select_response_policy("What is probability?")
        detailed = select_response_policy("Give me detailed notes about probability")
        steps = select_response_policy("Show this step by step")
        code = select_response_policy("Show code for a binary search")

        self.assertEqual(concise.mode, "concise")
        self.assertEqual(detailed.mode, "detailed")
        self.assertGreater(detailed.max_tokens, concise.max_tokens)
        self.assertEqual(steps.mode, "steps")
        self.assertEqual(code.mode, "code")
        self.assertEqual(
            select_response_policy("Can you explain object-oriented programming?").mode,
            "concise",
        )
        self.assertEqual(select_response_policy("Can this work offline?").mode, "yes_no")

    def test_structured_response_is_validated_and_spoken_text_is_plain(self):
        policy = select_response_policy("Explain OOP")
        payload = json.dumps(
            {
                "spoken_text": "**OOP** uses objects.<br>Think of a car blueprint.",
                "display_blocks": [
                    {"type": "paragraph", "text": "**OOP** uses objects."},
                    {"type": "list", "items": ["Encapsulation", "Inheritance"]},
                    {
                        "type": "code",
                        "language": "python",
                        "code": "class Car:\n    pass",
                    },
                    {
                        "type": "table",
                        "columns": ["Idea", "Meaning"],
                        "rows": [["Class", "Blueprint"]],
                    },
                ],
                "follow_up": "Would you like a small Python example?",
                "sources": [{"title": "Invented source"}],
            }
        )
        response = parse_structured_response(
            payload,
            policy=policy,
            subject_context={"slug": "computer-science", "name": "Computer Science"},
        )

        self.assertEqual(response["spoken_text"], "OOP uses objects.\nThink of a car blueprint.")
        self.assertNotIn("**", response["display_blocks"][0]["text"])
        self.assertEqual(response["display_blocks"][2]["code"], "class Car:\n    pass")
        self.assertEqual(response["display_blocks"][3]["rows"], [["Class", "Blueprint"]])
        self.assertEqual(response["sources"], [])
        self.assertEqual(response["subject_context"]["slug"], "computer-science")

    def test_plain_speech_removes_rendering_syntax_without_removing_math(self):
        spoken = clean_plain_text(
            "## Result\n**Probability** is \\(P(A) = 1/6\\).<br>| Item | Value |\n|---|---|\n| Die | 6 |"
        )
        self.assertNotIn("**", spoken)
        self.assertNotIn("<br>", spoken)
        self.assertNotIn("|", spoken)
        self.assertNotIn(r"\(", spoken)
        self.assertIn("P(A) = 1/6", spoken)

    def test_invalid_or_empty_structured_output_is_rejected(self):
        policy = select_response_policy("Hello")
        with self.assertRaises(ProviderResponseError):
            parse_structured_response("not json", policy=policy, subject_context=None)
        with self.assertRaises(ProviderResponseError):
            parse_structured_response(
                '{"spoken_text":"hello","display_blocks":[]}',
                policy=policy,
                subject_context=None,
            )

    def test_safe_text_content_alias_is_normalized_to_paragraph(self):
        policy = select_response_policy("Explain probability")
        response = parse_structured_response(
            json.dumps(
                {
                    "spoken_text": "Probability measures how likely something is.",
                    "display_blocks": [
                        {
                            "type": "text",
                            "content": "A fair die gives each number a one-in-six chance.",
                        }
                    ],
                    "follow_up": None,
                }
            ),
            policy=policy,
            subject_context=None,
        )
        self.assertEqual(
            response["display_blocks"],
            [
                {
                    "type": "paragraph",
                    "text": "A fair die gives each number a one-in-six chance.",
                }
            ],
        )
