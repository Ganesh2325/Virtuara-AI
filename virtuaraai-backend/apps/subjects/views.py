from django.db.models import Count
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import LearningObjective, Subject, Module
from .serializers import (
    SubjectSerializer, SubjectDetailSerializer, ModuleSerializer, LearningObjectiveSerializer,
)


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None  # subjects are a small static catalogue
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["order", "name"]
    lookup_field = "slug"

    def get_queryset(self):
        return Subject.objects.filter(is_active=True).annotate(
            module_count=Count("modules", filter=__import__("django.db.models", fromlist=["Q"]).Q(modules__is_active=True))
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SubjectDetailSerializer
        return SubjectSerializer

    @action(detail=True, url_path="modules")
    def modules(self, request, slug=None):
        subject = self.get_object()
        modules = Module.objects.filter(subject=subject, is_active=True)
        serializer = ModuleSerializer(modules, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="objectives")
    def objectives(self, request, slug=None):
        subject = self.get_object()
        objectives = (
            LearningObjective.objects.filter(module__subject=subject, status="published", module__is_active=True)
            .select_related("module")
            .prefetch_related("resources")
        )
        return Response(LearningObjectiveSerializer(objectives, many=True).data)

    @action(detail=True, methods=["get"], url_path=r"objectives/(?P<objective_slug>[^/.]+)")
    def objective_detail(self, request, slug=None, objective_slug=None):
        subject = self.get_object()
        objective = (
            LearningObjective.objects.filter(
                module__subject=subject, slug=objective_slug, status="published"
            )
            .select_related("module")
            .prefetch_related("resources")
            .first()
        )
        if objective is None:
            return Response({"error": "Objective not found."}, status=404)
        return Response(LearningObjectiveSerializer(objective).data)
