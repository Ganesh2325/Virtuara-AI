from .base import *

DEBUG = True

INSTALLED_APPS += ["django_extensions"]

# Show emails in console during dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Relax password validation in dev
AUTH_PASSWORD_VALIDATORS = []

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "DEBUG"},
    "loggers": {
        "django.db.backends": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
    },
}
