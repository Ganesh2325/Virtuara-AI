from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Email verification
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", views.ResendVerificationView.as_view(), name="resend-verification"),

    # Password
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="reset-password"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),

    # Profile
    path("me/", views.MeView.as_view(), name="me"),
    path("profile/", views.UserProfileView.as_view(), name="profile"),
    path("onboarding/", views.OnboardingView.as_view(), name="onboarding"),
]
