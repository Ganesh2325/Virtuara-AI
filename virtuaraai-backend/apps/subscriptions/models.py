import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Plan(models.Model):
    PLAN_NAMES = [
        ("explorer", "Explorer"),
        ("adept", "Adept"),
        ("command", "Command"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=50, choices=PLAN_NAMES, unique=True)
    description = models.TextField(blank=True)
    monthly_price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    annual_price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    features = models.JSONField(default=list, help_text="List of feature strings")
    max_sessions_per_day = models.PositiveIntegerField(null=True, blank=True, help_text="null = unlimited")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "plans"
        ordering = ["order"]

    def __str__(self):
        return self.name


class Subscription(models.Model):
    BILLING_CYCLES = [("monthly", "Monthly"), ("annual", "Annual")]
    STATUSES = [
        ("trial", "Trial"),
        ("active", "Active"),
        ("cancelled", "Cancelled"),
        ("expired", "Expired"),
        ("past_due", "Past Due"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    billing_cycle = models.CharField(max_length=10, choices=BILLING_CYCLES, default="monthly")
    status = models.CharField(max_length=20, choices=STATUSES, default="trial")
    trial_end_date = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    external_subscription_id = models.CharField(max_length=200, blank=True, help_text="Stripe subscription ID")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"

    def __str__(self):
        return f"{self.user.email} → {self.plan.name} ({self.status})"

    @property
    def is_active(self):
        return self.status in ("active", "trial") and (
            self.current_period_end is None or self.current_period_end > timezone.now()
        )

    def cancel(self):
        self.status = "cancelled"
        self.cancelled_at = timezone.now()
        self.save(update_fields=["status", "cancelled_at"])
