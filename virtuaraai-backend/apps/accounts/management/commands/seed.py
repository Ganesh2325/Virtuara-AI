from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Seed database with subjects, plans, and an admin user"

    def add_arguments(self, parser):
        parser.add_argument("--admin-email", default="admin@virtuara.ai")
        parser.add_argument("--admin-password", default="Admin@1234")

    def handle(self, *args, **options):
        self._seed_subjects()
        self._seed_algebra_objective()
        self._seed_plans()
        self._create_admin(options["admin_email"], options["admin_password"])
        self.stdout.write(self.style.SUCCESS("\n✓ Database seeded successfully!"))

    def _seed_subjects(self):
        from apps.subjects.models import Subject, Module

        subjects_data = [
            {"name": "Mathematics",     "slug": "mathematics",     "icon": "📐", "category": "mathematics", "order": 1},
            {"name": "Physics",         "slug": "physics",         "icon": "⚛️",  "category": "science",     "order": 2},
            {"name": "Chemistry",       "slug": "chemistry",       "icon": "🧪", "category": "science",     "order": 3},
            {"name": "Biology",         "slug": "biology",         "icon": "🧬", "category": "science",     "order": 4},
            {"name": "History",         "slug": "history",         "icon": "🏛️", "category": "humanities",  "order": 5},
            {"name": "Literature",      "slug": "literature",      "icon": "📚", "category": "humanities",  "order": 6},
            {"name": "Computer Science","slug": "computer-science","icon": "💻", "category": "technology",  "order": 7},
            {"name": "Economics",       "slug": "economics",       "icon": "📊", "category": "business",    "order": 8},
        ]

        for data in subjects_data:
            subject, created = Subject.objects.get_or_create(slug=data["slug"], defaults={**data, "is_active": True})
            if created:
                self.stdout.write(f"  + Subject: {subject.name}")

        # Seed modules for Maths
        maths = Subject.objects.get(slug="mathematics")
        modules = [
            {"title": "Algebra Fundamentals",  "difficulty": "beginner",     "order": 1, "estimated_minutes": 45},
            {"title": "Differential Calculus", "difficulty": "intermediate", "order": 2, "estimated_minutes": 60},
            {"title": "Linear Algebra",        "difficulty": "advanced",     "order": 3, "estimated_minutes": 75},
        ]
        for m in modules:
            Module.objects.get_or_create(subject=maths, order=m["order"], defaults={**m, "is_active": True})

        # Seed modules for CS
        cs = Subject.objects.get(slug="computer-science")
        cs_modules = [
            {"title": "Python Essentials",              "difficulty": "beginner",     "order": 1, "estimated_minutes": 50},
            {"title": "Data Structures & Algorithms",   "difficulty": "intermediate", "order": 2, "estimated_minutes": 90},
            {"title": "System Design",                  "difficulty": "advanced",     "order": 3, "estimated_minutes": 80},
        ]
        for m in cs_modules:
            Module.objects.get_or_create(subject=cs, order=m["order"], defaults={**m, "is_active": True})

        self.stdout.write(self.style.SUCCESS("  ✓ Subjects and modules seeded"))

    def _seed_algebra_objective(self):
        from apps.subjects.models import LearningObjective, LearningResource, Module, PracticeQuestion, Subject

        maths = Subject.objects.get(slug="mathematics")
        module = Module.objects.get(subject=maths, order=1)
        objective, _created = LearningObjective.objects.get_or_create(
            module=module,
            slug="solve-one-step-equations",
            defaults={
                "title": "Solve one-step linear equations",
                "description": "Isolate the variable by applying the inverse operation to both sides.",
                "difficulty": "beginner",
                "status": "published",
                "order": 1,
            },
        )
        if objective.status != "published":
            objective.status = "published"
            objective.save(update_fields=["status"])

        LearningResource.objects.get_or_create(
            objective=objective,
            order=1,
            defaults={
                "title": "Inverse of addition",
                "source_label": "Algebra Fundamentals — inverse operations",
                "body": (
                    "To solve x + a = b, subtract a from both sides. "
                    "The inverse of addition is subtraction. "
                    "Do not add a again, and do not change the sign of x itself."
                ),
            },
        )
        PracticeQuestion.objects.get_or_create(
            objective=objective,
            order=1,
            defaults={
                "role": "diagnostic",
                "prompt": "Solve for x: x + 5 = 12. Reply with the value of x.",
                "acceptable_answers": ["7", "x=7", "x = 7"],
                "misconception_patterns": [
                    {
                        "key": "sign_error",
                        "answers": ["17", "+17", "x=17", "x = 17"],
                        "rationale": "The constant was added to the total instead of subtracted.",
                    },
                    {
                        "key": "flipped_variable",
                        "answers": ["-7", "x=-7", "x = -7"],
                        "rationale": "The sign of the variable was flipped instead of applying the inverse operation to the constant.",
                    },
                ],
                "hint": "Undo the addition of 5 by subtracting 5 from both sides. Keep the sign of x.",
                "remediation": (
                    "Adding 5 again, or flipping the sign of x, does not isolate the variable. "
                    "Addition is undone by subtraction: start from 12 and subtract 5. "
                    "Use that same inverse step on the next equation instead of copying a previous number."
                ),
                "worked_example": "For x + 2 = 9, subtract 2 from 9. The operation is applied to the constant.",
            },
        )
        PracticeQuestion.objects.get_or_create(
            objective=objective,
            order=2,
            defaults={
                "role": "practice",
                "prompt": "Solve for x: x + 6 = 15. Reply with the value of x.",
                "acceptable_answers": ["9", "x=9", "x = 9"],
                "misconception_patterns": [
                    {
                        "key": "sign_error",
                        "answers": ["21", "x=21", "x = 21"],
                        "rationale": "The constant was added instead of subtracted.",
                    },
                    {
                        "key": "copied_previous",
                        "answers": ["7", "x=7", "x = 7"],
                        "rationale": "The previous result was copied instead of solving the new equation.",
                    },
                ],
                "hint": "Subtract 6 from 15. Do not reuse the previous answer.",
                "remediation": (
                    "This is a new equation. Subtract the added constant, 6, from 15. "
                    "Copying an earlier result is not evidence that this equation was solved."
                ),
            },
        )
        PracticeQuestion.objects.get_or_create(
            objective=objective,
            order=3,
            defaults={
                "role": "mastery_check",
                "prompt": "Solve for x: x + 4 = 11. Reply with the value of x.",
                "acceptable_answers": ["7", "x=7", "x = 7"],
                "misconception_patterns": [
                    {
                        "key": "sign_error",
                        "answers": ["15", "x=15"],
                        "rationale": "The constant was added instead of subtracted.",
                    }
                ],
                "hint": "Subtract 4 from 11.",
                "remediation": "Subtract 4 from 11. Adding 4 moves farther from the value of x.",
            },
        )
        self.stdout.write(self.style.SUCCESS("  ✓ Algebra objective, source, and questions seeded"))

    def _seed_plans(self):
        from apps.subscriptions.models import Plan
        from decimal import Decimal

        plans_data = [
            {
                "name": "Explorer", "slug": "explorer", "order": 1,
                "monthly_price": Decimal("0.00"), "annual_price": Decimal("0.00"),
                "max_sessions_per_day": 3,
                "features": ["Every subject access", "Basic neural interactions", "Foundational trajectory", "Community vault access", "Standard STT/TTS models"],
            },
            {
                "name": "Adept", "slug": "adept", "order": 2,
                "monthly_price": Decimal("19.00"), "annual_price": Decimal("13.00"),
                "max_sessions_per_day": None,
                "features": ["Unlimited neural sessions", "Quantum-latency streaming", "Full catalog (Pro modules)", "Advanced neuro-analytics", "Emotional IQ integration", "Priority concierge access", "Custom mentor synthesis"],
            },
            {
                "name": "Command", "slug": "command", "order": 3,
                "monthly_price": Decimal("49.00"), "annual_price": Decimal("34.00"),
                "max_sessions_per_day": None,
                "features": ["Institutional bulk licensing", "LMS data synchronization", "Organizational metrics", "Custom curriculum design", "Identity SAML integration", "White-glove deployment"],
            },
        ]

        for data in plans_data:
            plan, created = Plan.objects.get_or_create(slug=data["slug"], defaults={**data, "is_active": True})
            if created:
                self.stdout.write(f"  + Plan: {plan.name}")

        self.stdout.write(self.style.SUCCESS("  ✓ Plans seeded"))

    def _create_admin(self, email, password):
        if not settings.DEBUG:
            self.stdout.write("  · Skipped admin seed because DEBUG is off. Development passwords are not created in production.")
            return
        self.stdout.write("  · Development-only admin seed.")
        if not User.objects.filter(email=email).exists():
            User.objects.create_superuser(email=email, password=password, full_name="Admin")
            self.stdout.write(self.style.SUCCESS(f"  ✓ Admin user created: {email} / {password}"))
        else:
            self.stdout.write(f"  ✓ Admin user already exists: {email}")
