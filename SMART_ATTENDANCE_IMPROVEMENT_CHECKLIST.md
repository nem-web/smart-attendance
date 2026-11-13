# Smart Attendance — Improvement & Development Checklist

**Project:** [nem-web/smart-attendance](https://github.com/nem-web/smart-attendance)  
**Deployed frontend:** https://studentcheck.vercel.app/  
**Updated:** 13 November 2026  
**Status:** Planning and code review; items unchecked until fixed and tested.

> **How to use:** Check an item only when the code change is merged **and** tested locally and in production. Priorities: P0 = security/data integrity/blocker; P1 = broken core workflow; P2 = important usability; P3 = optional expansion. A repository implementation is not the same as a verified working feature.

## Current situation and objectives

- Dual teacher/student portal with attendance, subject management, dashboards and analytics exists in the repository.
- Attendance collection uses face-recognition and QR-related workflows; reliable identity/liveness validation still requires real-world tests.
- Reported production failures: messaging email not sending, ML not working, slow/cold backend responses, missing skeleton loaders and apparent full-page refreshes in Messaging, Schedule and Analytics.
- Student portal requires a dedicated functionality, usability, reliability and mobile-accessibility pass; individual faults beyond those reported are not yet confirmed.
- **Near-term goal:** make existing features reliable and secure before building additional large features.

## Phase 0 — P0: production access, security and integrity

- [ ] **P0 / CORS:** Read actual `CORS_ORIGINS` from the running backend; confirm `https://studentcheck.vercel.app` is included. Environment values replace defaults in `app/core/config.py`.
- [ ] **P0 / CORS:** Remove the custom unconditional `OPTIONS` response middleware in `server/backend-api/app/main.py`; allow FastAPI `CORSMiddleware` to handle preflight and check the middleware wrapping order.
- [ ] **P0 / CORS:** Test normal GET and authenticated POST/OPTIONS; verify `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, and credential behavior. Test a disallowed origin as well.
- [ ] **P0 / Socket.IO:** Verify Socket.IO's `cors_allowed_origins=ORIGINS`, connection authorization, origin matching and transports on Render/Vercel. A passing REST request does not verify sockets.
- [ ] **P0 / Deployment:** Confirm frontend `VITE_API_URL` points to the correct live backend; ensure the backend and ML URL/ports are not accidentally reversed. Rebuild/redeploy Vercel when build-time `VITE_` values change.
- [ ] **P0 / Credentials:** Rotate any JWT/API keys that were exposed in chats, issue trackers or commits; ensure production secrets are never bundled in the frontend.
- [ ] **P0 / Session security:** Remove `SESSION_SECRET_KEY` development fallback in production; set appropriate secure cookies and test the Google OAuth callback flow. Avoid cross-site cookies unless necessary.
- [ ] **P0 / Authorization:** Audit teacher-only routes, especially attendance confirmation and session stop, for auth, teacher ownership, subject ownership and students' data isolation.
- [ ] **P0 / QR data integrity:** A scan flagged as suspected proxy must not automatically produce a `Present` record or increase confirmed attendance; use `Rejected`/`Pending Review` as appropriate.
- [ ] **P0 / Socket event trust:** Authenticate `connect`, `join_session`, `student_scan`, `process_frame`; derive student/teacher identity from verified auth, not client-provided IDs. Verify session ownership and enrollment in database.
- [ ] **P0 / Duplicate attendance:** Use atomic operations plus a unique index for `(session_id, student_id)` or the canonical equivalent; handle simultaneous duplicate requests.
- [ ] **P0 / Fail-safe:** When identity, liveness, session validation, or ML is unavailable, never auto-confirm biometric attendance; offer a teacher-approved alternative.

## Phase 1 — P1: repair currently broken workflows

### ML / face recognition
- [ ] Confirm the ML service starts and its authenticated health endpoint returns success on Render.
- [ ] Configure identical `ML_API_KEY` values in backend and ML service, and verify the backend sends `X-API-Key`; no default development key in production.
- [ ] Verify `ML_SERVICE_URL`, timeout, retry behavior, Render startup logs, media/model assets and dependency versions.
- [ ] Investigate ML routes where `np.array(image)` references an undefined `image` instead of decoded `image_np` (previous code review); add endpoint tests.
- [ ] Verify enrollment, detection, encoding, matching and frame processing one by one with a permitted test subject.
- [ ] Stop using flattened grayscale face crops as the production identity embedding; evaluate a properly licensed pretrained embedding model (SFace or ArcFace) and recalibrate similarity thresholds.
- [ ] Plan compatible migration/re-enrollment when changing embedding models; never compare incompatible old/new embeddings.
- [ ] Fix RGB/BGR assumptions between face pipeline and liveness module.
- [ ] Provide ML connection status and clear recoverable errors in the teacher UI, rather than infinite loading.

### Messaging / email
- [ ] Determine whether messaging fails at frontend validation, backend endpoint, queue, provider authentication, provider API, or recipient delivery.
- [ ] Check deployed Brevo environment variables (`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`) and compare to the *actual* email service used. README also references SMTP, so do not blindly set one provider's variables for another.
- [ ] Validate sender/domain authentication (SPF/DKIM as required), account status, quotas and suppression/bounce lists; check HTTP status and provider response without logging secrets.
- [ ] Add explicit send states (sending/sent/failed), safe retry, idempotency key and meaningful error messages.
- [ ] Provide a test-send function and send-delivery audit entries (request ID, destination masked, provider status), without exposing private content.
- [ ] Confirm authorization and consent/preferences before sending bulk emails.

### Messaging, Schedule and Analytics page refresh/performance
- [ ] Reproduce each navigation and distinguish browser document reload from React component unmount or broad loading-state replacement.
- [ ] Replace internal `<a href>` and `window.location` navigation with React Router `Link`/`navigate` where appropriate; verify the root layout does not remount unnecessarily.
- [ ] Keep headers, sidebar, navigation and last successful data mounted during background refetches.
- [ ] Add per-panel skeletons for Messaging, Schedule and Analytics (cards, tables, charts) with matching layout geometry; avoid skeletonizing the entire page for minor updates.
- [ ] Use TanStack Query cache, stale time, appropriate query keys, placeholder/previous data and mutation invalidation rather than repeated full refetches.
- [ ] Add separate loading, empty, error, offline and retry states; avoid UI flicker and duplicated requests.
- [ ] Audit chart re-renders, expensive table lists, suspense boundaries, lazy routes and background refresh timing.

## Phase 2 — P1/P2: student portal improvements

### Functional verification / account
- [ ] Audit student login/logout, expired JWT handling, forgotten-password/OTP/device binding and account recovery.
- [ ] Verify a student cannot fetch another student's profile, subjects, attendance, or messages by changing an ID in a request.
- [ ] Display clear enrollment status and assigned subjects; explain missing subjects/records.
- [ ] Make profile edits validated, save without a full-page reload, and provide success/error feedback.
- [ ] Show clear camera, location and notification permission prompts only when those capabilities are needed.

### Student dashboard
- [ ] Show overall percentage, total conducted/attended/missed classes, per-subject rates and last updated timestamp.
- [ ] Display safe/at-risk subject status using configurable attendance rules (not hard-coded policy for every institution).
- [ ] Add **classes needed to reach minimum percentage** and **how many classes can be missed before falling below it**; calculate carefully from conducted/attended counts and policy.
- [ ] Ensure charts match actual records and correctly handle zero classes, cancelled sessions and late edits.
- [ ] Support clear filter by subject, timeframe and status; provide accessible mobile chart/table alternatives.

### Attendance history and transparency
- [ ] Show date, time, subject, teacher/session, source (face/QR/manual), verification status and any correction.
- [ ] Differentiate Present, Absent, Late, Pending Review, Rejected and Cancelled consistently across UI and database.
- [ ] Provide understandable reason and appeal flow when an attendance event is rejected/incorrect, without leaking internal anti-spoof thresholds.
- [ ] Add an attendance correction request with explanation, teacher approval/rejection and audit trail; no direct student-controlled alteration.
- [ ] Explain why forecast/projections change; display assumptions and label projections separately from recorded attendance.

### Timetable, notices and notifications
- [ ] Show upcoming classes with accurate local timezone and date, holiday/cancellation indicators and last-minute changes.
- [ ] Support read/unread notices and role/subject-scoped announcements; do not send duplicate pushes/emails.
- [ ] Add configurable low-attendance alerts and notification preferences; provide accessible in-app notifications even when email fails.
- [ ] Design mobile-first layout, sticky relevant navigation, touch-friendly controls, empty states and responsive tables.
- [ ] Add skeletons to student pages; preserve previous data and maintain navigation while data loads.
- [ ] Test keyboard navigation, contrast, screen readers, reduced motion and smaller screens.
- [ ] Provide secure student data export and a clear retention/deletion process for sensitive biometric data.

## Phase 3 — P1: anti-proxy and trusted attendance

- [ ] Map abuse cases: photo print, photo on phone, replay video, QR forwarded to absent student, reused session, GPS spoofing and shared credentials.
- [ ] Separate **identity matching**, **liveness/anti-spoofing**, **session eligibility** and **attendance confirmation** into explicit server-side decisions.
- [ ] Replace image sharpness/color diversity/Face Mesh presence as sole liveness proof with an evaluated passive anti-spoof model.
- [ ] Add multi-frame tracking and temporal consistency; only accept a face after stable identity and liveness across a reasonable observation window.
- [ ] Add optional randomized challenge (e.g. head movement) for individual or uncertain scans; do not make a whole classroom perform challenges simultaneously.
- [ ] Use teacher-controlled verified sessions and prevent client payloads from asserting arbitrary attendance identity.
- [ ] Generate signed, short-lived, one-time or rotating QR tokens bound to server-side attendance sessions; reject replay and expired tokens.
- [ ] Treat device binding, GPS and IP as risk signals, not proof of human presence; implement accessible fallback and appeals.
- [ ] Rate limit verification, log suspicious attempts minimally, and protect biometric templates with restricted access and retention limits.
- [ ] Test real faces, glasses, low-light, print photos, phone displays, prerecorded videos, and look-alike people with consenting participants.
- [ ] Quantify false accepts, false rejects, attack success and inference latency before enabling automatic acceptance.

## Phase 4 — P2: teacher portal and platform UX

- [ ] Optimize class creation, timetable editing, subject enrollment and bulk student import with good validation.
- [ ] Add clear session start/stop workflow, camera/ML indicators, live counts and teacher-confirmed manual fallback.
- [ ] Add actionable attendance exception queue (uncertain face, suspicious QR, incorrect record), with approvals and audit entries.
- [ ] Add filters, pagination and exports for attendance history/analytics; verify figures reconcile with raw records.
- [ ] Improve messaging recipient selection, templates, send preview and status tracking.
- [ ] Add proper skeletons, modal loading, button disabled states, optimistic UI only where safe, and toast/error handling.
- [ ] Add a shared page shell and consistent form/table/chart primitives rather than reimplementing screens separately.

## Phase 5 — P1/P2: infrastructure, performance and observability

- [ ] Trace slow requests and separate Render cold starts, MongoDB connection time, ML inference, network overhead and frontend rendering.
- [ ] Add readiness/liveness checks for backend, MongoDB and ML; don't report healthy when dependencies required for core workflows are unavailable.
- [ ] Avoid relying on browser ping to permanently keep free Render services awake; show startup status, timeouts and retry UX. Consider an always-on plan only if justified.
- [ ] Use HTTP connection reuse, selective caching, MongoDB indexes, pagination and batch requests.
- [ ] Ensure socket reconnect/room reauthorization and robust cleanup after service sleep or redeploy.
- [ ] Add request IDs, structured server logs, exception alerts, email delivery status and privacy-aware performance metrics.
- [ ] Add unit/integration/E2E tests for role authorization, attendance integrity, email, socket reconnection, front-end navigation and CORS preflight.
- [ ] Run realistic load tests with simultaneous students and periodic ML inference; benchmark before setting capacity expectations.
- [ ] Ensure backup/restore, secret rotation, dependency vulnerability checks and a rollback strategy.

## Phase 6 — worthwhile features after the core is stable

### Strong candidates (build in this order)
- [ ] **Attendance corrections and appeals:** student request, teacher review, recorded reason and immutable audit trail.
- [ ] **Attendance planning:** minimum-attendance calculator, upcoming-class scenarios and accurate per-subject alerts.
- [ ] **Session-level reliability:** substitute teacher, late-arrival rules, class cancellation, offline temporary capture followed by authenticated reconciliation.
- [ ] **Teacher exception dashboard:** one place for low-confidence recognition, QR anomalies and ML outages.
- [ ] **Notification center:** in-app notices first, then reliable email and optional push.
- [ ] **Institution policy settings:** different attendance thresholds, session lengths and approval permissions.

### Defer until genuine demand
- [ ] Parent portal, multi-institution administration, exam-hall mode, third-party integrations, native mobile app.
- [ ] Do **not** prioritize blockchain attendance records, a marketplace, or complicated AI predictions while authentication and attendance integrity still have unresolved issues.

## CORS troubleshooting playbook (specific to this repository)

### Current code locations

- `server/backend-api/app/core/config.py`: `DEFAULT_ORIGINS`, `CORS_ORIGINS`, `ORIGINS`.
- `server/backend-api/app/main.py`: `CORSMiddleware`; custom `@app.middleware("http")` that answers all `OPTIONS` requests; `SessionMiddleware`.
- `server/backend-api/app/services/attendance_socket_service.py`: Socket.IO `cors_allowed_origins=ORIGINS` and `cors_credentials=True`.

### Recommended deployment values

```dotenv
# Render / backend API: comma-separated exact FRONTEND origins; no paths/slashes
CORS_ORIGINS=https://studentcheck.vercel.app,http://localhost:5173
# Vercel / frontend: backend API BASE URL, not the frontend URL
VITE_API_URL=https://YOUR-ACTUAL-BACKEND.onrender.com
```

If using a custom frontend domain, add it explicitly. In production, avoid adding API/ML hostnames to the allowed frontend origin list unless they truly serve browser applications.

### Reference FastAPI configuration (adapt existing app, do not duplicate middleware)

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)
```

1. Remove the unconditional `OPTIONS` middleware from `main.py`; let CORSMiddleware respond to preflights with the proper headers.
2. Make sure no reverse proxy, redirect (`http` to `https`, or `/api` to `/api/v1`) or exception handler is stripping CORS headers. The project README explains why redirecting legacy API paths is problematic for preflight.
3. If a global middleware raises an exception outside the CORS wrapper, ensure error responses are still wrapped by CORS (Starlette middleware order matters).
4. Only set `withCredentials` / `credentials: 'include'` if cookie authentication is actually used. Bearer-token flows can often avoid cross-origin cookies; preserve the required cookie flow for OAuth if applicable.
5. CORS is not authentication: continue authorizing all routes on the server.

### Test commands (replace placeholder backend host)

```bash
# Basic allowed-origin request: response should include the matching ACAO header
curl -i 'https://YOUR-ACTUAL-BACKEND.onrender.com/' \
  -H 'Origin: https://studentcheck.vercel.app'

# Preflight for a protected POST
curl -i -X OPTIONS 'https://YOUR-ACTUAL-BACKEND.onrender.com/api/v1/auth/login' \
  -H 'Origin: https://studentcheck.vercel.app' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,authorization'
```

Expected: successful preflight and `Access-Control-Allow-Origin: https://studentcheck.vercel.app` (not `*` when credentials are used). If response is 404/5xx/redirect or has no CORS headers, inspect the network request URL, server logs and proxy/route configuration. Check Socket.IO polling/WebSocket separately.

## Validation / definition of done

- [ ] Teacher and student login/logout work after refresh and session expiry.
- [ ] Direct navigation between all relevant routes does not trigger unnecessary full document reloads.
- [ ] Messaging sends one test email and provides provider-confirmed status or a clear error.
- [ ] ML can enroll and recognize a consenting student, and safely rejects or reviews uncertainty.
- [ ] Printed-photo and phone-display anti-spoof attempts are tested and measured, not just assumed blocked.
- [ ] Attendance cannot be forged by changing client-supplied IDs, QR payloads, or calling teacher-only endpoints.
- [ ] Valid and invalid CORS origins behave as expected; authenticated APIs and Socket.IO work from production frontend.
- [ ] Student dashboard/history percentages match database records and corrections are auditable.
- [ ] Mobile, slow network, service cold-start and ML outage scenarios have recoverable UI states.
- [ ] CI checks, documented deployment configuration and post-deploy smoke tests pass.

## Reference sources checked

- https://github.com/nem-web/smart-attendance
- https://github.com/nem-web/smart-attendance/blob/main/server/backend-api/app/core/config.py
- https://github.com/nem-web/smart-attendance/blob/main/server/backend-api/app/main.py
- https://github.com/nem-web/smart-attendance/blob/main/server/backend-api/app/services/attendance_socket_service.py
- https://github.com/nem-web/smart-attendance/blob/main/README.md

**Review caveat:** public source and user-reported issues were used; this checklist is not a claim that every screen was tested with real accounts or that all suggested features are currently absent. Do not close any item without verification.
