from django.db.models import Count, Q
from django.utils.text import slugify
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.models import UserProfile

from .access import visible_subjects
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
        return visible_subjects(self.request.user).annotate(
            module_count=Count("modules", filter=Q(modules__is_active=True))
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


def _unique_slug(name: str) -> str:
    base = (slugify(name) or "subject")[:80]
    slug = base
    suffix = 2
    while Subject.objects.filter(slug=slug).exists():
        slug = f"{base}-{suffix}"[:120]
        suffix += 1
    return slug


class FollowSubjectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        subject = visible_subjects(request.user).filter(
            pk=request.data.get("subject_id"), owner__isnull=True, status="active"
        ).first()
        if subject is None:
            return Response({"error": "That subject is unavailable."}, status=404)
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.subjects.add(subject)
        return Response(SubjectSerializer(subject).data)


class CustomSubjectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = str(request.data.get("name") or "").strip()[:200]
        if len(name) < 2:
            return Response({"error": "Enter a subject name."}, status=400)
        subject = Subject.objects.create(
            name=name,
            slug=_unique_slug(name),
            description=str(request.data.get("description") or "").strip()[:2000],
            category="humanities",
            icon="📘",
            owner=request.user,
            experience_level=str(request.data.get("level") or "").strip()[:20],
            learning_goal=str(request.data.get("learning_goal") or "").strip()[:2000],
        )
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.subjects.add(subject)
        return Response(SubjectSerializer(subject).data, status=201)


class CustomSubjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, subject_id):
        subject = Subject.objects.filter(pk=subject_id, owner=request.user).first()
        if subject is None:
            return Response({"error": "That custom subject is unavailable."}, status=404)
        if "name" in request.data:
            subject.name = str(request.data.get("name") or "").strip()[:200]
        if "description" in request.data:
            subject.description = str(request.data.get("description") or "").strip()[:2000]
        if "learning_goal" in request.data:
            subject.learning_goal = str(request.data.get("learning_goal") or "").strip()[:2000]
        if request.data.get("status") == "archived":
            subject.status = "archived"
            subject.is_active = False
        subject.save()
        return Response(SubjectSerializer(subject).data)

    def delete(self, request, subject_id):
        subject = Subject.objects.filter(pk=subject_id, owner=request.user).first()
        if subject is None:
            return Response({"error": "Platform subjects cannot be deleted here."}, status=404)
        subject.delete()
        return Response(status=204)
