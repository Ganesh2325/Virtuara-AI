import os
from unittest.mock import patch

from django.test import SimpleTestCase

from apps.sessions.providers import (
    OpenAICompatibleTextProvider,
    ProviderRateLimited,
    ProviderResponseError,
    ProviderTimeout,
    UnconfiguredTextProvider,
    get_text_provider,
)


class ProviderAdapterTests(SimpleTestCase):
    def test_provider_selection_is_explicit(self):
        with patch.dict(
            os.environ,
            {
                "VIRTUARA_TEXT_PROVIDER": "groq",
                "VIRTUARA_TEXT_PROVIDER_API_KEY": "server-secret",
            },
            clear=False,
        ):
            provider = get_text_provider()
        self.assertIsInstance(provider, OpenAICompatibleTextProvider)
        self.assertEqual(provider.name, "groq")
        self.assertEqual(provider.model, "llama-3.3-70b-versatile")

    def test_missing_or_unknown_provider_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            provider = get_text_provider()
            self.assertIsInstance(provider, UnconfiguredTextProvider)
            self.assertIn("VIRTUARA_TEXT_PROVIDER", provider.reason)
        with patch.dict(
            os.environ,
            {
                "VIRTUARA_TEXT_PROVIDER": "unsupported",
                "VIRTUARA_TEXT_PROVIDER_API_KEY": "secret",
            },
            clear=True,
        ):
            provider = get_text_provider()
            self.assertFalse(provider.configured)
            self.assertIn("not supported", provider.reason)

    def test_invalid_provider_configuration_fails_closed(self):
        with patch.dict(
            os.environ,
            {
                "VIRTUARA_TEXT_PROVIDER": "openai-compatible",
                "VIRTUARA_TEXT_PROVIDER_API_KEY": "server-secret",
                "VIRTUARA_TEXT_PROVIDER_BASE_URL": "http://insecure.example.test/v1",
                "VIRTUARA_TEXT_PROVIDER_MODEL": "test-model",
            },
            clear=True,
        ):
            provider = get_text_provider()
        self.assertFalse(provider.configured)
        self.assertIn("HTTPS", provider.reason)

    @patch("apps.sessions.providers._request_json")
    def test_openai_compatible_response_is_validated(self, request_json):
        request_json.return_value = {
            "choices": [{"message": {"content": "A grounded answer."}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 14, "completion_tokens": 5},
        }
        provider = OpenAICompatibleTextProvider(
            name="openai",
            api_key="secret",
            base_url="https://api.openai.com/v1",
            model="gpt-test",
            timeout_seconds=3,
        )
        result = provider.generate_chat([{"role": "user", "content": "Question"}])
        self.assertEqual(result.text, "A grounded answer.")
        self.assertEqual(result.prompt_tokens, 14)
        self.assertEqual(result.completion_tokens, 5)
        self.assertEqual(request_json.call_args.kwargs["timeout_seconds"], 3)

        request_json.return_value = {"choices": []}
        with self.assertRaises(ProviderResponseError):
            provider.generate_chat([{"role": "user", "content": "Question"}])

    @patch("apps.sessions.providers._stream_request_json")
    def test_openai_compatible_stream_returns_real_deltas(self, stream_request):
        stream_request.return_value = iter(
            [
                {"choices": [{"delta": {"content": "Streamed "}, "finish_reason": None}]},
                {"choices": [{"delta": {"content": "answer."}, "finish_reason": "stop"}]},
                {
                    "choices": [],
                    "usage": {"prompt_tokens": 8, "completion_tokens": 3},
                },
            ]
        )
        provider = OpenAICompatibleTextProvider(
            name="openai",
            api_key="secret",
            base_url="https://api.openai.com/v1",
            model="gpt-test",
            timeout_seconds=3,
        )
        stream = provider.stream_chat([{"role": "user", "content": "Question"}])
        parts = []
        while True:
            try:
                parts.append(next(stream))
            except StopIteration as stopped:
                result = stopped.value
                break
        self.assertEqual(parts, ["Streamed ", "answer."])
        self.assertEqual(result.text, "Streamed answer.")
        self.assertEqual(result.prompt_tokens, 8)
        self.assertEqual(result.completion_tokens, 3)
        self.assertTrue(stream_request.call_args.kwargs["payload"]["stream"])
        self.assertTrue(
            stream_request.call_args.kwargs["payload"]["stream_options"]["include_usage"]
        )

    @patch("apps.sessions.providers._request_json")
    def test_timeout_and_rate_limit_are_consistent(self, request_json):
        provider = OpenAICompatibleTextProvider(
            name="groq",
            api_key="secret",
            base_url="https://api.groq.com/openai/v1",
            model="model",
            timeout_seconds=2,
        )
        request_json.side_effect = ProviderTimeout("groq", "timed out")
        with self.assertRaises(ProviderTimeout):
            provider.generate_chat([{"role": "user", "content": "Question"}])
        request_json.side_effect = ProviderRateLimited("groq", "limited")
        with self.assertRaises(ProviderRateLimited):
            provider.generate_chat([{"role": "user", "content": "Question"}])
