from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import get_user_model


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email(self, user_id, token):
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        send_mail(
            subject="Verify your Virtuara AI email",
            message=f"Hi {user.short_name},\n\nVerify your email:\n{verify_url}\n\nThis link expires in 24 hours.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=f"""
            <h2>Welcome to Virtuara AI, {user.short_name}!</h2>
            <p>Click below to verify your email address:</p>
            <a href="{verify_url}" style="background:#5C4100;color:#F5F0E8;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Verify Email
            </a>
            <p>This link expires in 24 hours.</p>
            """,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email(self, user_id, token):
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_mail(
            subject="Reset your Virtuara AI password",
            message=f"Hi {user.short_name},\n\nReset your password:\n{reset_url}\n\nThis link expires in 1 hour.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=f"""
            <h2>Password Reset — Virtuara AI</h2>
            <p>You requested a password reset. Click below:</p>
            <a href="{reset_url}" style="background:#5C4100;color:#F5F0E8;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Reset Password
            </a>
            <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
            """,
        )
    except Exception as exc:
        raise self.retry(exc=exc)
