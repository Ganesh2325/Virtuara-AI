from django.urls import path

from apps.voice.views import VoiceStatusView, VoiceTurnView

urlpatterns = [
    path("status/", VoiceStatusView.as_view(), name="voice-status"),
    path("turns/", VoiceTurnView.as_view(), name="voice-turns"),
]
