from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomSubjectDetailView, CustomSubjectView, FollowSubjectView, SubjectViewSet

router = DefaultRouter()
router.register("", SubjectViewSet, basename="subject")

urlpatterns = [
    path("follow/", FollowSubjectView.as_view(), name="subject-follow"),
    path("custom/", CustomSubjectView.as_view(), name="custom-subject-create"),
    path("custom/<uuid:subject_id>/", CustomSubjectDetailView.as_view(), name="custom-subject-detail"),
    path("", include(router.urls)),
]
