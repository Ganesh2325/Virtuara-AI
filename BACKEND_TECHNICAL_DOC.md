# Virtuara AI — Backend Technical Documentation

> **For internal team use.** Covers architecture, every API endpoint, database tables, and the data flow behind each operation.

---

## 1. Tech Stack & Infrastructure

| Layer | Technology |
|---|---|
| Framework | Django 4.x + Django REST Framework |
| Auth | JWT via `djangorestframework-simplejwt` |
| Database | PostgreSQL (`virtuara_db`) |
| Cache | Redis (db 0) |
| Task Queue | Celery + Redis broker (db 1), results (db 2) |
| Email | SMTP via Celery async tasks |
| API Docs | drf-spectacular (Swagger + ReDoc) |
| Static files | WhiteNoise |

The server starts with `manage.py` and Celery workers run separately. Both share the same `.env` file.

---

## 2. Project Structure

```
virtuaraai-backend/
├── config/
│   ├── settings/base.py      ← All settings (JWT, CORS, Celery, DB)
│   ├── urls.py               ← Root URL routing
│   └── celery.py             ← Celery app config
├── apps/
│   ├── accounts/             ← Users, auth, email verification
│   ├── subjects/             ← Subject catalogue + modules
│   ├── sessions/             ← Learning sessions, messages, analytics
│   └── subscriptions/        ← Plans and billing
└── utils/
    ├── email.py              ← Celery email tasks
    ├── pagination.py         ← Standard pagination (20/page)
    └── permissions.py        ← Custom DRF permission classes
```

---

## 3. Database Tables

### 3.1 `users` (app: accounts)

The custom user model. Uses UUID primary key, email as the login field (not username).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `email` | VARCHAR (unique, indexed) | Login credential |
| `full_name` | VARCHAR(200) | Required |
| `profile_picture` | ImageField | Stored under `media/avatars/` |
| `is_active` | BOOL | Default true |
| `is_staff` | BOOL | Django admin access |
| `is_email_verified` | BOOL | Default false, set true after email link clicked |
| `date_joined` | TIMESTAMP | Auto |
| `last_login` | TIMESTAMP | Updated by JWT on login |
| `password` | VARCHAR | Hashed (Django PBKDF2) |

---

### 3.2 `user_profiles` (app: accounts)

One-to-one with `users`. Stores learning preferences and aggregate stats. Created automatically on registration.

| Column | Type | Notes |
|---|---|---|
| `id` | INT (PK) | Auto |
| `user_id` | UUID (FK → users) | OneToOne |
| `age_group` | VARCHAR | Choices: under-18, 18-24, 25-34, 35-44, 45+ |
| `learning_goal` | TEXT | Free text |
| `level` | VARCHAR | beginner / intermediate / advanced |
| `onboarding_complete` | BOOL | Set true after onboarding POST |
| `total_sessions` | INT | Incremented on session complete |
| `total_study_minutes` | INT | Incremented on session complete |
| `streak_days` | INT | Auto-calculated on session complete |
| `last_session_date` | DATE | Tracks consecutive days |
| `created_at` / `updated_at` | TIMESTAMP | Auto |

**M2M relation:** `user_profiles` ↔ `subjects` via auto-created junction table `userprofile_subjects`.

---

### 3.3 `email_verification_tokens` (app: accounts)

One token per verification attempt. Expires in **24 hours**.

| Column | Type | Notes |
|---|---|---|
| `id` | INT (PK) | Auto |
| `user_id` | UUID (FK → users) | Cascade delete |
| `token` | UUID (unique) | Sent in email link |
| `created_at` | TIMESTAMP | Auto |
| `expires_at` | TIMESTAMP | created_at + 24h |
| `is_used` | BOOL | Marked true after verification |

---

### 3.4 `password_reset_tokens` (app: accounts)

Same shape as email tokens but expires in **1 hour**.

| Column | Type | Notes |
|---|---|---|
| `id` | INT (PK) | Auto |
| `user_id` | UUID (FK → users) | Cascade delete |
| `token` | UUID (unique) | Sent in reset email |
| `created_at` | TIMESTAMP | Auto |
| `expires_at` | TIMESTAMP | created_at + 1h |
| `is_used` | BOOL | Marked true after password change |

---

### 3.5 `subjects` (app: subjects)

Read-only catalogue of learning subjects. Seeded via management command.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto |
| `name` | VARCHAR(200) | Display name |
| `slug` | SlugField (unique) | URL-safe identifier (used as lookup field) |
| `description` | TEXT | Optional |
| `icon` | VARCHAR(10) | Emoji |
| `category` | VARCHAR | science / mathematics / humanities / technology / arts / business / languages |
| `is_active` | BOOL | Inactive subjects hidden from API |
| `order` | INT | Sort order |
| `created_at` | TIMESTAMP | Auto |

---

### 3.6 `modules` (app: subjects)

Ordered sub-units within a subject. Unique constraint on `(subject, order)`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto |
| `subject_id` | UUID (FK → subjects) | Cascade delete |
| `title` | VARCHAR(300) | |
| `description` | TEXT | |
| `difficulty` | VARCHAR | beginner / intermediate / advanced |
| `order` | INT | Position within subject |
| `estimated_minutes` | INT | Default 30 |
| `is_active` | BOOL | Default true |
| `created_at` | TIMESTAMP | Auto |

---

### 3.7 `learning_sessions` (app: sessions)

Core table. One row per AI tutoring/quiz/practice session.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto |
| `user_id` | UUID (FK → users) | Cascade delete |
| `subject_id` | UUID (FK → subjects, nullable) | SET NULL on subject delete |
| `module_id` | UUID (FK → modules, nullable) | SET NULL on module delete |
| `status` | VARCHAR | pending → active → completed / interrupted |
| `session_type` | VARCHAR | tutor / quiz / practice / review |
| `started_at` | TIMESTAMP | Auto on create |
| `ended_at` | TIMESTAMP | Set on complete() call |
| `duration_minutes` | INT | Calculated: ceil((ended_at − started_at) / 60) |
| `score` | SMALLINT | 0–100, optional |
| `ai_model` | VARCHAR | Defaults to `claude-sonnet-4-6` |
| `notes` | TEXT | Optional notes added at completion |

**Indexes:** `(user, status)` and `(user, started_at)` for fast filtering.

---

### 3.8 `session_messages` (app: sessions)

Chat history for a session. Ordered by `timestamp` ascending.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto |
| `session_id` | UUID (FK → learning_sessions) | Cascade delete |
| `role` | VARCHAR | user / assistant / system |
| `content` | TEXT | Message body |
| `timestamp` | TIMESTAMP | Auto |
| `tokens_used` | INT | Token count for this message |
| `is_flagged` | BOOL | Content moderation flag |

---

### 3.9 `session_analytics` (app: sessions)

One-to-one with `learning_sessions`. Created/updated when session is completed.

| Column | Type | Notes |
|---|---|---|
| `id` | INT (PK) | Auto |
| `session_id` | UUID (OneToOne → learning_sessions) | Cascade delete |
| `concepts_covered` | JSON | List of concept strings |
| `mastery_score` | FLOAT | 0.0–1.0 |
| `engagement_score` | FLOAT | 0.0–1.0 |
| `difficulty_level` | FLOAT | 0.0–1.0 |
| `improvement_areas` | JSON | List of strings |
| `summary` | TEXT | AI-generated session summary |
| `created_at` | TIMESTAMP | Auto |

---

### 3.10 `plans` (app: subscriptions)

Static pricing catalogue. 3 tiers: explorer / adept / command.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto |
| `name` | VARCHAR(100) | Display name |
| `slug` | VARCHAR (unique) | explorer / adept / command |
| `description` | TEXT | |
| `monthly_price` | DECIMAL(8,2) | |
| `annual_price` | DECIMAL(8,2) | |
| `features` | JSON | List of feature strings |
| `max_sessions_per_day` | INT (nullable) | null = unlimited |
| `is_active` | BOOL | |
| `order` | INT | Display order |
| `created_at` | TIMESTAMP | Auto |

---

### 3.11 `subscriptions` (app: subscriptions)

One-to-one with `users`. Created on first plan selection.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto |
| `user_id` | UUID (OneToOne → users) | Cascade delete |
| `plan_id` | UUID (FK → plans) | PROTECT (can't delete a plan with active subs) |
| `billing_cycle` | VARCHAR | monthly / annual |
| `status` | VARCHAR | trial / active / cancelled / expired / past_due |
| `trial_end_date` | TIMESTAMP | Optional |
| `current_period_start` | TIMESTAMP | Set on create/renewal |
| `current_period_end` | TIMESTAMP | +30 or +365 days |
| `cancelled_at` | TIMESTAMP | Set on cancel |
| `external_subscription_id` | VARCHAR | Stripe subscription ID (future use) |
| `created_at` / `updated_at` | TIMESTAMP | Auto |

**`is_active` property:** returns true if `status` is `active` or `trial` AND `current_period_end` is null or in the future.

---

## 4. Authentication Flow (JWT)

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

**Token config (from settings):**
- Access token lifetime: 60 minutes (configurable via `ACCESS_TOKEN_LIFETIME_MINUTES` env var)
- Refresh token lifetime: 30 days (configurable via `REFRESH_TOKEN_LIFETIME_DAYS` env var)
- Refresh rotation: enabled (each refresh issues a new refresh token)
- Blacklist after rotation: enabled (old refresh tokens are invalidated)
- Custom claims embedded in JWT payload: `email`, `full_name`, `is_email_verified`

---

## 5. API Endpoints — Full Reference

**Base URL:** `http://localhost:8000/api/v1/`
**API Docs:** `http://localhost:8000/api/docs/` (Swagger)

---

### 5.1 Auth — `/api/v1/auth/`

#### `POST /auth/register/`
**Auth:** None

**What it does:**
1. Validates `email`, `full_name`, `password`, `password_confirm`
2. Checks password match and Django's password validators
3. Creates `User` record + empty `UserProfile`
4. Creates an `EmailVerificationToken` (expires 24h)
5. Fires Celery task `send_verification_email` (async, max 3 retries)
6. Returns JWT access + refresh tokens immediately so the user can start using the app without waiting for email verification

**Tables written:** `users`, `user_profiles`, `email_verification_tokens`

**Response:**
```json
{
  "message": "Account created. Please verify your email.",
  "user": { "id", "email", "full_name", "profile_picture", "is_email_verified", "date_joined" },
  "tokens": { "access": "...", "refresh": "..." }
}
```

---

#### `POST /auth/login/`
**Auth:** None

**What it does:**
1. Validates `email` + `password`
2. Issues JWT access + refresh tokens
3. Embeds `email`, `full_name`, `is_email_verified` into token payload
4. Returns full user object alongside tokens

**Tables read:** `users`
**Tables written:** `users.last_login` (via `UPDATE_LAST_LOGIN: True` in JWT settings)

**Response:**
```json
{
  "access": "...",
  "refresh": "...",
  "user": { "id", "email", "full_name", ... }
}
```

---

#### `POST /auth/logout/`
**Auth:** Required

**What it does:**
1. Receives `refresh` token in body
2. Blacklists the refresh token via `rest_framework_simplejwt.token_blacklist`
3. After this, the refresh token cannot be used to get new access tokens

**Tables written:** `token_blacklist_blacklistedtoken` (Django JWT internal table)

---

#### `POST /auth/token/refresh/`
**Auth:** None (requires valid refresh token)

**What it does:**
1. Validates the incoming `refresh` token
2. Issues a new `access` token and a new `refresh` token (rotation)
3. Blacklists the old refresh token

---

#### `POST /auth/verify-email/`
**Auth:** None

**What it does:**
1. Receives `token` (UUID) from the email link
2. Looks up `EmailVerificationToken` record
3. Checks `is_valid`: not used AND not expired
4. Sets `user.is_email_verified = True`
5. Marks token as `is_used = True`

**Tables written:** `users`, `email_verification_tokens`

---

#### `POST /auth/resend-verification/`
**Auth:** Required

**What it does:**
1. Checks if user is already verified — returns early if so
2. Creates a new `EmailVerificationToken`
3. Fires Celery email task

**Tables written:** `email_verification_tokens`

---

#### `POST /auth/forgot-password/`
**Auth:** None

**What it does:**
1. Receives `email`
2. Looks up user — if not found, **still returns 200** (prevents user enumeration)
3. If user exists: creates `PasswordResetToken` (expires 1h), fires Celery email task

**Tables written:** `password_reset_tokens`

---

#### `POST /auth/reset-password/`
**Auth:** None

**What it does:**
1. Receives `token` (UUID) + `new_password`
2. Validates token: exists, not used, not expired
3. Sets new password (hashed via Django's `set_password`)
4. Marks token as used

**Tables written:** `users`, `password_reset_tokens`

---

#### `POST /auth/change-password/`
**Auth:** Required

**What it does:**
1. Receives `current_password` + `new_password`
2. Verifies `current_password` against stored hash
3. Sets new password

**Tables written:** `users`

---

#### `GET /auth/me/`
**Auth:** Required

Returns the logged-in user's details from the `users` table.

#### `PATCH /auth/me/`
**Auth:** Required

Updates `full_name` or `profile_picture` (email and ID are read-only).

**Tables written:** `users`

---

#### `GET /auth/profile/`
**Auth:** Required

Returns the user's `UserProfile`. Creates one if it somehow doesn't exist.

**Tables read:** `user_profiles`

#### `PATCH /auth/profile/`
**Auth:** Required

Updates `age_group`, `learning_goal`, `level`. Stats fields (`total_sessions`, `streak_days`, etc.) are read-only here.

**Tables written:** `user_profiles`

---

#### `POST /auth/onboarding/`
**Auth:** Required

**What it does:**
1. Receives `age_group`, `learning_goal`, `level`, and optional `subject_ids` (list of UUIDs)
2. Sets subjects on the user's profile via `.set()` (replaces existing selections)
3. Sets `onboarding_complete = True`

**Tables written:** `user_profiles`, `userprofile_subjects` (M2M junction)

---

### 5.2 Subjects — `/api/v1/subjects/`

Read-only catalogue. Only active subjects are returned.

#### `GET /subjects/`
**Auth:** Optional (read allowed for unauthenticated users)

Returns all active subjects with a `module_count` annotation. Supports:
- `?category=mathematics` — filter by category
- `?search=physics` — search name + description
- `?ordering=order` — sort by order or name

**Tables read:** `subjects` (+ COUNT of active modules via JOIN)

**Response** (list):
```json
[
  { "id", "name", "slug", "description", "icon", "category", "order", "module_count" }
]
```

---

#### `GET /subjects/{slug}/`
**Auth:** Optional

Returns a single subject by slug with full module list embedded.

**Tables read:** `subjects`, `modules`

---

#### `GET /subjects/{slug}/modules/`
**Auth:** Optional

Returns all active modules for a subject.

**Tables read:** `modules`

---

### 5.3 Sessions — `/api/v1/sessions/`

Scoped to the logged-in user — no user can access another user's sessions.

#### `GET /sessions/`
**Auth:** Required

Lists all sessions for the current user. Annotates each with `message_count`.

Supports:
- `?status=completed` — filter by status
- `?session_type=quiz` — filter by type
- `?subject=<uuid>` — filter by subject
- `?ordering=started_at` or `score` or `duration_minutes`

**Tables read:** `learning_sessions`, `subjects`, `modules`

---

#### `POST /sessions/`
**Auth:** Required

**What it does:**
1. Creates a new `LearningSession` with `status=pending`
2. Attaches to the logged-in user automatically
3. Client provides `subject` (UUID), optional `module` (UUID), `session_type`

**Tables written:** `learning_sessions`

---

#### `GET /sessions/{id}/`
**Auth:** Required

Returns full session detail including all messages and analytics.

**Tables read:** `learning_sessions`, `session_messages`, `session_analytics`, `subjects`, `modules`

---

#### `PATCH /sessions/{id}/`
**Auth:** Required

Partial update (e.g., change `status` to `active`, update `ai_model`).

**Tables written:** `learning_sessions`

---

#### `DELETE /sessions/{id}/`
**Auth:** Required

Deletes the session and all its messages/analytics (cascade).

**Tables deleted:** `learning_sessions` → cascades to `session_messages`, `session_analytics`

---

#### `POST /sessions/{id}/complete/`
**Auth:** Required

**What it does — this is the most important session endpoint:**

1. Checks session is not already completed
2. Calls `session.complete(score=...)`:
   - Sets `status = "completed"`
   - Sets `ended_at = now()`
   - Calculates `duration_minutes = ceil(seconds / 60)`
   - Optionally sets `score`
   - Saves the session
   - Calls `_update_user_stats()`:
     - Increments `profile.total_sessions += 1`
     - Adds `duration_minutes` to `profile.total_study_minutes`
     - Streak logic:
       - If `last_session_date == yesterday` → `streak_days += 1`
       - If `last_session_date != today` (and not yesterday) → `streak_days = 1` (reset)
       - If already studied today → no change
     - Updates `last_session_date = today`
3. If `notes` provided → saves to session
4. If `analytics` object provided → upserts `SessionAnalytics` record

**Body:**
```json
{
  "score": 85,
  "notes": "Covered Newton's laws",
  "analytics": {
    "concepts_covered": ["velocity", "acceleration"],
    "mastery_score": 0.82,
    "engagement_score": 0.9,
    "difficulty_level": 0.5,
    "improvement_areas": ["force diagrams"],
    "summary": "Student showed good understanding..."
  }
}
```

**Tables written:** `learning_sessions`, `user_profiles`, `session_analytics`

---

#### `GET /sessions/{id}/messages/`
**Auth:** Required

Returns all chat messages for a session, ordered by timestamp (oldest first).

**Tables read:** `session_messages`

---

#### `POST /sessions/{id}/messages/`
**Auth:** Required

Adds a new message to the session.

**Body:**
```json
{
  "role": "user",
  "content": "Can you explain Newton's second law?",
  "tokens_used": 14
}
```

**Tables written:** `session_messages`

---

#### `GET /sessions/stats/`
**Auth:** Required

Computes a dashboard summary for the current user:

- `total_sessions` — from `user_profiles.total_sessions`
- `total_study_minutes` — from `user_profiles.total_study_minutes`
- `streak_days` — from `user_profiles.streak_days`
- `average_score` — AVG of all completed sessions with a score
- `sessions_this_week` — COUNT of sessions started in last 7 days
- `favourite_subject` — subject name with highest session count

**Tables read:** `user_profiles`, `learning_sessions`

---

### 5.4 Subscriptions — `/api/v1/subscriptions/`

#### `GET /subscriptions/plans/`
**Auth:** Optional

Returns all active plans ordered by `order`. No pagination.

**Tables read:** `plans`

---

#### `GET /subscriptions/`
**Auth:** Required

Returns the user's current subscription with full plan details. Returns `null` if none exists.

**Tables read:** `subscriptions`, `plans`

---

#### `POST /subscriptions/`
**Auth:** Required

**What it does:**
1. Validates no existing subscription (one per user)
2. Sets `status = "active"`, `current_period_start = now()`
3. Sets `current_period_end = now() + 30 days` (monthly) or `+365 days` (annual)

**Body:**
```json
{
  "plan_id": "<plan-uuid>",
  "billing_cycle": "monthly"
}
```

**Tables written:** `subscriptions`

---

#### `PATCH /subscriptions/`
**Auth:** Required

Updates `plan_id` or `billing_cycle` on an existing subscription.

**Tables written:** `subscriptions`

---

#### `DELETE /subscriptions/`
**Auth:** Required

Calls `subscription.cancel()`:
- Sets `status = "cancelled"`
- Sets `cancelled_at = now()`

Does not delete the record — keeps history.

**Tables written:** `subscriptions`

---

## 6. Async Email Tasks (Celery)

Both tasks are defined in `utils/email.py` and use `@shared_task` with:
- `max_retries = 3`
- `default_retry_delay = 60` seconds

| Task | Trigger | Email sent |
|---|---|---|
| `send_verification_email(user_id, token)` | Registration, resend-verification | Verification link: `FRONTEND_URL/verify-email?token=<token>` |
| `send_password_reset_email(user_id, token)` | Forgot password | Reset link: `FRONTEND_URL/reset-password?token=<token>` |

Both send HTML + plaintext. The `FRONTEND_URL` env var controls the link destination.

---

## 7. Key Business Logic

### Session Completion & Streak Calculation

When `POST /sessions/{id}/complete/` is called:

```
Session saved
    └─ user_profiles.total_sessions += 1
    └─ user_profiles.total_study_minutes += duration_minutes
    └─ Streak logic:
        if last_session_date == yesterday  → streak_days += 1
        elif last_session_date != today    → streak_days = 1  (streak broken)
        else                               → no change (already counted today)
    └─ last_session_date = today
```

Django's `F()` expressions are used for the increments to avoid race conditions.

### Password Reset Anti-Enumeration

`POST /auth/forgot-password/` always returns HTTP 200 with the same message, whether or not the email exists. This prevents attackers from probing which emails are registered.

### Token Validity Check

Both `EmailVerificationToken` and `PasswordResetToken` share the same `is_valid` property:
```python
@property
def is_valid(self):
    return not self.is_used and self.expires_at > timezone.now()
```
A token fails if it's already used OR if it has expired.

---

## 8. CORS & Security Config

- CORS allowed origins: `http://localhost:3000`, `http://localhost:3002` (dev). Production origins via `CORS_ALLOWED_ORIGINS` env var.
- `CORS_ALLOW_CREDENTIALS = True` — required for browsers to send the `Authorization` header.
- CSRF middleware is active but JWT endpoints are exempt (DRF handles auth separately).
- Password policy: min 8 chars, not too common, not too similar to user attributes, not all numeric.

---

## 9. Environment Variables Summary

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | — | Django secret key |
| `DEBUG` | False | Debug mode |
| `DATABASE_URL` | postgres://virtuara_user:virtuara_pass@localhost:5432/virtuara_db | PostgreSQL connection |
| `REDIS_URL` | redis://localhost:6379/0 | Cache |
| `CELERY_BROKER_URL` | redis://localhost:6379/1 | Task queue |
| `CELERY_RESULT_BACKEND` | redis://localhost:6379/2 | Task results |
| `FRONTEND_URL` | http://localhost:3002 | Used in email links |
| `ACCESS_TOKEN_LIFETIME_MINUTES` | 60 | JWT access token TTL |
| `REFRESH_TOKEN_LIFETIME_DAYS` | 30 | JWT refresh token TTL |
| `CORS_ALLOWED_ORIGINS` | localhost:3000, 3002 | Allowed frontend origins |
| `EMAIL_BACKEND` | console (dev) | smtp.gmail.com in prod |
| `EMAIL_HOST_USER` | — | SMTP credentials |
| `EMAIL_HOST_PASSWORD` | — | SMTP credentials |
| `DEFAULT_FROM_EMAIL` | Virtuara AI <noreply@virtuara.ai> | Sender address |

---

## 10. Entity Relationship Summary

```
User (1) ──────────── (1) UserProfile
 │                          │
 │                          └─(M2M)─ Subject (1) ─── (N) Module
 │
 ├── (N) EmailVerificationToken
 ├── (N) PasswordResetToken
 ├── (1) Subscription ──── (N)── Plan
 └── (N) LearningSession ──────── Subject
          │                  └─── Module
          ├── (N) SessionMessage
          └── (1) SessionAnalytics
```
