from django.urls import path

from .views import KnowledgeSourceDetailView, KnowledgeSourceListView, WebResearchStatusView

urlpatterns = [
    path("sources/", KnowledgeSourceListView.as_view(), name="knowledge-sources"),
    path("sources/<uuid:source_id>/", KnowledgeSourceDetailView.as_view(), name="knowledge-source-detail"),
    path("research/", WebResearchStatusView.as_view(), name="knowledge-research"),
]
