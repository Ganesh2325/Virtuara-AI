from django.urls import path

from apps.interviews.views import (
    InterviewAbortView,
    InterviewAnswerView,
    InterviewCollectionView,
    InterviewDetailView,
    InterviewReportView,
    ResumeDetailView,
    ResumeUploadView,
)

urlpatterns = [
    path("resumes/", ResumeUploadView.as_view(), name="resume-upload"),
    path("resumes/<uuid:resume_id>/", ResumeDetailView.as_view(), name="resume-detail"),
    path("sessions/", InterviewCollectionView.as_view(), name="interview-sessions"),
    path("sessions/<uuid:session_id>/", InterviewDetailView.as_view(), name="interview-detail"),
    path("sessions/<uuid:session_id>/answers/", InterviewAnswerView.as_view(), name="interview-answer"),
    path("sessions/<uuid:session_id>/abort/", InterviewAbortView.as_view(), name="interview-abort"),
    path("sessions/<uuid:session_id>/report/", InterviewReportView.as_view(), name="interview-report"),
]
