"""Durable, bounded general-conversation orchestration."""

from __future__ import annotations

from django.db import IntegrityError, transaction

from apps.sessions.providers import (
    ProviderRateLimited,
    ProviderResponseError,
    ProviderTimeout,
    ProviderUnavailable,
    get_text_provider,
)
from apps.voice.models import GeneralConversation, GeneralTurn, ProviderUsage

MAX_INPUT_CHARS = 4000
MAX_CONTEXT_TURNS = 12
MAX_CONTEXT_CHARS = 12000


def _system_prompt(subject: str) -> str:
    context = subject.strip()[:120] or "General Learning"
    return (
        "You are Aria, the supportive AI mentor in Virtuara AI. "
        f"The explicitly selected conversation subject is {context}. "
        "Answer the learner's current request accurately and concisely. "
        "Say when you are uncertain. Do not claim to have read sources, resumes, "
        "or private interview data unless they are explicitly supplied in this conversation. "
        "Do not issue browser, operating-system, payment, authorization, or avatar commands."
    )


def bounded_messages(conversation: GeneralConversation, content: str) -> list[dict]:
    turns = list(conversation.turns.order_by("-created_at")[:MAX_CONTEXT_TURNS])
    turns.reverse()
    selected: list[GeneralTurn] = []
    used = len(content)
    for turn in reversed(turns):
        size = len(turn.user_text) + len(turn.assistant_text)
        if selected and used + size > MAX_CONTEXT_CHARS:
            break
        if size > MAX_CONTEXT_CHARS:
            continue
        selected.append(turn)
        used += size
    selected.reverse()
    messages = [{"role": "system", "content": _system_prompt(conversation.subject)}]
    for turn in selected:
        messages.extend(
            [
                {"role": "user", "content": turn.user_text},
                {"role": "assistant", "content": turn.assistant_text},
            ]
        )
    messages.append({"role": "user", "content": content})
    return messages


def _usage_status(exc: ProviderUnavailable) -> str:
    if isinstance(exc, ProviderTimeout):
        return "timeout"
    if isinstance(exc, ProviderRateLimited):
        return "rate_limited"
    if isinstance(exc, ProviderResponseError):
        return "invalid_response"
    return "unavailable"


def _turn_payload(turn: GeneralTurn, *, duplicate: bool = False) -> dict:
    return {
        "context": "general",
        "conversation_id": str(turn.conversation_id),
        "heard": turn.user_text,
        "response_text": turn.assistant_text,
        "spoken_text": turn.assistant_text,
        "duplicate": duplicate,
        "provider": {
            "name": turn.provider,
            "model": turn.model,
            "prompt_tokens": turn.prompt_tokens,
            "completion_tokens": turn.completion_tokens,
            "latency_ms": turn.latency_ms,
        },
    }


def general_turn(*, user, content: str, client_turn_id: str, conversation_id=None, subject: str = "") -> tuple[int, dict]:
    content = content.strip()
    if len(content) > MAX_INPUT_CHARS:
        return 400, {"error": "message_too_large", "message": f"Messages are limited to {MAX_INPUT_CHARS} characters."}

    previous = GeneralTurn.objects.filter(
        conversation__user=user, client_turn_id=client_turn_id
    ).select_related("conversation").first()
    if previous is not None:
        return 200, _turn_payload(previous, duplicate=True)

    if conversation_id:
        conversation = GeneralConversation.objects.filter(user=user, pk=conversation_id, status="active").first()
        if conversation is None:
            return 404, {"error": "conversation_not_found", "message": "That conversation is unavailable."}
        requested_subject = subject.strip()[:120]
        if requested_subject and requested_subject != conversation.subject:
            return 409, {
                "error": "subject_context_changed",
                "message": "Start a new conversation before changing the subject context.",
            }
    else:
        conversation = GeneralConversation.objects.create(user=user, subject=subject.strip()[:120])

    duplicate = GeneralTurn.objects.filter(
        conversation=conversation, client_turn_id=client_turn_id
    ).select_related("conversation").first()
    if duplicate is not None:
        return 200, _turn_payload(duplicate, duplicate=True)

    provider = get_text_provider()
    if not provider.configured:
        if not conversation_id and not conversation.turns.exists():
            conversation.delete()
        message = getattr(
            provider,
            "reason",
            "No server-side text-generation provider is configured.",
        )
        return 503, {
            "error": "ai_provider_unavailable",
            "recoverable": True,
            "heard": content,
            "spoken_text": None,
            "message": f"{message} Your message was not added to conversation history.",
            "provider": provider.name,
        }

    messages = bounded_messages(conversation, content)
    try:
        result = provider.generate_chat(messages, max_tokens=500)
    except ProviderUnavailable as exc:
        ProviderUsage.objects.create(
            user=user,
            conversation=conversation if conversation.pk else None,
            correlation_id=client_turn_id,
            provider=exc.provider,
            model=getattr(provider, "model", ""),
            status=_usage_status(exc),
        )
        if not conversation_id and not conversation.turns.exists():
            conversation.delete()
        return 503, {
            "error": _usage_status(exc),
            "recoverable": True,
            "heard": content,
            "spoken_text": None,
            "message": exc.reason,
            "provider": exc.provider,
        }

    try:
        with transaction.atomic():
            turn = GeneralTurn.objects.create(
                conversation=conversation,
                client_turn_id=client_turn_id,
                user_text=content,
                assistant_text=result.text,
                provider=result.provider,
                model=result.model,
                prompt_tokens=result.prompt_tokens,
                completion_tokens=result.completion_tokens,
                latency_ms=result.latency_ms,
            )
            conversation.save(update_fields=["updated_at"])
            ProviderUsage.objects.create(
                user=user,
                conversation=conversation,
                correlation_id=client_turn_id,
                provider=result.provider,
                model=result.model,
                status="success",
                prompt_tokens=result.prompt_tokens,
                completion_tokens=result.completion_tokens,
                latency_ms=result.latency_ms,
            )
    except IntegrityError:
        if not conversation.turns.exists():
            conversation.delete()
        turn = GeneralTurn.objects.select_related("conversation").get(
            conversation__user=user, client_turn_id=client_turn_id
        )
        return 200, _turn_payload(turn, duplicate=True)
    return 200, _turn_payload(turn)


def general_stream(*, user, content: str, client_turn_id: str, conversation_id=None, subject: str = ""):
    """Return an HTTP status and either an error payload or an event iterator."""
    content = content.strip()
    if len(content) > MAX_INPUT_CHARS:
        return 400, {"error": "message_too_large", "message": f"Messages are limited to {MAX_INPUT_CHARS} characters."}

    previous = GeneralTurn.objects.filter(
        conversation__user=user, client_turn_id=client_turn_id
    ).select_related("conversation").first()
    if previous is not None:
        def duplicate_events():
            yield {"type": "done", "payload": _turn_payload(previous, duplicate=True)}
        return 200, duplicate_events()

    created_new = not bool(conversation_id)
    if conversation_id:
        conversation = GeneralConversation.objects.filter(user=user, pk=conversation_id, status="active").first()
        if conversation is None:
            return 404, {"error": "conversation_not_found", "message": "That conversation is unavailable."}
        requested_subject = subject.strip()[:120]
        if requested_subject and requested_subject != conversation.subject:
            return 409, {
                "error": "subject_context_changed",
                "message": "Start a new conversation before changing the subject context.",
            }
    else:
        conversation = GeneralConversation.objects.create(user=user, subject=subject.strip()[:120])

    provider = get_text_provider()
    if not provider.configured:
        if created_new:
            conversation.delete()
        message = getattr(
            provider,
            "reason",
            "No server-side text-generation provider is configured.",
        )
        return 503, {
            "error": "ai_provider_unavailable",
            "recoverable": True,
            "message": f"{message} Your message was not added to conversation history.",
            "provider": provider.name,
        }
    messages = bounded_messages(conversation, content)

    def events():
        yield {"type": "conversation", "conversation_id": str(conversation.id)}
        stream = provider.stream_chat(messages, max_tokens=500)
        try:
            while True:
                try:
                    delta = next(stream)
                except StopIteration as stopped:
                    result = stopped.value
                    break
                yield {"type": "delta", "text": delta}
        except ProviderUnavailable as exc:
            ProviderUsage.objects.create(
                user=user,
                conversation=conversation,
                correlation_id=client_turn_id,
                provider=exc.provider,
                model=getattr(provider, "model", ""),
                status=_usage_status(exc),
            )
            if created_new and not conversation.turns.exists():
                conversation.delete()
            yield {
                "type": "error",
                "error": _usage_status(exc),
                "message": exc.reason,
                "recoverable": True,
            }
            return

        try:
            with transaction.atomic():
                turn = GeneralTurn.objects.create(
                    conversation=conversation,
                    client_turn_id=client_turn_id,
                    user_text=content,
                    assistant_text=result.text,
                    provider=result.provider,
                    model=result.model,
                    prompt_tokens=result.prompt_tokens,
                    completion_tokens=result.completion_tokens,
                    latency_ms=result.latency_ms,
                )
                conversation.save(update_fields=["updated_at"])
                ProviderUsage.objects.create(
                    user=user,
                    conversation=conversation,
                    correlation_id=client_turn_id,
                    provider=result.provider,
                    model=result.model,
                    status="success",
                    prompt_tokens=result.prompt_tokens,
                    completion_tokens=result.completion_tokens,
                    latency_ms=result.latency_ms,
                )
            payload = _turn_payload(turn)
        except IntegrityError:
            if not conversation.turns.exists():
                conversation.delete()
            turn = GeneralTurn.objects.select_related("conversation").get(
                conversation__user=user, client_turn_id=client_turn_id
            )
            payload = _turn_payload(turn, duplicate=True)
        yield {"type": "done", "payload": payload}

    return 200, events()
