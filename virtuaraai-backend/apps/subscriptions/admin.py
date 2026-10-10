from django.contrib import admin
from .models import Plan, Subscription


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "monthly_price", "annual_price", "is_active", "order")
    list_filter = ("is_active",)
    ordering = ("order",)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "billing_cycle", "status", "current_period_end", "created_at")
    list_filter = ("status", "billing_cycle", "plan")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")
