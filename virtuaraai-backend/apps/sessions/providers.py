"""Text-provider boundary.

Curriculum teaching does not call a model. Optional enrichment does.
If no provider is configured, enrichment fails in a recoverable way and
must not be reported as a generated tutor reply.
"""

from __future__ import annotations

import os


class ProviderUnavailable(Exception):
    def __init__(self, provider: str, reason: str):
        self.provider = provider
        self.reason = reason
        super().__init__(reason)


class TextProvider:
    name = "unconfigured"

    def generate(self, prompt: str) -> str:
        raise ProviderUnavailable(self.name, "No text-generation provider is configured.")


class UnconfiguredTextProvider(TextProvider):
    name = "unconfigured"


def get_text_provider() -> TextProvider:
    """Return a provider only when an explicit backend key is set.

    The frontend Groq/Gemini keys are not reused here. A missing key is a
    failed integration, not permission to invent a model response.
    """
    key = os.environ.get("VIRTUARA_TEXT_PROVIDER_API_KEY", "").strip()
    provider_name = os.environ.get("VIRTUARA_TEXT_PROVIDER", "").strip()
    if not key or not provider_name:
        return UnconfiguredTextProvider()
    # A named provider still has no adapter in this build. Fail closed.
    provider = UnconfiguredTextProvider()
    provider.name = provider_name
    return provider


def enrich_text(prompt: str) -> str:
    provider = get_text_provider()
    if isinstance(provider, UnconfiguredTextProvider) or not os.environ.get("VIRTUARA_TEXT_PROVIDER_API_KEY", "").strip():
        raise ProviderUnavailable(
            provider.name,
            "No text-generation provider is configured. The curriculum result is unchanged.",
        )
    return provider.generate(prompt)
