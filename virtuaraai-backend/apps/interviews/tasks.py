from celery import shared_task

from apps.interviews.parsing import extract_text, parse_profile


@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def parse_resume_task(self, resume_id: str):
    from apps.interviews.models import Resume

    resume = Resume.objects.get(pk=resume_id)
    try:
        resume.file.open("rb")
        data = resume.file.read()
        text = extract_text(resume.original_name, data)
        profile, error = parse_profile(text)
        resume.extracted_text = text[:20000]
        if profile is None:
            resume.status = "failed"
            resume.profile = {}
            resume.error = error
        else:
            resume.status = "ready"
            resume.profile = profile
            resume.error = ""
        resume.save()
    except Exception as exc:
        if self.request.retries < self.max_retries and not isinstance(exc, ValueError):
            raise self.retry(exc=exc)
        resume.status = "failed"
        resume.error = "The resume could not be read. Upload a text, PDF, or DOCX file with selectable text."
        resume.save(update_fields=["status", "error", "updated_at"])
    return resume.status
