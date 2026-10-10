from django.test import SimpleTestCase

from apps.sessions.policy import (
    ADDRESS_MISCONCEPTION,
    DIAGNOSE,
    GIVE_HINT,
    RECOMMEND_NEXT_LESSON,
    REINFORCE,
    ObjectiveState,
    apply_outcome,
    compose_incorrect,
    decide_after_evaluation,
    evaluate_answer,
    note_content_viewed,
    select_opening_action,
)


class PolicyTests(SimpleTestCase):
    def test_opening_is_diagnostic_before_any_evidence(self):
        self.assertEqual(select_opening_action(evidence_count=0, has_pending=False), DIAGNOSE)

    def test_viewing_content_does_not_change_mastery(self):
        state = ObjectiveState()
        viewed = note_content_viewed(state)
        self.assertEqual(viewed, state)
        self.assertEqual(viewed.evidence_count, 0)
        self.assertEqual(viewed.status, "unseen")

    def test_sign_error_selects_remediation_without_revealing_the_answer(self):
        decision = decide_after_evaluation(
            outcome="incorrect",
            misconception="sign_error",
            correct_count=0,
            hint_given=False,
        )
        self.assertEqual(decision.action, ADDRESS_MISCONCEPTION)
        self.assertFalse(decision.reveal_answer)
        self.assertTrue(decision.ask_follow_up)

    def test_unknown_wrong_answer_gets_a_hint_first(self):
        decision = decide_after_evaluation(
            outcome="incorrect",
            misconception="unrecognized",
            correct_count=0,
            hint_given=False,
        )
        self.assertEqual(decision.action, GIVE_HINT)
        self.assertFalse(decision.reveal_answer)

    def test_one_correct_is_demonstrated_not_retained(self):
        state = apply_outcome(ObjectiveState(), "correct")
        self.assertEqual(state.status, "demonstrated")
        self.assertEqual(state.correct_count, 1)
        self.assertLess(state.confidence, 0.5)
        decision = decide_after_evaluation(
            outcome="correct", misconception="", correct_count=state.correct_count, hint_given=False
        )
        self.assertEqual(decision.action, REINFORCE)

    def test_second_correct_is_retained(self):
        state = apply_outcome(apply_outcome(ObjectiveState(), "correct"), "correct")
        self.assertEqual(state.status, "retained")
        decision = decide_after_evaluation(
            outcome="correct", misconception="", correct_count=state.correct_count, hint_given=False
        )
        self.assertEqual(decision.action, RECOMMEND_NEXT_LESSON)

    def test_incorrect_then_correct_records_separate_states(self):
        after_miss = apply_outcome(ObjectiveState(), "incorrect", "sign_error")
        self.assertEqual(after_miss.status, "practising")
        self.assertEqual(after_miss.last_misconception, "sign_error")
        after_hit = apply_outcome(after_miss, "correct")
        self.assertEqual(after_hit.evidence_count, 2)
        self.assertEqual(after_hit.status, "demonstrated")

    def test_evaluator_matches_sign_error_and_accepted_form(self):
        patterns = [{"key": "sign_error", "answers": ["17"], "rationale": "Added instead of subtracted."}]
        wrong = evaluate_answer("x = 17", ["7"], patterns)
        self.assertEqual(wrong.outcome, "incorrect")
        self.assertEqual(wrong.misconception, "sign_error")
        right = evaluate_answer("x = 7", ["7"], patterns)
        self.assertEqual(right.outcome, "correct")

    def test_incorrect_feedback_is_not_only_the_answer(self):
        text = compose_incorrect(
            action=ADDRESS_MISCONCEPTION,
            remediation="Subtract the constant. Do not add it again.",
            hint="Subtract 5.",
            source_label="Algebra Fundamentals — inverse operations",
            follow_up="Solve for x: x + 6 = 15.",
        )
        self.assertNotEqual(text.strip(), "7")
        self.assertNotIn("The answer is 7", text)
        self.assertIn("Subtract the constant", text)
        self.assertIn("Algebra Fundamentals", text)
        self.assertIn("x + 6 = 15", text)
