"""Resume-grounded interview progression.

Questions may only mention skills, projects, or experience lines that were
extracted from the uploaded resume. Timing is decided by server timestamps.
"""

from __future__ import annotations

from django.utils import timezone

from apps.interviews.models import ALLOWED_DURATIONS, InterviewReport, InterviewSession, InterviewTurn


def validate_duration(minutes: int) -> str | None:
    if minutes not in ALLOWED_DURATIONS:
        return "Interview duration must be 10, 15, 20, 25, or 30 minutes."
    return None


def opening_question(profile: dict, role: str, interview_type: str) -> tuple[str, str]:
    role_label = role.strip() or "the target role"
    if interview_type == "project" and profile.get("projects"):
        project = profile["projects"][0][:220]
        return (
            f'Your resume lists this project: "{project}". What did you personally build, and what tradeoff did you make?',
            f"project:{project[:80]}",
        )
    if profile.get("skills"):
        skill = profile["skills"][0]
        return (
            f"Your resume lists {skill}. For {role_label}, describe a situation where you used {skill} and what you would change next time.",
            f"skill:{skill}",
        )
    experience = profile["experience"][0][:220]
    return (
        f'Your resume includes this experience: "{experience}". Walk through what you personally did.',
        f"experience:{experience[:80]}",
    )


def next_question(session: InterviewSession) -> tuple[str, str] | None:
    profile = session.resume.profile or {}
    asked = set(session.asked_topics or [])
    role_label = session.target_role.strip() or "the target role"
    for skill in profile.get("skills") or []:
        topic = f"skill:{skill}"
        if topic not in asked:
            return (
                f"You also list {skill}. How would you explain {skill} to someone joining a {role_label} team, including one limitation?",
                topic,
            )
    for project in profile.get("projects") or []:
        topic = f"project:{project[:80]}"
        if topic not in asked:
            snippet = project[:220]
            return (
                f'Another resume item is "{snippet}". What broke, and how did you know it was fixed?',
                topic,
            )
    return None


def evaluate_answer(answer: str, topic: str) -> dict:
    words = [part for part in (answer or "").split() if part]
    if len(words) < 12:
        return {
            "depth": "developing",
            "rationale": "The answer is too short to show reasoning. This is practice feedback, not a hiring decision.",
            "needs_follow_up": True,
        }
    return {
        "depth": "adequate",
        "rationale": f"The answer addresses {topic} with enough detail to continue. This is practice feedback, not a hiring decision.",
        "needs_follow_up": False,
    }


def follow_up(topic: str) -> str:
    label = topic.split(":", 1)[-1]
    return (
        f'You mentioned "{label}" only briefly. What did you do yourself, what was hard, and how did you check the result?'
    )


def remaining_seconds(session: InterviewSession, now=None) -> int:
    now = now or timezone.now()
    return max(0, int((session.deadline_at - now).total_seconds()))


def deadline_reached(session: InterviewSession, now=None) -> bool:
    now = now or timezone.now()
    return now >= session.deadline_at


def write_report(session: InterviewSession, *, completed: bool) -> InterviewReport:
    elapsed = ((session.ended_at or timezone.now()) - session.started_at).total_seconds() / 60
    turns = list(session.turns.order_by("sequence"))
    strengths = []
    improvements = []
    questions = []
    for turn in turns:
        questions.append({
            "question": turn.question,
            "answer": turn.answer,
            "evaluation": turn.evaluation,
        })
        depth = (turn.evaluation or {}).get("depth")
        if depth == "adequate":
            strengths.append(f"Gave a usable answer on {turn.evaluation.get('topic', 'the question')}.")
        elif turn.answer:
            improvements.append("Some answers were too short to judge reasoning.")
    if not strengths:
        strengths.append("No answer yet showed enough detail to mark as a strength.")
    if not improvements and completed:
        improvements.append("Add one concrete tradeoff to each project story.")
    if not completed:
        summary = (
            f"This interview was not completed. Configured length was {session.duration_minutes} minutes; "
            f"recorded time is {round(elapsed, 2)} minutes. It is not a finished interview."
        )
    else:
        summary = (
            f"Completed a {session.duration_minutes}-minute {session.interview_type} interview"
            f"{' for ' + session.target_role if session.target_role else ''}. "
            "Questions were limited to items extracted from the uploaded resume."
        )
    report, _created = InterviewReport.objects.update_or_create(
        session=session,
        defaults={
            "actual_minutes": round(elapsed, 2),
            "completed": completed,
            "strengths": strengths[:5],
            "improvements": improvements[:5] or ["Keep answers specific to the resume item being discussed."],
            "questions": questions,
            "summary": summary,
            "disclaimer": "Practice feedback only. This is not a hiring decision or a measure of employability.",
        },
    )
    return report


def public_session(session: InterviewSession) -> dict:
    report = None
    try:
        report = session.report
    except InterviewReport.DoesNotExist:
        report = None
    return {
        "id": str(session.id),
        "status": session.status,
        "target_role": session.target_role,
        "interview_type": session.interview_type,
        "duration_minutes": session.duration_minutes,
        "started_at": session.started_at.isoformat(),
        "deadline_at": session.deadline_at.isoformat(),
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "remaining_seconds": remaining_seconds(session) if session.status == "running" else 0,
        "current_prompt": session.current_prompt,
        "avatar": {
            "identity": "aria",
            "mode": "development",
            "state": "asking" if session.status == "running" else "idle",
            "live_stream": False,
            "note": "Development avatar state only. This is not a MetaHuman video stream.",
        },
        "report_ready": report is not None,
    }


def record_answer(session: InterviewSession, content: str, client_turn_id: str) -> tuple[int, dict]:
    existing = InterviewTurn.objects.filter(session=session, client_turn_id=client_turn_id).first()
    if existing is not None:
        payload = public_session(session)
        payload["duplicate"] = True
        payload["evaluation"] = existing.evaluation
        return 200, payload

    if session.status != "running":
        return 400, {"error": "interview_not_running", "recoverable": True, "message": "This interview is not accepting answers."}

    topic = (session.asked_topics or ["resume"])[-1]
    evaluation = evaluate_answer(content, topic)
    evaluation["topic"] = topic
    sequence = (session.turns.order_by("-sequence").values_list("sequence", flat=True).first() or 0) + 1
    InterviewTurn.objects.create(
        session=session,
        client_turn_id=client_turn_id,
        sequence=sequence,
        question=session.current_prompt,
        answer=content,
        evaluation=evaluation,
    )

    if deadline_reached(session):
        session.status = "completed"
        session.ended_at = session.deadline_at
        session.current_prompt = ""
        session.save(update_fields=["status", "ended_at", "current_prompt"])
        report = write_report(session, completed=True)
        payload = public_session(session)
        payload["completed"] = True
        payload["report"] = _report_payload(report)
        payload["response_text"] = "The scheduled time has ended. Your practice report is ready."
        return 200, payload

    if evaluation["needs_follow_up"]:
        prompt = follow_up(topic)
    else:
        nxt = next_question(session)
        if nxt is None:
            prompt = "We have covered the items extracted from your resume. Use the remaining time to add one detail you have not said yet, or stop the interview."
        else:
            prompt, topic_key = nxt
            asked = list(session.asked_topics or [])
            asked.append(topic_key)
            session.asked_topics = asked
    session.current_prompt = prompt
    session.save(update_fields=["current_prompt", "asked_topics"])
    payload = public_session(session)
    payload["response_text"] = prompt
    payload["evaluation"] = evaluation
    payload["completed"] = False
    return 200, payload


def abort_session(session: InterviewSession) -> dict:
    if session.status == "running":
        session.status = "aborted"
        session.ended_at = timezone.now()
        session.save(update_fields=["status", "ended_at"])
        write_report(session, completed=False)
    payload = public_session(session)
    payload["response_text"] = "Interview stopped. This is an aborted session, not a completed interview."
    return payload


def _report_payload(report: InterviewReport) -> dict:
    return {
        "completed": report.completed,
        "actual_minutes": report.actual_minutes,
        "configured_minutes": report.session.duration_minutes,
        "summary": report.summary,
        "strengths": report.strengths,
        "improvements": report.improvements,
        "questions": report.questions,
        "disclaimer": report.disclaimer,
    }
