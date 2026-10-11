from django.db.models import Q

from .models import Subject


def visible_subjects(user):
    """Platform subjects plus the signed-in user's own custom subjects."""
    platform = Q(owner__isnull=True, is_active=True, status="active")
    if getattr(user, "is_authenticated", False):
        return Subject.objects.filter(platform | Q(owner=user, status="active", is_active=True))
    return Subject.objects.filter(platform)
