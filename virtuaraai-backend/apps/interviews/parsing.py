"""Extract only text that is present in an uploaded resume.

Missing sections stay empty. The parser does not invent employers, skills, or dates.
"""

from __future__ import annotations

import io
import re
import zipfile
from xml.etree import ElementTree

MAX_RESUME_BYTES = 5 * 1024 * 1024
WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def extract_text(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".txt"):
        return data.decode("utf-8", errors="replace")
    if name.endswith(".pdf"):
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    if name.endswith(".docx"):
        return _extract_docx(data)
    raise ValueError("unsupported_type")


def _extract_docx(data: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as package:
            xml = package.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile) as exc:
        raise ValueError("unreadable_docx") from exc
    root = ElementTree.fromstring(xml)
    parts = [node.text or "" for node in root.iter(f"{WORD_NS}t")]
    return " ".join(part for part in parts if part)


def parse_profile(text: str) -> tuple[dict | None, str]:
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    if len(" ".join(lines)) < 40:
        return None, "The file did not contain enough readable resume text."

    sections: dict[str, list[str]] = {}
    current = "summary"
    buffer: list[str] = []

    def flush() -> None:
        if buffer:
            sections.setdefault(current, []).extend(buffer)
            buffer.clear()

    for line in lines:
        key = line.lower().strip(":").strip()
        mapped = _section_name(key)
        if mapped:
            flush()
            current = mapped
            continue
        buffer.append(line)
    flush()

    skills: list[str] = []
    for line in sections.get("skills", []):
        for part in re.split(r"[,•|;/]", line):
            item = part.strip(" -–")
            if 2 <= len(item) <= 48 and item.lower() not in {"skills", "and"}:
                skills.append(item)
    # Preserve order while dropping duplicates.
    seen = set()
    unique_skills = []
    for skill in skills:
        token = skill.lower()
        if token not in seen:
            seen.add(token)
            unique_skills.append(skill)

    profile = {
        "skills": unique_skills[:12],
        "projects": sections.get("projects", [])[:5],
        "experience": sections.get("experience", [])[:8],
        "education": sections.get("education", [])[:4],
        "certifications": sections.get("certifications", [])[:4],
        "source_note": "Extracted only from text present in the uploaded file.",
    }
    if not profile["skills"] and not profile["projects"] and not profile["experience"]:
        return None, (
            "No skills, projects, or experience section could be read. "
            "Add one of those headings and upload the resume again."
        )
    return profile, ""


def _section_name(key: str) -> str | None:
    if key in {"skills", "technical skills", "core skills"}:
        return "skills"
    if key in {"experience", "work experience", "professional experience"}:
        return "experience"
    if key in {"projects", "selected projects"}:
        return "projects"
    if key in {"education"}:
        return "education"
    if key in {"certifications", "certificates"}:
        return "certifications"
    return None
