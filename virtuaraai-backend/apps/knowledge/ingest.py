import hashlib
import re

from .models import KnowledgeChunk, KnowledgeSource

CHUNK_CHARS = 800
CHUNK_OVERLAP = 100


def fingerprint(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def chunk_text(text: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []
    chunks = []
    start = 0
    while start < len(normalized):
        end = min(start + CHUNK_CHARS, len(normalized))
        chunks.append(normalized[start:end])
        if end == len(normalized):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks


def index_source(source: KnowledgeSource, text: str) -> KnowledgeSource:
    cleaned = text.strip()
    if not cleaned:
        source.status = "failed"
        source.error = "The file did not contain readable text."
        source.save(update_fields=["status", "error"])
        return source
    source.text = cleaned[:200_000]
    source.fingerprint = fingerprint(source.text)
    source.status = "indexed"
    source.error = ""
    source.save(update_fields=["text", "fingerprint", "status", "error"])
    source.chunks.all().delete()
    KnowledgeChunk.objects.bulk_create(
        [
            KnowledgeChunk(source=source, ordinal=index, text=piece)
            for index, piece in enumerate(chunk_text(source.text))
        ]
    )
    return source
