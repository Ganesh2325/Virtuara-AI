from django.core.cache import cache
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class LiveView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "live"})


class ReadyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        checks = {"database": "ok", "redis": "ok"}
        try:
            connection.ensure_connection()
        except Exception:
            checks["database"] = "error"
        try:
            cache.set("virtuara:ready", "1", 5)
            if cache.get("virtuara:ready") != "1":
                checks["redis"] = "error"
        except Exception:
            checks["redis"] = "error"
        ready = all(value == "ok" for value in checks.values())
        return Response({"status": "ready" if ready else "not_ready", "checks": checks}, status=200 if ready else 503)
