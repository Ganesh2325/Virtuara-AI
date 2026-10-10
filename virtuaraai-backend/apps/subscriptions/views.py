from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Plan, Subscription
from .serializers import PlanSerializer, SubscriptionSerializer


class PlanListView(generics.ListAPIView):
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Plan.objects.filter(is_active=True).order_by("order")
    pagination_class = None  # plans are a small static list


class SubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sub = Subscription.objects.select_related("plan").get(user=request.user)
            return Response(SubscriptionSerializer(sub).data)
        except Subscription.DoesNotExist:
            return Response(None)

    def post(self, request):
        if Subscription.objects.filter(user=request.user).exists():
            return Response({"error": "Subscription already exists. Use PATCH to update."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = SubscriptionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        try:
            sub = Subscription.objects.get(user=request.user)
        except Subscription.DoesNotExist:
            return Response({"error": "No active subscription."}, status=status.HTTP_404_NOT_FOUND)
        serializer = SubscriptionSerializer(sub, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        try:
            sub = Subscription.objects.get(user=request.user)
            sub.cancel()
            return Response({"message": "Subscription cancelled."})
        except Subscription.DoesNotExist:
            return Response({"error": "No active subscription."}, status=status.HTTP_404_NOT_FOUND)
