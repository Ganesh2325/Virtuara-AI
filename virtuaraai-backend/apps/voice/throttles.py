from rest_framework.throttling import UserRateThrottle


class VoiceTurnThrottle(UserRateThrottle):
    scope = "voice_turn"
