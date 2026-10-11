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


class ProfileSubjectSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()
    icon = serializers.CharField()
    is_custom = serializers.SerializerMethodField()

    def get_is_custom(self, subject):
        return subject.owner_id is not None


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    subject_ids = serializers.PrimaryKeyRelatedField(
        source="subjects",
        many=True,
        read_only=True,
    )
    subjects = ProfileSubjectSerializer(many=True, read_only=True)

    class Meta:
        model = UserProfile
        fields = (
            "full_name", "email", "age_group", "learning_goal", "level",
            "subject_ids", "subjects", "onboarding_complete", "total_sessions",
            "total_study_minutes", "streak_days", "last_session_date",
        )
        read_only_fields = ("total_sessions", "total_study_minutes", "streak_days", "last_session_date")


class OnboardingSerializer(serializers.ModelSerializer):
    subject_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=200)
    custom_subject_name = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=200)
    custom_subject_description = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=2000)
    custom_subjects = serializers.ListField(
        child=serializers.CharField(max_length=200), write_only=True, required=False
    )

    class Meta:
        model = UserProfile
        fields = (
            "age_group", "learning_goal", "level", "subject_ids", "full_name",
            "custom_subject_name", "custom_subject_description", "custom_subjects",
        )

    def update(self, instance, validated_data):
        from apps.subjects.models import Subject
        from apps.subjects.views import _unique_slug

        subject_ids = validated_data.pop("subject_ids", [])
        custom_names = [name.strip() for name in validated_data.pop("custom_subjects", [])]
        single_name = validated_data.pop("custom_subject_name", "").strip()
        custom_description = validated_data.pop("custom_subject_description", "").strip()
        full_name = validated_data.pop("full_name", "").strip()
        if full_name:
            instance.user.full_name = full_name
            instance.user.save(update_fields=["full_name"])
        if single_name:
            custom_names.append(single_name)
        chosen = list(Subject.objects.filter(id__in=subject_ids, owner__isnull=True))
        level = validated_data.get("level", instance.level)
        goal = validated_data.get("learning_goal", instance.learning_goal)
        for name in dict.fromkeys(name for name in custom_names if len(name) >= 2):
            custom = Subject.objects.create(
                name=name,
                slug=_unique_slug(name),
                description=custom_description,
                owner=instance.user,
                learning_goal=goal or "",
                experience_level=level or "",
                icon="📘",
                category="humanities",
            )
            chosen.append(custom)
        if chosen:
            instance.subjects.set(chosen)
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
