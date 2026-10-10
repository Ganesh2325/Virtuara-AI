from rest_framework import serializers
from .models import LearningObjective, LearningResource, Subject, Module


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ("id", "title", "description", "difficulty", "order", "estimated_minutes")


class SubjectSerializer(serializers.ModelSerializer):
    module_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subject
        fields = ("id", "name", "slug", "description", "icon", "category", "order", "module_count")


class LearningResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningResource
        fields = ("id", "title", "body", "source_label", "order")


class LearningObjectiveSerializer(serializers.ModelSerializer):
    module_title = serializers.CharField(source="module.title", read_only=True)
    resources = LearningResourceSerializer(many=True, read_only=True)

    class Meta:
        model = LearningObjective
        fields = ("id", "slug", "title", "description", "difficulty", "status", "order", "module_title", "resources")


class SubjectDetailSerializer(SubjectSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta(SubjectSerializer.Meta):
        fields = SubjectSerializer.Meta.fields + ("modules",)
