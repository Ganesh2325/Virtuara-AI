from rest_framework import serializers
from .models import Plan, Subscription


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ("id", "name", "slug", "description", "monthly_price",
                  "annual_price", "features", "max_sessions_per_day")


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    plan_id = serializers.PrimaryKeyRelatedField(
        queryset=Plan.objects.filter(is_active=True),
        write_only=True, source="plan",
    )
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id", "plan", "plan_id", "billing_cycle", "status",
            "trial_end_date", "current_period_start", "current_period_end",
            "is_active", "created_at",
        )
        read_only_fields = (
            "id", "status", "trial_end_date", "current_period_start",
            "current_period_end", "is_active", "created_at",
        )

    def create(self, validated_data):
        from datetime import timedelta
        from django.utils import timezone
        validated_data["user"] = self.context["request"].user
        validated_data["status"] = "active"
        validated_data["current_period_start"] = timezone.now()
        days = 365 if validated_data.get("billing_cycle") == "annual" else 30
        validated_data["current_period_end"] = timezone.now() + timedelta(days=days)
        return super().create(validated_data)
