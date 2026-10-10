from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = user.full_name
        token["is_email_verified"] = user.is_email_verified
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "full_name", "password", "password_confirm")

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "profile_picture", "is_email_verified", "date_joined")
        read_only_fields = ("id", "email", "is_email_verified", "date_joined")


class UserProfileSerializer(serializers.ModelSerializer):
    subject_ids = serializers.PrimaryKeyRelatedField(
        source="subjects",
        many=True,
        read_only=True,
    )

    class Meta:
        model = UserProfile
        fields = (
            "age_group", "learning_goal", "level", "subject_ids",
            "onboarding_complete", "total_sessions", "total_study_minutes",
            "streak_days", "last_session_date",
        )
        read_only_fields = ("total_sessions", "total_study_minutes", "streak_days", "last_session_date")


class OnboardingSerializer(serializers.ModelSerializer):
    subject_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )

    class Meta:
        model = UserProfile
        fields = ("age_group", "learning_goal", "level", "subject_ids")

    def update(self, instance, validated_data):
        subject_ids = validated_data.pop("subject_ids", [])
        if subject_ids:
            from apps.subjects.models import Subject
            instance.subjects.set(Subject.objects.filter(id__in=subject_ids))
        instance.onboarding_complete = True
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(validators=[validate_password])
