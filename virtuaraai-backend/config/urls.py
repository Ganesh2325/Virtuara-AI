from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from .health import LiveView, ReadyView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/live/", LiveView.as_view(), name="health-live"),
    path("api/v1/health/ready/", ReadyView.as_view(), name="health-ready"),

    # API v1
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/subjects/", include("apps.subjects.urls")),
    path("api/v1/sessions/", include("apps.sessions.urls")),
    path("api/v1/subscriptions/", include("apps.subscriptions.urls")),
    path("api/v1/interviews/", include("apps.interviews.urls")),
    path("api/v1/voice/", include("apps.voice.urls")),
    path("api/v1/knowledge/", include("apps.knowledge.urls")),

    # API Docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
