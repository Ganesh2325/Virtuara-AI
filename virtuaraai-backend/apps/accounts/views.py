from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .models import EmailVerificationToken, PasswordResetToken, UserProfile
from .serializers import (
    RegisterSerializer, UserSerializer, UserProfileSerializer,
    OnboardingSerializer, ChangePasswordSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer,
    CustomTokenObtainPairSerializer,
)
from utils.email import send_verification_email, send_password_reset_email

User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Send verification email async
        token = EmailVerificationToken.objects.create(user=user)
        send_verification_email.delay(user.id, str(token.token))

        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "Account created. Please verify your email.",
            "user": UserSerializer(user).data,
            "tokens": {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logged out successfully."})
        except Exception:
            return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class OnboardingView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=OnboardingSerializer, responses={200: UserProfileSerializer})
    def post(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = OnboardingSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(UserProfileSerializer(profile).data)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_value = request.data.get("token")
        if not token_value:
            return Response({"error": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = EmailVerificationToken.objects.select_related("user").get(token=token_value)
        except EmailVerificationToken.DoesNotExist:
            return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)

        if not token.is_valid:
            return Response({"error": "Token has expired or already been used."}, status=status.HTTP_400_BAD_REQUEST)

        token.user.is_email_verified = True
        token.user.save(update_fields=["is_email_verified"])
        token.is_used = True
        token.save(update_fields=["is_used"])
        return Response({"message": "Email verified successfully."})


class ResendVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_email_verified:
            return Response({"message": "Email already verified."})
        token = EmailVerificationToken.objects.create(user=user)
        send_verification_email.delay(user.id, str(token.token))
        return Response({"message": "Verification email sent."})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        # Always return 200 to prevent user enumeration
        try:
            user = User.objects.get(email=email)
            token = PasswordResetToken.objects.create(user=user)
            send_password_reset_email.delay(user.id, str(token.token))
        except User.DoesNotExist:
            pass
        return Response({"message": "If this email exists, a reset link has been sent."})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = PasswordResetToken.objects.select_related("user").get(
                token=serializer.validated_data["token"]
            )
        except PasswordResetToken.DoesNotExist:
            return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)

        if not token.is_valid:
            return Response({"error": "Token has expired or already been used."}, status=status.HTTP_400_BAD_REQUEST)

        token.user.set_password(serializer.validated_data["new_password"])
        token.user.save(update_fields=["password"])
        token.is_used = True
        token.save(update_fields=["is_used"])
        return Response({"message": "Password reset successfully."})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"message": "Password changed successfully."})
