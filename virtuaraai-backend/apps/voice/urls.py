from django.urls import path

from apps.voice.views import (
    ConversationCollectionView,
    ConversationDetailView,
    GeneralStreamView,
    VoiceStatusView,
    VoiceTurnView,
)

urlpatterns = [
    path("status/", VoiceStatusView.as_view(), name="voice-status"),
    path("turns/", VoiceTurnView.as_view(), name="voice-turns"),
    path("general-stream/", GeneralStreamView.as_view(), name="voice-general-stream"),
    path("conversations/", ConversationCollectionView.as_view(), name="voice-conversations"),
    path(
        "conversations/<uuid:conversation_id>/",
        ConversationDetailView.as_view(),
        name="voice-conversation-detail",
    ),
]
