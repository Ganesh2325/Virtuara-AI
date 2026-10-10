from django.contrib import admin
from .models import LearningObjective, LearningResource, PracticeQuestion, Subject, Module


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0
    fields = ("title", "difficulty", "order", "estimated_minutes", "is_active")


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_active", "order")
    list_filter = ("category", "is_active")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ModuleInline]
    ordering = ("order", "name")


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("title", "subject", "difficulty", "order", "is_active")
    list_filter = ("difficulty", "is_active", "subject")
    search_fields = ("title", "subject__name")
    ordering = ("subject", "order")


class PracticeQuestionInline(admin.TabularInline):
    model = PracticeQuestion
    extra = 0


@admin.register(LearningObjective)
class LearningObjectiveAdmin(admin.ModelAdmin):
    list_display = ("title", "module", "status", "difficulty", "order")
    list_filter = ("status", "difficulty")
    search_fields = ("title", "slug")
    inlines = [PracticeQuestionInline]


@admin.register(LearningResource)
class LearningResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "objective", "source_label", "order")
