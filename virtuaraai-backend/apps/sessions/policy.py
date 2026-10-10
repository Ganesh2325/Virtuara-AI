"""Deterministic teaching policy.

The language model may explain. It does not decide mastery or the next
instructional action. These functions are pure so they can be unit-tested
without a database or a provider.
"""

from __future__ import annotations

from dataclasses import dataclass, replace


DIAGNOSE = "DIAGNOSE"
EXPLAIN = "EXPLAIN"
EVALUATE_ANSWER = "EVALUATE_ANSWER"
GIVE_HINT = "GIVE_HINT"
PRACTICE = "PRACTICE"
ADDRESS_MISCONCEPTION = "ADDRESS_MISCONCEPTION"
REMEDIATE_PREREQUISITE = "REMEDIATE_PREREQUISITE"
REINFORCE = "REINFORCE"
CHECK_MASTERY = "CHECK_MASTERY"
SUMMARIZE = "SUMMARIZE"
RECOMMEND_NEXT_LESSON = "RECOMMEND_NEXT_LESSON"

# Two independent correct attempts are required before calling a skill retained.
# A single success is only "demonstrated". Reading content never counts.
RETAINED_CORRECT_THRESHOLD = 2


@dataclass(frozen=True)
class ObjectiveState:
    status: str = "unseen"
    mastery_estimate: float = 0.0
    confidence: float = 0.0
    evidence_count: int = 0
    correct_count: int = 0
    incorrect_streak: int = 0
    last_misconception: str = ""


@dataclass(frozen=True)
class Evaluation:
    outcome: str
    misconception: str
    confidence: float
    rationale: str


@dataclass(frozen=True)
class Decision:
    action: str
    ask_follow_up: bool
    follow_up_role: str | None
    reveal_answer: bool


def note_content_viewed(state: ObjectiveState) -> ObjectiveState:
    """Viewing an explanation is not evidence of mastery."""
    return state


def apply_outcome(state: ObjectiveState, outcome: str, misconception: str = "") -> ObjectiveState:
    if outcome == "correct":
        correct = state.correct_count + 1
        if correct >= RETAINED_CORRECT_THRESHOLD and state.incorrect_streak == 0:
            return replace(
                state,
                status="retained",
                mastery_estimate=0.85,
                confidence=0.8,
                evidence_count=state.evidence_count + 1,
                correct_count=correct,
                incorrect_streak=0,
                last_misconception="",
            )
        return replace(
            state,
            status="demonstrated",
            mastery_estimate=0.55,
            confidence=0.45,
            evidence_count=state.evidence_count + 1,
            correct_count=correct,
            incorrect_streak=0,
            last_misconception="",
        )

    return replace(
        state,
        status="practising",
        mastery_estimate=max(0.05, round(state.mastery_estimate - 0.2, 2)),
        confidence=0.5,
        evidence_count=state.evidence_count + 1,
        incorrect_streak=state.incorrect_streak + 1,
        last_misconception=misconception or "unrecognized",
    )


def select_opening_action(*, evidence_count: int, has_pending: bool) -> str:
    if has_pending:
        return PRACTICE
    if evidence_count == 0:
        return DIAGNOSE
    return EXPLAIN


def decide_after_evaluation(
    *,
    outcome: str,
    misconception: str,
    correct_count: int,
    hint_given: bool,
) -> Decision:
    if outcome == "correct" and correct_count >= RETAINED_CORRECT_THRESHOLD:
        return Decision(RECOMMEND_NEXT_LESSON, ask_follow_up=False, follow_up_role=None, reveal_answer=False)
    if outcome == "correct":
        return Decision(REINFORCE, ask_follow_up=True, follow_up_role="mastery_check", reveal_answer=False)
    if misconception and misconception != "unrecognized":
        return Decision(ADDRESS_MISCONCEPTION, ask_follow_up=True, follow_up_role="practice", reveal_answer=False)
    if not hint_given:
        return Decision(GIVE_HINT, ask_follow_up=True, follow_up_role="practice", reveal_answer=False)
    return Decision(REMEDIATE_PREREQUISITE, ask_follow_up=True, follow_up_role="practice", reveal_answer=False)


def mastery_explanation(state: ObjectiveState) -> str:
    return (
        "Progress counts only scored attempts. Reading or finishing a chat does not. "
        f"Retained requires {RETAINED_CORRECT_THRESHOLD} correct attempts without an open incorrect streak. "
        f"Now: status={state.status}, evidence={state.evidence_count}, "
        f"correct={state.correct_count}, estimate={state.mastery_estimate}, confidence={state.confidence}."
    )


def normalize_answer(value: str) -> str:
    text = (value or "").strip().lower()
    for token in ("x =", "x="):
        text = text.replace(token, "")
    return "".join(text.split())


def evaluate_answer(answer: str, acceptable: list[str], patterns: list[dict]) -> Evaluation:
    normalized = normalize_answer(answer)
    if not normalized:
        return Evaluation(
            outcome="incorrect",
            misconception="empty",
            confidence=1.0,
            rationale="No answer was submitted.",
        )
    accepted = {normalize_answer(item) for item in acceptable}
    if normalized in accepted:
        return Evaluation(
            outcome="correct",
            misconception="",
            confidence=1.0,
            rationale="The response matches an accepted form of the solution.",
        )
    for pattern in patterns or []:
        known = {normalize_answer(item) for item in pattern.get("answers", [])}
        if normalized in known:
            return Evaluation(
                outcome="incorrect",
                misconception=pattern.get("key") or "unrecognized",
                confidence=1.0,
                rationale=pattern.get("rationale") or "The response matches a known error pattern.",
            )
    return Evaluation(
        outcome="incorrect",
        misconception="unrecognized",
        confidence=0.55,
        rationale="The response does not match the accepted solution or a known error pattern. Mastery stays uncertain.",
    )


def compose_opening(*, declared_level: str, status: str, excerpt: str, source_label: str, prompt: str, missing_source: bool) -> str:
    if missing_source:
        source = "No curriculum text is indexed for this objective, so this prompt is not attributed to a source."
    else:
        source = f"{excerpt}\n\nSource: {source_label}."
    return (
        f"Starting level on file: {declared_level or 'unspecified'}. "
        f"Objective state: {status}. This is a diagnostic, not a mastery score.\n\n"
        f"{source}\n\n{prompt}"
    )


def compose_correct(*, follow_up: str | None, retained: bool) -> str:
    if retained:
        closing = "Two correct attempts are on record, so this objective is marked retained. A useful next step is a new objective, not another copy of this solution."
    else:
        closing = "One correct attempt shows the idea was demonstrated. It is not retained until a second correct attempt."
    parts = [closing]
    if follow_up:
        parts.append(f"Next check: {follow_up}")
    return "\n\n".join(parts)


def compose_incorrect(*, action: str, remediation: str, hint: str, source_label: str, follow_up: str | None) -> str:
    guidance = hint if action == GIVE_HINT and hint else remediation
    if not guidance:
        guidance = "The attempt does not match the expected relationship. Use the inverse operation from the curriculum note rather than repeating a previous number."
    parts = [
        guidance,
        f"Source: {source_label}." if source_label else "No separate source was retrieved.",
        "This attempt is practice evidence, not mastery.",
    ]
    if follow_up:
        parts.append(f"Follow-up: {follow_up}")
    return "\n\n".join(parts)


def compose_resume(*, status: str, pending_prompt: str | None, explanation: str) -> str:
    if pending_prompt:
        nxt = f"Continue with the question already in progress: {pending_prompt}"
    elif status == "retained":
        nxt = "This objective is retained. The useful next step is a later objective, not a repeated answer."
    else:
        nxt = "No question is waiting. Ask to continue and the next check will be chosen from the remaining items."
    return f"Session resumed. Objective status: {status}.\n\n{explanation}\n\n{nxt}"
