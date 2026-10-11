"""Server-only text provider adapters.

Deterministic curriculum teaching does not depend on these adapters.
General conversation and optional enrichment use an explicitly configured
OpenAI-compatible backend and fail closed when it is unavailable.
"""

from __future__ import annotations

import json
import os
import socket
import time
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


class ProviderUnavailable(Exception):
    def __init__(self, provider: str, reason: str):
        self.provider = provider
        self.reason = reason
        super().__init__(reason)


class ProviderTimeout(ProviderUnavailable):
    pass


class ProviderRateLimited(ProviderUnavailable):
    pass


class ProviderResponseError(ProviderUnavailable):
    pass


@dataclass(frozen=True)
class ProviderResult:
    text: str
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: int = 0
    finish_reason: str = ""


class TextProvider:
    name = "unconfigured"
    model = ""
    configured = False

    def generate(self, prompt: str) -> str:
        result = self.generate_chat([{"role": "user", "content": prompt}])
        return result.text

    def generate_chat(self, messages: list[dict], *, max_tokens: int = 500) -> ProviderResult:
        raise ProviderUnavailable(self.name, "No text-generation provider is configured.")

    def stream_chat(self, messages: list[dict], *, max_tokens: int = 500):
        raise ProviderUnavailable(self.name, "Streaming is not available for this provider.")


class UnconfiguredTextProvider(TextProvider):
    def __init__(
        self,
        name: str = "unconfigured",
        reason: str = "No text-generation provider is configured.",
    ):
        self.name = name
        self.reason = reason

    def generate_chat(self, messages: list[dict], *, max_tokens: int = 500) -> ProviderResult:
        raise ProviderUnavailable(self.name, self.reason)

    def stream_chat(self, messages: list[dict], *, max_tokens: int = 500):
        raise ProviderUnavailable(self.name, self.reason)
        yield  # pragma: no cover - keeps this method a generator


class OpenAICompatibleTextProvider(TextProvider):
    configured = True

    def __init__(self, *, name: str, api_key: str, base_url: str, model: str, timeout_seconds: float):
        parsed = urlparse(base_url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ProviderUnavailable(name, "The configured provider URL must be an HTTPS URL.")
        self.name = name
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = max(1.0, min(timeout_seconds, 60.0))

    def generate_chat(self, messages: list[dict], *, max_tokens: int = 500) -> ProviderResult:
        safe_messages = self._safe_messages(messages)
        started = time.monotonic()
        payload = _request_json(
            f"{self.base_url}/chat/completions",
            api_key=self.api_key,
            timeout_seconds=self.timeout_seconds,
            payload={
                "model": self.model,
                "messages": safe_messages,
                "max_tokens": max(1, min(int(max_tokens), 1000)),
                "temperature": 0.6,
            },
            provider=self.name,
        )
        try:
            choice = payload["choices"][0]
            text = choice["message"]["content"].strip()
        except (KeyError, IndexError, TypeError, AttributeError) as exc:
            raise ProviderResponseError(self.name, "The provider returned an invalid response.") from exc
        if not text:
            raise ProviderResponseError(self.name, "The provider returned an empty response.")
        usage = payload.get("usage") or {}
        return ProviderResult(
            text=text,
            provider=self.name,
            model=self.model,
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
            latency_ms=round((time.monotonic() - started) * 1000),
            finish_reason=str(choice.get("finish_reason") or ""),
        )

    def _safe_messages(self, messages: list[dict]) -> list[dict]:
        safe_messages = []
        for item in messages:
            role = item.get("role")
            content = item.get("content")
            if role not in {"system", "user", "assistant"} or not isinstance(content, str):
                raise ProviderResponseError(self.name, "The application supplied an invalid provider message.")
            safe_messages.append({"role": role, "content": content[:8000]})
        if not safe_messages:
            raise ProviderResponseError(self.name, "At least one provider message is required.")
        return safe_messages

    def stream_chat(self, messages: list[dict], *, max_tokens: int = 500):
        safe_messages = self._safe_messages(messages)
        started = time.monotonic()
        chunks = _stream_request_json(
            f"{self.base_url}/chat/completions",
            api_key=self.api_key,
            timeout_seconds=self.timeout_seconds,
            payload={
                "model": self.model,
                "messages": safe_messages,
                "max_tokens": max(1, min(int(max_tokens), 1000)),
                "temperature": 0.6,
                "stream": True,
                "stream_options": {"include_usage": True},
            },
            provider=self.name,
        )
        text_parts = []
        finish_reason = ""
        usage = {}
        for payload in chunks:
            usage = payload.get("usage") or (payload.get("x_groq") or {}).get("usage") or usage
            choices = payload.get("choices") or []
            if not choices:
                continue
            try:
                choice = choices[0]
                delta = choice.get("delta") or {}
                text = delta.get("content") or ""
                finish_reason = str(choice.get("finish_reason") or finish_reason)
            except (KeyError, IndexError, TypeError, AttributeError) as exc:
                raise ProviderResponseError(self.name, "The provider returned an invalid stream event.") from exc
            if text:
                text_parts.append(text)
                yield text
        text = "".join(text_parts).strip()
        if not text:
            raise ProviderResponseError(self.name, "The provider returned an empty stream.")
        return ProviderResult(
            text=text,
            provider=self.name,
            model=self.model,
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
            latency_ms=round((time.monotonic() - started) * 1000),
            finish_reason=finish_reason,
        )


def _request_json(url: str, *, api_key: str, timeout_seconds: float, payload: dict, provider: str) -> dict:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            raw = response.read(2_000_000)
    except HTTPError as exc:
        if exc.code == 429:
            raise ProviderRateLimited(provider, "The AI provider rate limit was reached. Try again shortly.") from exc
        raise ProviderUnavailable(provider, f"The AI provider returned HTTP {exc.code}.") from exc
    except (TimeoutError, socket.timeout) as exc:
        raise ProviderTimeout(provider, "The AI provider timed out.") from exc
    except URLError as exc:
        if isinstance(exc.reason, (TimeoutError, socket.timeout)):
            raise ProviderTimeout(provider, "The AI provider timed out.") from exc
        raise ProviderUnavailable(provider, "The AI provider could not be reached.") from exc
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ProviderResponseError(provider, "The AI provider returned invalid JSON.") from exc


def _stream_request_json(url: str, *, api_key: str, timeout_seconds: float, payload: dict, provider: str):
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        response = urlopen(request, timeout=timeout_seconds)
    except HTTPError as exc:
        if exc.code == 429:
            raise ProviderRateLimited(provider, "The AI provider rate limit was reached. Try again shortly.") from exc
        raise ProviderUnavailable(provider, f"The AI provider returned HTTP {exc.code}.") from exc
    except (TimeoutError, socket.timeout) as exc:
        raise ProviderTimeout(provider, "The AI provider timed out.") from exc
    except URLError as exc:
        if isinstance(exc.reason, (TimeoutError, socket.timeout)):
            raise ProviderTimeout(provider, "The AI provider timed out.") from exc
        raise ProviderUnavailable(provider, "The AI provider could not be reached.") from exc

    with response:
        for raw_line in response:
            try:
                line = raw_line.decode("utf-8", errors="strict").strip()
            except UnicodeDecodeError as exc:
                raise ProviderResponseError(provider, "The AI provider returned an invalid stream event.") from exc
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break
            try:
                yield json.loads(data)
            except json.JSONDecodeError as exc:
                raise ProviderResponseError(provider, "The AI provider returned an invalid stream event.") from exc


def get_text_provider() -> TextProvider:
    """Select an explicitly supported provider from backend configuration.

    The frontend Groq/Gemini keys are not reused here. A missing key is a
    failed integration, not permission to invent a model response.
    """
    key = os.environ.get("VIRTUARA_TEXT_PROVIDER_API_KEY", "").strip()
    provider_name = os.environ.get("VIRTUARA_TEXT_PROVIDER", "").strip()
    if not provider_name:
        return UnconfiguredTextProvider(
            reason="VIRTUARA_TEXT_PROVIDER is not configured on the server."
        )
    normalized = provider_name.lower()
    if not key:
        return UnconfiguredTextProvider(
            normalized,
            "VIRTUARA_TEXT_PROVIDER_API_KEY is not configured on the server.",
        )
    defaults = {
        "openai": ("https://api.openai.com/v1", "gpt-4o-mini"),
        "groq": ("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
    }
    if normalized not in {*defaults, "openai-compatible"}:
        return UnconfiguredTextProvider(
            normalized,
            f"VIRTUARA_TEXT_PROVIDER={normalized!r} is not supported.",
        )
    default_url, default_model = defaults.get(normalized, ("", ""))
    base_url = os.environ.get("VIRTUARA_TEXT_PROVIDER_BASE_URL", "").strip() or default_url
    model = os.environ.get("VIRTUARA_TEXT_PROVIDER_MODEL", "").strip() or default_model
    if not base_url or not model:
        return UnconfiguredTextProvider(
            normalized,
            "The configured text provider requires both a base URL and model.",
        )
    try:
        timeout = float(os.environ.get("VIRTUARA_TEXT_PROVIDER_TIMEOUT_SECONDS", "15"))
    except ValueError:
        return UnconfiguredTextProvider(
            normalized,
            "VIRTUARA_TEXT_PROVIDER_TIMEOUT_SECONDS must be a number.",
        )
    try:
        return OpenAICompatibleTextProvider(
            name=normalized,
            api_key=key,
            base_url=base_url,
            model=model,
            timeout_seconds=timeout,
        )
    except ProviderUnavailable as exc:
        return UnconfiguredTextProvider(normalized, exc.reason)


def enrich_text(prompt: str) -> str:
    provider = get_text_provider()
    if not provider.configured:
        raise ProviderUnavailable(
            provider.name,
            "No text-generation provider is configured. The curriculum result is unchanged.",
        )
    return provider.generate(prompt)
