"""Validated conversational response policy for general ARIA turns."""

from __future__ import annotations

import html
import json
import os
import re
from dataclasses import dataclass

from apps.sessions.providers import ProviderResponseError

RESPONSE_MODES = {"concise", "simple", "detailed", "steps", "code", "yes_no"}
BLOCK_TYPES = {"paragraph", "list", "numbered_steps", "emphasis", "code", "math", "table"}
MAX_BLOCKS = 12


@dataclass(frozen=True)
class ResponsePolicy:
    mode: str
    max_tokens: int
    guidance: str


def _env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except ValueError:
        value = default
    return max(minimum, min(value, maximum))


def select_response_policy(content: str, requested_mode: str = "") -> ResponsePolicy:
    requested = requested_mode.strip().lower()
    lowered = content.lower()
    if requested not in RESPONSE_MODES:
        requested = ""

    if requested:
        mode = requested
    elif any(term in lowered for term in ("detailed notes", "in depth", "in-depth", "complete tutorial", "comprehensive")):
        mode = "detailed"
    elif any(term in lowered for term in ("step by step", "step-by-step", "show the steps")):
        mode = "steps"
    elif any(term in lowered for term in ("write code", "show code", "code example", "implement ")):
        mode = "code"
    elif any(term in lowered for term in ("explain simply", "simple terms", "like i'm a beginner", "eli5")):
        mode = "simple"
    elif (
        re.match(r"^\s*(is|are|can|could|does|do|did|will|would|should|has|have)\b", lowered)
        and not re.match(
            r"^\s*(can|could|would)\s+you\s+(explain|describe|show|teach|tell)\b",
            lowered,
        )
    ):
        mode = "yes_no"
    else:
        mode = "concise"

    if mode == "detailed":
        return ResponsePolicy(
            mode,
            _env_int("VIRTUARA_DETAILED_RESPONSE_MAX_TOKENS", 900, 300, 1000),
            "Give a well-organized explanation with useful detail, but avoid repetition.",
        )
    if mode == "steps":
        return ResponsePolicy(
            mode,
            _env_int("VIRTUARA_DETAILED_RESPONSE_MAX_TOKENS", 900, 300, 1000),
            "Give clear sequential steps and include only the explanation needed to use them.",
        )
    if mode == "code":
        return ResponsePolicy(
            mode,
            _env_int("VIRTUARA_DETAILED_RESPONSE_MAX_TOKENS", 900, 300, 1000),
            "Provide functional code in a code block plus a concise explanation.",
        )
    if mode == "simple":
        return ResponsePolicy(
            mode,
            _env_int("VIRTUARA_CONCISE_RESPONSE_MAX_TOKENS", 450, 160, 700),
            "Use everyday language and one familiar example. Explain technical words plainly.",
        )
    if mode == "yes_no":
        return ResponsePolicy(
            mode,
            _env_int("VIRTUARA_CONCISE_RESPONSE_MAX_TOKENS", 450, 160, 700),
            "Answer yes or no directly first, then add a short clarification.",
        )
    return ResponsePolicy(
        mode,
        _env_int("VIRTUARA_CONCISE_RESPONSE_MAX_TOKENS", 450, 160, 700),
        "Answer directly in two to five sentences. Include one simple example only when it helps.",
    )


def clean_plain_text(value: object, *, limit: int = 4000) -> str:
    if not isinstance(value, str):
        return ""
    text = html.unescape(value)
    text = re.sub(r"<\s*br\s*/?\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"```(?:[a-zA-Z0-9_+-]+)?", "", text)
    text = text.replace("```", "")
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", text)
    text = re.sub(r"(?m)^\s*[-*_]{3,}\s*$", "", text)
    text = re.sub(r"(\*\*|__)(.*?)\1", r"\2", text)
    text = re.sub(r"(?<!\w)([*_])(.*?)\1(?!\w)", r"\2", text)
    text = text.replace(r"\(", "").replace(r"\)", "").replace(r"\[", "").replace(r"\]", "")
    text = text.replace("$$", "").replace("$", "")
    text = re.sub(r"(?m)^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$", "", text)
    text = re.sub(r"[ \t]*\|[ \t]*", ", ", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:limit]


def _clean_items(value: object, *, max_items: int = 12) -> list[str]:
    if not isinstance(value, list):
        return []
    return [cleaned for item in value[:max_items] if (cleaned := clean_plain_text(item, limit=800))]


def _normalize_block(raw: object) -> dict | None:
    if not isinstance(raw, dict):
        return None
    block_type = raw.get("type")
    # Some OpenAI-compatible models use the common text/content spelling even
    # when instructed to return paragraph/text. Normalize that safe alias
    # while continuing to reject unknown rendering instructions.
    if block_type == "text":
        block_type = "paragraph"
        raw = {**raw, "text": raw.get("text") or raw.get("content")}
    if block_type not in BLOCK_TYPES:
        return None
    if block_type in {"paragraph", "emphasis"}:
        text = clean_plain_text(raw.get("text"), limit=3000)
        return {"type": block_type, "text": text} if text else None
    if block_type in {"list", "numbered_steps"}:
        items = _clean_items(raw.get("items"))
        return {"type": block_type, "items": items} if items else None
    if block_type == "code":
        code = raw.get("code")
        if not isinstance(code, str) or not code.strip():
            return None
        language = re.sub(r"[^a-zA-Z0-9_+-]", "", str(raw.get("language") or ""))[:30]
        return {"type": "code", "language": language, "code": code.strip()[:8000]}
    if block_type == "math":
        expression = clean_plain_text(raw.get("expression"), limit=1200)
        label = clean_plain_text(raw.get("label"), limit=240)
        if not expression:
            return None
        return {"type": "math", "expression": expression, "label": label}
    if block_type == "table":
        columns = _clean_items(raw.get("columns"), max_items=6)
        rows = raw.get("rows")
        if not columns or not isinstance(rows, list):
            return None
        clean_rows = []
        for row in rows[:10]:
            cells = _clean_items(row, max_items=len(columns))
            if cells:
                clean_rows.append((cells + [""] * len(columns))[: len(columns)])
        if not clean_rows:
            return None
        return {"type": "table", "columns": columns, "rows": clean_rows}
    return None


def _spoken_from_blocks(blocks: list[dict]) -> str:
    parts: list[str] = []
    for block in blocks:
        block_type = block["type"]
        if block_type in {"paragraph", "emphasis"}:
            parts.append(block["text"])
        elif block_type in {"list", "numbered_steps"}:
            parts.extend(block["items"][:3])
        elif block_type == "code":
            parts.append("I included the complete code in the chat.")
        elif block_type == "math":
            parts.append(block.get("label") or block["expression"])
        elif block_type == "table":
            parts.append("I included a comparison table in the chat.")
    return clean_plain_text(" ".join(parts), limit=1200)


def parse_structured_response(
    text: str,
    *,
    policy: ResponsePolicy,
    subject_context: dict | None,
) -> dict:
    raw = text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise ProviderResponseError("structured_response", "The AI provider returned an invalid structured response.") from exc
    if not isinstance(data, dict):
        raise ProviderResponseError("structured_response", "The AI provider returned an invalid structured response.")

    blocks = [
        normalized
        for item in (data.get("display_blocks") or [])[:MAX_BLOCKS]
        if (normalized := _normalize_block(item)) is not None
    ]
    if not blocks:
        raise ProviderResponseError("structured_response", "The AI provider returned no displayable response.")

    spoken = clean_plain_text(data.get("spoken_text"), limit=1200)
    if not spoken:
        spoken = _spoken_from_blocks(blocks)
    if not spoken:
        raise ProviderResponseError("structured_response", "The AI provider returned no speakable response.")

    return {
        "response_mode": policy.mode,
        "spoken_text": spoken,
        "display_blocks": blocks,
        "sources": [],
        "follow_up": clean_plain_text(data.get("follow_up"), limit=240) or None,
        "subject_context": subject_context,
    }


def response_contract_prompt(policy: ResponsePolicy) -> str:
    return (
        "Return only one valid JSON object. Do not wrap it in Markdown. "
        f'Use response_mode "{policy.mode}". {policy.guidance} '
        'The object must have: "spoken_text" (plain natural speech without Markdown, HTML, '
        'LaTeX delimiters, table separators, or code), "display_blocks" (an array), and '
        '"follow_up" (a useful question or null). '
        "Allowed display block shapes are: "
        '{"type":"paragraph","text":"..."}, '
        '{"type":"emphasis","text":"..."}, '
        '{"type":"list","items":["..."]}, '
        '{"type":"numbered_steps","items":["..."]}, '
        '{"type":"code","language":"python","code":"..."}, '
        '{"type":"math","expression":"plain or Unicode math","label":"..."}, and '
        '{"type":"table","columns":["..."],"rows":[["..."]]}. '
        "Use paragraph blocks for ordinary answers. Do not put Markdown syntax inside text fields. "
        "Do not include sources or claim retrieval unless verified source data was supplied by the application."
    )
