"""Orchestrates curriculum retrieval, policy decisions, and persistence.

Learner-state changes happen here, inside a database transaction. Model
output is never allowed to write mastery or entitlements.
"""

from __future__ import annotations

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

from apps.sessions import policy
from apps.sessions.models import LearnerObjectiveState, LearningSession, MasteryEvidence, SessionMessage, SessionTurn
from apps.sessions.providers import ProviderUnavailable, enrich_text


def _snapshot(row: LearnerObjectiveState) -> policy.ObjectiveState:
    return policy.ObjectiveState(
        status=row.status,
        mastery_estimate=row.mastery_estimate,
        confidence=row.confidence,
        evidence_count=row.evidence_count,
        correct_count=row.correct_count,
        incorrect_streak=row.incorrect_streak,
        last_misconception=row.last_misconception,
    )


def _write_state(row: LearnerObjectiveState, state: policy.ObjectiveState) -> None:
    row.status = state.status
    row.mastery_estimate = state.mastery_estimate
    row.confidence = state.confidence
    row.evidence_count = state.evidence_count
    row.correct_count = state.correct_count
    row.incorrect_streak = state.incorrect_streak
    row.last_misconception = state.last_misconception
    row.save()


def declared_level(user) -> str:
    try:
        level = user.profile.level
    except ObjectDoesNotExist:
        return "unspecified"
    return level or "unspecified"


def retrieve_curriculum(objective) -> tuple[list[dict], bool]:
    resources = list(objective.resources.order_by("order"))
    if not resources:
        return [], True
    return [
        {
            "title": item.title,
            "source_label": item.source_label,
            "excerpt": item.body[:500],
        }
        for item in resources
    ], False


def _mastery_payload(state: policy.ObjectiveState) -> dict:
    return {
        "status": state.status,
        "estimate": state.mastery_estimate,
        "confidence": state.confidence,
        "evidence_count": state.evidence_count,
        "correct_count": state.correct_count,
        "explanation": policy.mastery_explanation(state),
    }


def _objective_payload(objective) -> dict:
    return {"id": str(objective.id), "slug": objective.slug, "title": objective.title}


def _question_payload(question) -> dict | None:
    if question is None:
        return None
    return {"id": str(question.id), "prompt": question.prompt, "role": question.role}


def _base_payload(*, action, text, objective, sources, question, evaluation, state, next_action, missing_source) -> dict:
    return {
        "action": action,
        "response_text": text,
        "learning_objective": _objective_payload(objective),
        "sources": sources,
        "source_missing": missing_source,
        "question": _question_payload(question),
        "evaluation": evaluation,
        "mastery": _mastery_payload(state),
        "next_action": next_action,
        "provider": {"used": False, "name": "curriculum"},
        "model_response": None,
        "duplicate": False,
        "recoverable": True,
    }


def _get_state(session: LearningSession) -> LearnerObjectiveState:
    row, _created = LearnerObjectiveState.objects.get_or_create(
        user=session.user,
        objective=session.objective,
        defaults={"declared_level": declared_level(session.user)},
    )
    return row


def _pick_question(objective, *, role: str, after_order: int = -1):
    return (
        objective.questions.filter(is_active=True, role=role, order__gt=after_order)
        .order_by("order")
        .first()
        or objective.questions.filter(is_active=True, role=role).order_by("order").first()
    )


def _store_message(session, role, content) -> None:
    SessionMessage.objects.create(session=session, role=role, content=content)


def begin_session(session: LearningSession) -> dict:
    if session.objective_id is None:
        raise ValueError("objective_required")
    with transaction.atomic():
        session = LearningSession.objects.select_for_update().get(pk=session.pk)
        state_row = _get_state(session)
        state = policy.note_content_viewed(_snapshot(state_row))
        sources, missing = retrieve_curriculum(session.objective)
        if session.pending_question_id:
            text = policy.compose_resume(
                status=state.status,
                pending_prompt=session.pending_question.prompt,
                explanation=policy.mastery_explanation(state),
            )
            return _base_payload(
                action=policy.PRACTICE,
                text=text,
                objective=session.objective,
                sources=sources,
                question=session.pending_question,
                evaluation=None,
                state=state,
                next_action=policy.EVALUATE_ANSWER,
                missing_source=missing,
            )

        action = policy.select_opening_action(evidence_count=state.evidence_count, has_pending=False)
        role = "diagnostic" if action == policy.DIAGNOSE else "practice"
        question = _pick_question(session.objective, role=role)
        if question is None:
            question = session.objective.questions.filter(is_active=True).order_by("order").first()
        excerpt = sources[0]["excerpt"] if sources else ""
        source_label = sources[0]["source_label"] if sources else ""
        prompt = question.prompt if question else "No published question is available for this objective."
        text = policy.compose_opening(
            declared_level=state_row.declared_level or declared_level(session.user),
            status=state.status,
            excerpt=excerpt,
            source_label=source_label,
            prompt=prompt,
            missing_source=missing,
        )
        if question is not None:
            session.pending_question = question
            session.status = "active"
            session.save(update_fields=["pending_question", "status"])
        _store_message(session, "assistant", text)
        return _base_payload(
            action=action,
            text=text,
            objective=session.objective,
            sources=sources,
            question=question,
            evaluation=None,
            state=state,
            next_action=policy.EVALUATE_ANSWER if question else policy.SUMMARIZE,
            missing_source=missing,
        )


def _duplicate(session, client_turn_id):
    existing = SessionTurn.objects.filter(session=session, client_turn_id=client_turn_id).first()
    if existing is None:
        return None
    payload = dict(existing.response_payload)
    payload["duplicate"] = True
    return existing.http_status, payload


def answer_turn(session: LearningSession, content: str, client_turn_id: str, request_model: bool = False):
    if session.objective_id is None:
        raise ValueError("objective_required")
    with transaction.atomic():
        session = LearningSession.objects.select_for_update().get(pk=session.pk)
        duplicate = _duplicate(session, client_turn_id)
        if duplicate is not None:
            return duplicate

        state_row = _get_state(session)
        before = _snapshot(state_row)
        question = session.pending_question
        if question is None:
            opened = begin_session(session)
            opened["duplicate"] = False
            _remember_turn(session, client_turn_id, content, opened, 200)
            return 200, opened

        evaluation = policy.evaluate_answer(
            content,
            question.acceptable_answers or [],
            question.misconception_patterns or [],
        )
        after = policy.apply_outcome(before, evaluation.outcome, evaluation.misconception)
        decision = policy.decide_after_evaluation(
            outcome=evaluation.outcome,
            misconception=evaluation.misconception,
            correct_count=after.correct_count,
            hint_given=session.hint_given,
        )
        sources, missing = retrieve_curriculum(session.objective)
        source_label = sources[0]["source_label"] if sources else ""
        follow_up = None
        if decision.ask_follow_up:
            follow = _pick_question(
                session.objective,
                role=decision.follow_up_role or "practice",
                after_order=question.order,
            )
            if follow is not None and follow.id != question.id:
                follow_up = follow
        follow_prompt = follow_up.prompt if follow_up else None
        if evaluation.outcome == "correct":
            text = policy.compose_correct(follow_up=follow_prompt, retained=after.status == "retained")
        else:
            text = policy.compose_incorrect(
                action=decision.action,
                remediation=question.remediation,
                hint=question.hint,
                source_label=source_label,
                follow_up=follow_prompt,
            )
            if decision.action == policy.GIVE_HINT:
                session.hint_given = True

        _write_state(state_row, after)
        MasteryEvidence.objects.create(
            user=session.user,
            objective=session.objective,
            session=session,
            question=question,
            outcome=evaluation.outcome,
            response_text=content,
            misconception=evaluation.misconception,
            action=decision.action,
            rationale=evaluation.rationale,
        )
        session.pending_question = follow_up
        session.status = "active"
        session.save(update_fields=["pending_question", "status", "hint_given"])
        _store_message(session, "user", content)
        _store_message(session, "assistant", text)

        payload = _base_payload(
            action=decision.action,
            text=text,
            objective=session.objective,
            sources=sources,
            question=follow_up,
            evaluation={
                "outcome": evaluation.outcome,
                "misconception": evaluation.misconception,
                "rationale": evaluation.rationale,
                "confidence": evaluation.confidence,
            },
            state=after,
            next_action=policy.EVALUATE_ANSWER if follow_up else policy.RECOMMEND_NEXT_LESSON,
            missing_source=missing,
        )
        status_code = 200
        if request_model:
            try:
                payload["model_response"] = enrich_text(text)
                payload["provider"] = {"used": True, "name": "configured"}
            except ProviderUnavailable as exc:
                payload["model_response"] = None
                payload["provider"] = {"used": False, "name": exc.provider}
                payload["error"] = "ai_provider_unavailable"
                payload["message"] = exc.reason
                payload["curriculum_recovery"] = {
                    "response_text": text,
                    "provider": {"used": False, "name": "curriculum"},
                }
                status_code = 503
        _remember_turn(session, client_turn_id, content, payload, status_code)
        return status_code, payload


def _remember_turn(session, client_turn_id, content, payload, status_code) -> None:
    sequence = (session.turns.order_by("-sequence").values_list("sequence", flat=True).first() or 0) + 1
    SessionTurn.objects.create(
        session=session,
        client_turn_id=client_turn_id,
        sequence=sequence,
        learner_message=content,
        action=payload.get("action", ""),
        response_payload=payload,
        http_status=status_code,
    )


def resume_session(session: LearningSession) -> dict:
    if session.objective_id is None:
        raise ValueError("objective_required")
    state_row = _get_state(session)
    state = _snapshot(state_row)
    sources, missing = retrieve_curriculum(session.objective)
    pending = session.pending_question.prompt if session.pending_question_id else None
    text = policy.compose_resume(
        status=state.status,
        pending_prompt=pending,
        explanation=policy.mastery_explanation(state),
    )
    if session.status == "completed":
        session.status = "active"
        session.ended_at = None
        session.save(update_fields=["status", "ended_at"])
    return _base_payload(
        action=policy.PRACTICE if pending else policy.RECOMMEND_NEXT_LESSON,
        text=text,
        objective=session.objective,
        sources=sources,
        question=session.pending_question,
        evaluation=None,
        state=state,
        next_action=policy.EVALUATE_ANSWER if pending else policy.RECOMMEND_NEXT_LESSON,
        missing_source=missing,
    )


def enrich_saved_turn(session: LearningSession, client_turn_id: str):
    turn = SessionTurn.objects.filter(session=session, client_turn_id=client_turn_id).first()
    if turn is None:
        return 404, {"error": "turn_not_found", "recoverable": True, "message": "No saved turn matches that id."}
    before = state_count(session)
    try:
        generated = enrich_text(turn.response_payload.get("response_text", ""))
    except ProviderUnavailable as exc:
        return 503, {
            "error": "ai_provider_unavailable",
            "recoverable": True,
            "message": exc.reason,
            "model_response": None,
            "curriculum_recovery": {
                "response_text": turn.response_payload.get("response_text", ""),
                "provider": {"used": False, "name": "curriculum"},
            },
            "evidence_count": before,
        }
    return 200, {"model_response": generated, "evidence_count": before}


def state_count(session: LearningSession) -> int:
    row = LearnerObjectiveState.objects.filter(user=session.user, objective=session.objective).first()
    return row.evidence_count if row else 0
