# Smart Attendance — Curated Issue List

This document contains **10 hard-level** and **10 medium-level** GitHub issues for contributors to work on.
Each issue has a detailed description, acceptance criteria, and relevant file pointers.

---

## 🔴 Hard Issues

---

### [HARD-01] Implement Redis Caching Layer for Analytics Endpoints

**Labels:** `hard`, `enhancement`, `backend`, `performance`, `apertre3.0`

#### 📖 Description

The three analytics endpoints (`/api/analytics/attendance-trend`, `/api/analytics/monthly-summary`, `/api/analytics/class-risk`) perform expensive MongoDB aggregation pipelines on every request. Under load, this causes high database CPU usage and slow response times, especially when multiple teachers view dashboards simultaneously.

A Redis caching layer should be introduced to cache computed analytics results with a configurable TTL (time-to-live). The cache must be invalidated when new attendance data is confirmed.

#### 🎯 Problem It Solves

- Reduces repeated expensive aggregation queries against the `attendance_daily` collection
- Improves API response time from ~500ms to <50ms for cached responses
- Allows the system to scale to hundreds of concurrent teachers

#### 🛠 Proposed Solution

1. Add `redis` and `redis[asyncio]` to `server/backend-api/requirements.txt`
2. Create `server/backend-api/app/core/cache.py` with a `CacheService` class wrapping `aioredis`
3. Add `REDIS_URL` (default `redis://localhost:6379`) to `server/backend-api/app/core/config.py`
4. Create a `@cached(ttl=300)` decorator that stores/retrieves JSON-serialized responses
5. Apply the decorator to all three endpoints in `server/backend-api/app/api/routes/analytics.py`
6. Call `cache.invalidate_pattern("analytics:*")` in `server/backend-api/app/api/routes/attendance.py` inside the `confirm_attendance` endpoint after a successful write
7. Update `docker-compose.yml` and `docker-compose.dev.yml` to add a `redis` service
8. Write unit tests in `server/backend-api/tests/test_cache.py`

#### 📦 Files to Modify

- `server/backend-api/requirements.txt`
- `server/backend-api/app/core/config.py`
- `server/backend-api/app/api/routes/analytics.py`
- `server/backend-api/app/api/routes/attendance.py`
- `docker-compose.yml`, `docker-compose.dev.yml`

#### ✅ Acceptance Criteria

- [ ] Redis service added to docker-compose files
- [ ] Analytics endpoints return cached responses within 50ms on second hit
- [ ] Cache is invalidated when new attendance is confirmed
- [ ] Unit tests cover cache hit, cache miss, and invalidation scenarios
- [ ] `REDIS_URL` is documented in `env.example`

---

### [HARD-02] Complete TypeScript Migration for All Frontend Pages

**Labels:** `hard`, `enhancement`, `frontend`, `typescript`, `apertre3.0`

#### 📖 Description

The frontend is undergoing a gradual TypeScript migration — `App.tsx` and `Skeleton.tsx` have already been converted, but all pages in `frontend/src/pages/` and most components in `frontend/src/components/` remain as `.jsx` files with no type safety. This causes silent bugs (wrong prop types, undefined API response fields) and makes refactoring risky.

All JSX files must be converted to TSX with full TypeScript type annotations and proper interface definitions.

#### 🎯 Problem It Solves

- Catches type errors at compile time instead of runtime
- Enables IDE auto-completion and documentation for all components
- Prevents `undefined is not a function`-style runtime crashes

#### 🛠 Proposed Solution

1. Run `npx tsc --noEmit` to identify all existing type errors as a baseline
2. For each `.jsx` file in `frontend/src/pages/` and `frontend/src/components/`:
   - Rename to `.tsx`
   - Add explicit `React.FC` or typed function signatures
   - Define `interface` or `type` for all props
   - Type all `useState`, `useEffect`, and API response shapes using interfaces defined in `frontend/src/api/types.ts` (create this file)
3. Create `frontend/src/types/index.ts` exporting shared domain types: `Student`, `Subject`, `AttendanceRecord`, `Teacher`
4. Ensure `tsconfig.json` has `"strict": true`
5. Update `frontend-quality.yml` CI step to run `npx tsc --noEmit` as a type-check step

#### 📦 Files to Modify

- All files under `frontend/src/pages/*.jsx` → `.tsx`
- All files under `frontend/src/components/*.jsx` → `.tsx`
- All files under `frontend/src/students/` → `.tsx`
- `frontend/tsconfig.json`
- `.github/workflows/frontend-quality.yml`

#### ✅ Acceptance Criteria

- [ ] Zero `.jsx` files remain in `frontend/src/` (except `main.jsx` which can stay)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] All component props have explicit TypeScript types
- [ ] Shared domain types are defined in `frontend/src/types/index.ts`
- [ ] CI type-check step added to `frontend-quality.yml`

---

### [HARD-03] Implement WebSocket Support for Real-Time Attendance Updates

**Labels:** `hard`, `enhancement`, `backend`, `frontend`, `realtime`, `apertre3.0`

#### 📖 Description

Currently, the attendance marking dashboard (`MarkAttendance.jsx`) requires teachers to manually refresh the page to see updates. In a classroom with 30+ students, this creates a poor user experience. WebSocket support should be added so that when the ML service confirms a student's face recognition, the teacher's dashboard updates in real time without any refresh.

#### 🎯 Problem It Solves

- Teachers see live attendance updates the moment a student is recognized
- Eliminates polling loops and manual refreshes
- Improves trust in the system during active attendance sessions

#### 🛠 Proposed Solution

**Backend (FastAPI):**
1. Add a `WebSocketManager` class in `server/backend-api/app/utils/ws_manager.py` that maintains a dictionary of `{session_id: [WebSocket]}` connections
2. Add a new route `GET /api/attendance/ws/{session_id}` in `attendance.py` that upgrades to WebSocket
3. When attendance is confirmed (existing `POST /api/attendance/confirm` endpoint), broadcast an event to all WebSocket clients subscribed to that session
4. Handle client disconnections gracefully

**Frontend:**
1. Create `frontend/src/hooks/useAttendanceWebSocket.ts` — a custom hook that connects to the WebSocket, parses messages, and updates local state
2. Integrate the hook into `frontend/src/pages/MarkAttendance.jsx`
3. Show a visual indicator (green dot) when WebSocket is connected

#### 📦 Files to Modify

- `server/backend-api/app/api/routes/attendance.py`
- `server/backend-api/app/utils/ws_manager.py` (new)
- `frontend/src/pages/MarkAttendance.jsx`
- `frontend/src/hooks/useAttendanceWebSocket.ts` (new)

#### ✅ Acceptance Criteria

- [ ] WebSocket endpoint authenticates the teacher JWT before upgrading
- [ ] Attendance confirmation broadcasts update to all connected clients for that session
- [ ] Frontend dashboard updates within 500ms of server-side confirmation
- [ ] Disconnected clients reconnect automatically with exponential back-off
- [ ] Unit tests cover broadcast to multiple clients and handling disconnects

---

### [HARD-04] Implement Rate Limiting and Brute-Force Protection for Auth Endpoints

**Labels:** `hard`, `security`, `backend`, `apertre3.0`

#### 📖 Description

The authentication endpoint (`POST /api/auth/login`) has no rate limiting. An attacker can attempt thousands of password guesses per second, making the system vulnerable to credential stuffing and brute-force attacks. The same applies to `/api/auth/forgot-password`.

#### 🎯 Problem It Solves

- Prevents brute-force password attacks
- Protects against credential stuffing from leaked password lists
- Adds a defense layer even if passwords are weak

#### 🛠 Proposed Solution

1. Add `slowapi` to `server/backend-api/requirements.txt`
2. Configure a `Limiter` in `server/backend-api/app/core/config.py` using `slowapi.Limiter` with `key_func=get_remote_address`
3. Register the limiter and `_rate_limit_exceeded_handler` on the FastAPI `app` in `server/backend-api/app/main.py`
4. Apply `@limiter.limit("5/minute")` to `POST /api/auth/login`
5. Apply `@limiter.limit("3/hour")` to `POST /api/auth/forgot-password`
6. Apply `@limiter.limit("10/minute")` to `POST /api/auth/register`
7. Return HTTP 429 with a `Retry-After` header when the limit is exceeded
8. Add integration tests that verify 429 is returned after the threshold

#### 📦 Files to Modify

- `server/backend-api/requirements.txt`
- `server/backend-api/app/main.py`
- `server/backend-api/app/api/routes/auth.py`
- `server/backend-api/app/core/config.py`

#### ✅ Acceptance Criteria

- [ ] Login endpoint returns HTTP 429 after 5 requests/minute from same IP
- [ ] Forgot-password returns HTTP 429 after 3 requests/hour
- [ ] `Retry-After` header is present in 429 responses
- [ ] Rate limit state is stored in-process (memory) for dev; documented how to switch to Redis for prod
- [ ] Tests verify limits are enforced and lifted after the window

---

### [HARD-05] Build Comprehensive Audit Logging System

**Labels:** `hard`, `enhancement`, `backend`, `security`, `apertre3.0`

#### 📖 Description

Currently the application has basic Python logging (`logging.getLogger(__name__)`) but no structured audit trail. There is no way to answer questions like "Who marked student X as present on date Y?", "Which teacher changed the schedule?", or "When was attendance for class Z last modified?". A formal audit log is required for accountability in academic institutions.

#### 🎯 Problem It Solves

- Provides an immutable record of all attendance modifications
- Enables administrators to investigate disputes about attendance records
- Satisfies academic compliance requirements

#### 🛠 Proposed Solution

1. Create a new MongoDB collection `audit_logs` with schema:
   ```json
   {
     "_id": "ObjectId",
     "timestamp": "ISO datetime",
     "actor_id": "teacher ObjectId",
     "actor_email": "string",
     "action": "CREATE|UPDATE|DELETE|LOGIN|LOGOUT",
     "resource_type": "attendance|schedule|student|subject",
     "resource_id": "ObjectId string",
     "changes": { "before": {}, "after": {} },
     "ip_address": "string",
     "user_agent": "string"
   }
   ```
2. Create `server/backend-api/app/services/audit_log.py` with an async `log_action()` function
3. Create FastAPI middleware in `server/backend-api/app/middleware/audit_middleware.py` that extracts `X-Forwarded-For` and `User-Agent`
4. Call `log_action()` in every route handler that mutates data (attendance, schedule, student CRUD)
5. Add `GET /api/admin/audit-logs` endpoint with date-range filtering and pagination (admin-only)
6. Ensure audit log writes never fail the primary operation (use `asyncio.create_task`)

#### 📦 Files to Modify

- `server/backend-api/app/services/audit_log.py` (new)
- `server/backend-api/app/middleware/audit_middleware.py` (new)
- `server/backend-api/app/api/routes/attendance.py`
- `server/backend-api/app/api/routes/schedule.py`
- `server/backend-api/app/api/routes/students.py`
- `server/backend-api/app/main.py`

#### ✅ Acceptance Criteria

- [ ] Every attendance confirmation creates an audit log entry
- [ ] Audit log entries include actor, timestamp, IP, action, and before/after state
- [ ] A failed audit log write does NOT fail the primary request
- [ ] `GET /api/admin/audit-logs` is restricted to admin role
- [ ] Tests verify audit entries are created for each mutating operation

---

### [HARD-06] Implement TOTP-Based Multi-Factor Authentication for Teacher Accounts

**Labels:** `hard`, `security`, `backend`, `frontend`, `apertre3.0`

#### 📖 Description

Teacher accounts currently use only username + password authentication. Since teachers control attendance records that affect students' grades, these accounts are high-value targets. TOTP (Time-based One-Time Password, compatible with Google Authenticator / Authy) should be added as a second authentication factor.

#### 🎯 Problem It Solves

- Prevents account takeover even if a teacher's password is leaked
- Adds standard MFA that most teachers are familiar with via their smartphones

#### 🛠 Proposed Solution

**Backend:**
1. Add `pyotp` and `qrcode` to `server/backend-api/requirements.txt`
2. Add `mfa_secret` (nullable string) and `mfa_enabled` (bool, default False) fields to the `teachers` collection
3. Add `POST /api/auth/mfa/setup` — generates a TOTP secret, stores it in the teacher's record (not yet enabled), and returns a QR code data URL
4. Add `POST /api/auth/mfa/verify-setup` — accepts a 6-digit TOTP code, verifies it, and sets `mfa_enabled = True`
5. Add `POST /api/auth/mfa/disable` — disables MFA after verifying the current TOTP code
6. Modify `POST /api/auth/login` response: if `mfa_enabled` is True, return HTTP 202 with a short-lived `mfa_session_token` instead of the full JWT
7. Add `POST /api/auth/mfa/validate` — accepts `mfa_session_token` + 6-digit code, returns full JWT on success

**Frontend:**
1. After login, if the server returns 202, show a TOTP input screen in `Login.jsx`
2. Add an MFA settings section to `Settings.jsx` with a QR code display and enable/disable toggle

#### 📦 Files to Modify

- `server/backend-api/requirements.txt`
- `server/backend-api/app/api/routes/auth.py`
- `server/backend-api/app/db/teachers_repo.py`
- `server/backend-api/app/schemas/auth.py`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Settings.jsx`

#### ✅ Acceptance Criteria

- [ ] Teachers can enroll MFA via QR code scan + verification
- [ ] Login flow requires 6-digit TOTP when MFA is enabled
- [ ] Invalid TOTP codes are rejected; expired codes are rejected
- [ ] Teachers can disable MFA after verifying their current TOTP
- [ ] MFA secrets are stored encrypted (not plain text) in MongoDB
- [ ] Tests cover full enrollment and login flows

---

### [HARD-07] Build Automated ML Model Retraining Pipeline

**Labels:** `hard`, `enhancement`, `ml-service`, `backend`, `apertre3.0`

#### 📖 Description

The face recognition model in `server/ml-service/` is static — once trained, it is never updated. As more students are enrolled or existing embeddings change (e.g., student changes appearance), recognition accuracy degrades. An automated retraining pipeline should detect when accuracy drops below a threshold and trigger an incremental retraining job.

#### 🎯 Problem It Solves

- Keeps face recognition accuracy above acceptable levels without manual intervention
- Supports adding new students without full system downtime
- Provides an API for maintainers to trigger retraining on demand

#### 🛠 Proposed Solution

1. In the ML service, add a `RecognitionMetricsStore` that tracks per-session accuracy (recognized vs. total attempts) in a rolling 7-day window
2. Add a background task (using FastAPI's `BackgroundTasks` or APScheduler) that checks every 6 hours if accuracy < 80%
3. When the threshold is crossed, trigger an incremental retraining job:
   - Fetch new student face embeddings from the backend API
   - Fine-tune the model on the new data
   - Hot-swap the in-memory model without restarting the service
4. Add `POST /ml/retrain` (admin-authenticated) for manual triggering
5. Add `GET /ml/metrics` returning current accuracy, number of recognitions, and last retrain timestamp
6. Emit a warning log and optionally POST to a webhook URL (configurable via env var) when accuracy falls below threshold

#### 📦 Files to Modify

- `server/ml-service/app/ml/` (new retraining logic)
- `server/ml-service/app/api/routes/` (new `/ml/retrain` and `/ml/metrics` endpoints)
- `server/ml-service/app/core/config.py`
- `server/ml-service/requirements.txt`

#### ✅ Acceptance Criteria

- [ ] `GET /ml/metrics` returns accuracy percentage, total recognitions, and last retrain time
- [ ] Background task triggers retraining when accuracy < 80% over a 7-day window
- [ ] `POST /ml/retrain` is protected by admin authentication
- [ ] Model hot-swap completes within 60 seconds for a dataset of 200 students
- [ ] Tests verify metrics tracking and retraining trigger logic

---

### [HARD-08] Database Query Optimization and Indexing Strategy

**Labels:** `hard`, `performance`, `backend`, `database`, `apertre3.0`

#### 📖 Description

The MongoDB collections (`attendance_records`, `attendance_daily`, `subjects`, `teachers`) lack explicit indexes. All queries — including frequent lookups by `classId`, `date`, `studentId`, and `professor_ids` — perform full collection scans (`COLLSCAN`). Under load with thousands of records, queries take seconds rather than milliseconds.

#### 🎯 Problem It Solves

- Reduces attendance query time from O(N) to O(log N)
- Cuts MongoDB CPU usage by 60–80% under typical load
- Prevents UI timeouts on the Reports and Analytics pages

#### 🛠 Proposed Solution

1. Run `db.collection.explain("executionStats")` on the five most common queries to identify which fields need indexing
2. Create `server/backend-api/app/db/indexes.py` with an async `create_indexes()` function:
   - `attendance_records`: compound index on `(class_id, date)`, single index on `student_id`
   - `attendance_daily`: compound index on `(classId, date)` (unique), index on `date`
   - `subjects`: index on `professor_ids`, index on `students.student_id`
   - `audit_logs`: compound index on `(actor_id, timestamp)`
3. Call `create_indexes()` during application startup in `server/backend-api/app/main.py` (use `on_event("startup")` or lifespan)
4. Add projection to all `find()` calls in repo files to return only needed fields (avoid `SELECT *` equivalent)
5. Add `skip()`/`limit()` to any list endpoint that doesn't already paginate
6. Document the indexing strategy in `server/backend-api/README.md`

#### 📦 Files to Modify

- `server/backend-api/app/db/indexes.py` (new)
- `server/backend-api/app/main.py`
- `server/backend-api/app/db/attendance_repo.py`
- `server/backend-api/app/services/attendance_daily.py`
- `server/backend-api/app/db/subjects_repo.py`

#### ✅ Acceptance Criteria

- [ ] `create_indexes()` is called on startup and is idempotent
- [ ] `explain("executionStats")` shows `IXSCAN` (not `COLLSCAN`) for the five most common queries
- [ ] All list endpoints return paginated results with `page` and `limit` query parameters
- [ ] Performance test shows p95 query latency < 50ms with 10,000 attendance records
- [ ] Index definitions are documented with the reason for each index

---

### [HARD-09] Implement Role-Based Access Control (RBAC) System

**Labels:** `hard`, `security`, `backend`, `frontend`, `apertre3.0`

#### 📖 Description

The current authorization model is binary: a user is either a teacher or a student. There is no concept of an admin, department head, or read-only viewer. As the system grows, more granular access control is needed — for example, only admins can delete records, department heads can view reports for all classes in their department, and regular teachers can only manage their own subjects.

#### 🎯 Problem It Solves

- Prevents teachers from accidentally (or maliciously) modifying other teachers' data
- Enables safe delegation of admin tasks without sharing admin credentials
- Satisfies institutional requirements for data access governance

#### 🛠 Proposed Solution

1. Define roles: `admin`, `department_head`, `teacher`, `student`
2. Define permissions: `attendance:read`, `attendance:write`, `attendance:delete`, `reports:read`, `users:manage`, `settings:write`
3. Create a role-permission mapping in `server/backend-api/app/core/rbac.py`
4. Store `role` in the JWT payload and in the `teachers`/`students` collections
5. Create a `require_permission(permission: str)` FastAPI dependency that reads the role from the JWT and checks the mapping
6. Replace raw `get_current_user` checks with `require_permission()` on all sensitive endpoints
7. On the frontend, read the `role` from the decoded JWT and conditionally render navigation items and action buttons

#### 📦 Files to Modify

- `server/backend-api/app/core/rbac.py` (new)
- `server/backend-api/app/api/deps.py`
- `server/backend-api/app/api/routes/*.py` (all route files)
- `server/backend-api/app/core/security.py`
- `frontend/src/App.tsx`
- `frontend/src/components/Header.jsx`

#### ✅ Acceptance Criteria

- [ ] Role-permission mapping is defined and unit-tested
- [ ] Every sensitive endpoint uses `require_permission()` dependency
- [ ] Teachers cannot access endpoints scoped to `admin` role
- [ ] Frontend hides admin-only UI elements from non-admin users
- [ ] Existing tests are updated to pass the correct role in JWT

---

### [HARD-10] Write Comprehensive Playwright End-to-End Test Suite

**Labels:** `hard`, `testing`, `frontend`, `e2e`, `apertre3.0`

#### 📖 Description

The CI pipeline has an `e2e-test` job that runs `npx playwright test`, but the test suite itself is minimal or missing. A comprehensive E2E test suite is essential to catch regressions in the full user journey — teacher login → create schedule → mark attendance → view reports.

#### 🎯 Problem It Solves

- Prevents shipping regressions that break core workflows
- Gives contributors confidence that their changes don't break the happy path
- Documents expected system behaviour as executable specifications

#### 🛠 Proposed Solution

Write Playwright tests covering all critical paths. Each test should be in `frontend/tests/e2e/`:

1. **`auth.spec.ts`** — Login with valid credentials, login with wrong password (error shown), logout
2. **`register.spec.ts`** — Successful teacher registration, duplicate email error
3. **`dashboard.spec.ts`** — Dashboard loads after login, shows correct class cards
4. **`attendance.spec.ts`** — Start attendance session, simulate face recognition POST, verify student marked present
5. **`reports.spec.ts`** — Navigate to Reports, filter by class and date, verify table data
6. **`analytics.spec.ts`** — Analytics page loads charts, date range picker works
7. **`student-management.spec.ts`** — Add a student, view student list, search by name
8. **`schedule.spec.ts`** — Create a schedule entry, view calendar, delete entry
9. **`settings.spec.ts`** — Update teacher profile, change password
10. **`mobile.spec.ts`** — Repeat key flows at 375×812 (iPhone SE) viewport to verify responsive layout

Use `playwright.config.ts` to configure base URL from `PLAYWRIGHT_TEST_BASE_URL` env var and set up global auth state via `storageState`.

#### 📦 Files to Create / Modify

- `frontend/tests/e2e/*.spec.ts` (10 new spec files)
- `frontend/playwright.config.ts`
- `frontend/tests/fixtures/auth.fixture.ts`

#### ✅ Acceptance Criteria

- [ ] All 10 spec files pass against a locally running stack
- [ ] Tests run in the existing `e2e-test` CI job without additional configuration
- [ ] Global auth fixture avoids logging in on every test (uses saved storage state)
- [ ] Mobile viewport tests verify the student sidebar collapses correctly
- [ ] Test coverage report uploaded as a CI artifact

---

## 🟡 Medium Issues

---

### [MEDIUM-01] Add Dark Mode Support with Persistent Theme Toggle

**Labels:** `medium`, `enhancement`, `frontend`, `ux`, `apertre3.0`

#### 📖 Description

The frontend uses a theme system (see `frontend/src/theme/`) but only provides a light mode. Many users prefer dark mode, especially for night-time use. A toggle should be added to the `Header` component that switches between light and dark mode, persists the preference in `localStorage`, and respects the OS-level `prefers-color-scheme` setting on first visit.

#### 🎯 Problem It Solves

- Reduces eye strain for users in low-light environments
- Brings the app in line with modern UI expectations

#### 🛠 Proposed Solution

1. Extend the theme in `frontend/src/theme/` to add a `darkTheme` object (MUI `createTheme` with `palette.mode: 'dark'`)
2. Create `frontend/src/hooks/useTheme.ts` that:
   - Reads initial preference from `localStorage` → falls back to `window.matchMedia('(prefers-color-scheme: dark)')`
   - Returns `{ mode, toggleMode }` and exposes a context via `ThemeProvider`
3. Wrap the app in the custom `ThemeProvider` in `frontend/src/main.jsx`
4. Add a sun/moon icon button to `frontend/src/components/Header.jsx` that calls `toggleMode`
5. Ensure all custom CSS variables in `index.css` update when the theme changes

#### 📦 Files to Modify

- `frontend/src/theme/`
- `frontend/src/components/Header.jsx`
- `frontend/src/main.jsx`
- `frontend/src/hooks/useTheme.ts` (new)

#### ✅ Acceptance Criteria

- [ ] Theme toggle button visible in header on all pages
- [ ] Chosen theme persists across page reloads via `localStorage`
- [ ] First visit respects OS `prefers-color-scheme`
- [ ] All pages render correctly in dark mode (no white flash, no invisible text)
- [ ] Toggle is keyboard-accessible (Tab + Enter)

---

### [MEDIUM-02] Implement Server-Side Pagination for StudentList and Reports Pages

**Labels:** `medium`, `enhancement`, `frontend`, `backend`, `performance`, `apertre3.0`

#### 📖 Description

`StudentList.jsx` and `Reports.jsx` currently fetch all records from the API in a single request. With large classes (200+ students) or a full semester of attendance records (thousands of rows), this causes slow initial page load, excessive memory usage in the browser, and increased MongoDB query time.

#### 🎯 Problem It Solves

- Page load time drops from 3–5 seconds to <500ms
- Browser memory usage drops for large datasets
- Sets up the backend for future search and filtering features

#### 🛠 Proposed Solution

**Backend:**
1. Add `page: int = 1` and `limit: int = 50` query parameters to `GET /api/students` and `GET /api/reports/attendance`
2. Add `.skip((page-1)*limit).limit(limit)` to the corresponding MongoDB queries in the repo files
3. Return a response envelope: `{ "data": [...], "total": N, "page": P, "limit": L, "pages": ceil(N/L) }`

**Frontend:**
1. In `StudentList.jsx` and `Reports.jsx`, replace current data-fetch with a paginated hook
2. Add a `<Pagination>` component (MUI's `Pagination`) below each table
3. On page change, re-fetch with the new `page` query parameter
4. Show a loading skeleton while the new page is fetching

#### 📦 Files to Modify

- `server/backend-api/app/api/routes/students.py`
- `server/backend-api/app/api/routes/reports.py`
- `server/backend-api/app/db/subjects_repo.py`
- `frontend/src/pages/StudentList.jsx`
- `frontend/src/pages/Reports.jsx`

#### ✅ Acceptance Criteria

- [ ] `GET /api/students?page=2&limit=25` returns the correct second page
- [ ] Response includes `total`, `page`, `limit`, `pages` metadata fields
- [ ] Frontend shows page numbers and `Previous`/`Next` controls
- [ ] Navigating to page 2 shows a loading skeleton, then the correct data
- [ ] Default page size is 50 and is configurable via query parameter

---

### [MEDIUM-03] Add React Error Boundary Components with Fallback UI

**Labels:** `medium`, `enhancement`, `frontend`, `reliability`, `apertre3.0`

#### 📖 Description

Currently, if any component throws a JavaScript error during render (e.g., due to unexpected API response shape), the entire React tree unmounts and the user sees a blank white page. React Error Boundaries catch render errors in a component subtree and show a friendly fallback UI instead.

#### 🎯 Problem It Solves

- Prevents a bug in one page from crashing the entire application
- Shows users a useful message and recovery action instead of a blank screen
- Makes bugs easier to diagnose in production

#### 🛠 Proposed Solution

1. Create `frontend/src/components/ErrorBoundary.tsx` as a class component implementing `componentDidCatch` and `getDerivedStateFromError`
2. The fallback UI should show:
   - A friendly error message ("Something went wrong")
   - A "Reload page" button
   - In development mode, display the error stack trace in a `<pre>` block
3. Wrap each lazy-loaded route in `App.tsx` with `<ErrorBoundary>`:
   ```tsx
   <ErrorBoundary>
     <Suspense fallback={<LoadingFallback />}>
       <Dashboard />
     </Suspense>
   </ErrorBoundary>
   ```
4. Optionally: integrate with an error reporting service (e.g., Sentry) via `componentDidCatch`

#### 📦 Files to Modify

- `frontend/src/components/ErrorBoundary.tsx` (new)
- `frontend/src/App.tsx`

#### ✅ Acceptance Criteria

- [ ] Throwing an error inside a page component shows the fallback UI, not a blank screen
- [ ] "Reload page" button resets the error boundary and re-renders the component
- [ ] Stack trace is visible in development mode only
- [ ] Each route is wrapped independently (error in one page doesn't affect other pages)
- [ ] ErrorBoundary is covered by a unit test that simulates a child component throw

---

### [MEDIUM-04] Increase Backend Test Coverage from 35% to 70%+

**Labels:** `medium`, `testing`, `backend`, `apertre3.0`

#### 📖 Description

The CI pipeline enforces a minimum test coverage of 35% (`pytest --cov-fail-under=35`). This is too low to catch regressions in core business logic. The target should be raised to at least 70%, with new tests focusing on the attendance, analytics, auth, and reports routes that are currently untested or under-tested.

#### 🎯 Problem It Solves

- Catches bugs in business logic before they reach production
- Makes refactoring safer for contributors
- Demonstrates the system's expected behaviour as executable documentation

#### 🛠 Proposed Solution

1. Run `pytest --cov=app --cov-report=html` to generate a coverage report and identify uncovered lines
2. Add tests in `server/backend-api/tests/` for:
   - `test_auth.py`: register, login, JWT validation, password reset flow
   - `test_attendance.py`: start session, get QR, confirm attendance, edge cases (duplicate, invalid student)
   - `test_analytics.py`: attendance trend, monthly summary, class risk endpoints
   - `test_reports.py`: report generation with various filters
   - `test_students.py`: add, list, remove students from a subject
3. Use `pytest-asyncio` for async route tests and `mongomock` or `motor` with a test database
4. Update `test.yml` to raise `--cov-fail-under=70`

#### 📦 Files to Modify

- `server/backend-api/tests/test_auth.py` (new or extend)
- `server/backend-api/tests/test_attendance.py` (new or extend)
- `server/backend-api/tests/test_analytics.py` (new or extend)
- `server/backend-api/tests/test_reports.py` (new or extend)
- `.github/workflows/test.yml`

#### ✅ Acceptance Criteria

- [ ] `pytest --cov=app` reports ≥ 70% overall coverage
- [ ] Auth routes (register, login, refresh, reset) are ≥ 90% covered
- [ ] Attendance routes are ≥ 80% covered
- [ ] CI `--cov-fail-under` threshold updated to 70
- [ ] Tests use a dedicated test database, not production

---

### [MEDIUM-05] Add Comprehensive Input Validation and Sanitization to API Endpoints

**Labels:** `medium`, `security`, `backend`, `apertre3.0`

#### 📖 Description

Several API endpoints accept user-supplied strings (student names, email addresses, class names, schedule titles) that are stored directly in MongoDB without sanitization. While MongoDB is not vulnerable to SQL injection, NoSQL injection (using `$where`, `$gt`, etc. in query values) is possible. Additionally, missing length limits allow storage of arbitrarily large strings.

#### 🎯 Problem It Solves

- Prevents NoSQL injection attacks via crafted JSON payloads
- Prevents denial-of-service via extremely long input strings
- Makes error messages informative when validation fails

#### 🛠 Proposed Solution

1. Review all Pydantic schema files in `server/backend-api/app/schemas/`
2. Add field validators to every schema:
   - Email fields: `EmailStr` type
   - Name fields: `constr(min_length=1, max_length=100, pattern=r'^[a-zA-Z\s\-\.]+$')`
   - Numeric IDs: `constr(pattern=r'^[a-f0-9]{24}$')` to enforce ObjectId format
   - Date fields: `date` type from Pydantic
3. Add a custom `@validator` that rejects any string value starting with `$` (NoSQL operator injection)
4. Add a global exception handler in `main.py` for `RequestValidationError` that returns a structured 422 response with field-level error details
5. Write tests that send invalid payloads and assert 422 responses with correct field errors

#### 📦 Files to Modify

- `server/backend-api/app/schemas/*.py` (all schema files)
- `server/backend-api/app/main.py`
- `server/backend-api/tests/test_validation.py` (new)

#### ✅ Acceptance Criteria

- [ ] All string fields have `min_length`, `max_length`, and `pattern` constraints
- [ ] Payloads containing `$where` or `$gt` in string fields return 422
- [ ] 422 responses include per-field error details in JSON
- [ ] Email fields validate format using `EmailStr`
- [ ] Tests cover 10 invalid payload scenarios

---

### [MEDIUM-06] Implement Client-Side and Server-Side Password Strength Validation

**Labels:** `medium`, `security`, `frontend`, `backend`, `apertre3.0`

#### 📖 Description

The teacher registration page (`Register.jsx`) currently accepts any password. There is no indication of password strength, no minimum complexity requirement, and no server-side enforcement. Teachers can register with passwords like `123456` or `password`, leaving their accounts vulnerable.

#### 🎯 Problem It Solves

- Encourages teachers to choose strong passwords
- Prevents trivially guessable passwords from being accepted
- Server-side enforcement ensures validation cannot be bypassed by disabling JavaScript

#### 🛠 Proposed Solution

**Frontend (`Register.jsx`):**
1. Add a password strength meter component using the `zxcvbn` library (or a lightweight alternative)
2. Show a colored progress bar (red → yellow → green) that updates as the user types
3. Display helpful feedback messages from `zxcvbn.feedback` (e.g., "Add a number or symbol")
4. Disable the submit button if password score < 2 (out of 4)

**Backend (`server/backend-api/app/api/routes/auth.py`):**
1. Add a `validate_password_strength()` utility that enforces:
   - Minimum 8 characters
   - At least 1 uppercase, 1 lowercase, 1 digit, 1 special character
2. Call this validator in `POST /api/auth/register` and return HTTP 422 with a descriptive message if it fails

#### 📦 Files to Modify

- `frontend/src/pages/Register.jsx`
- `server/backend-api/app/api/routes/auth.py`
- `server/backend-api/app/utils/validators.py` (new or extend)

#### ✅ Acceptance Criteria

- [ ] Password strength meter is visible while typing in the registration form
- [ ] Submit button is disabled for weak passwords (score < 2)
- [ ] Backend returns 422 with a message if the password doesn't meet complexity rules
- [ ] Bypassing client-side JS still fails at the server
- [ ] Tests cover weak, medium, and strong password scenarios on the backend

---

### [MEDIUM-07] Fix: GitHub Workflow `frontend-quality.yml` Blocks PRs on Low-Severity npm Vulnerabilities

**Labels:** `medium`, `bug`, `ci-cd`, `apertre3.0`

#### 📖 Description

**File:** `.github/workflows/frontend-quality.yml`

The current workflow runs `npm audit` without specifying an audit level:

```yaml
- name: Audit dependencies
  run: npm audit
```

`npm audit` exits with code 1 for **any** vulnerability, including `low` and `moderate` severity ones that are often transitive dependencies with no practical exploit path in this context. This blocks all PRs whenever a low-severity advisory is published for any transitive dependency, even when there is no available fix.

#### 🛠 Fix

Change the audit step to only fail on `high` or `critical` severity vulnerabilities:

```yaml
- name: Audit dependencies
  run: npm audit --audit-level=high
```

This ensures the CI still catches genuinely dangerous vulnerabilities while not blocking PRs for theoretical low-risk issues that have no fix available.

#### 📦 File to Modify

- `.github/workflows/frontend-quality.yml`

#### ✅ Acceptance Criteria

- [ ] `npm audit --audit-level=high` is used instead of `npm audit`
- [ ] The workflow passes when only low/moderate vulnerabilities exist
- [ ] The workflow still fails when a high or critical vulnerability is detected
- [ ] A comment in the workflow explains the reasoning for the audit level choice

---

### [MEDIUM-08] Fix: Outdated Action Versions Across GitHub Workflows

**Labels:** `medium`, `bug`, `ci-cd`, `maintenance`, `apertre3.0`

#### 📖 Description

Several GitHub Actions workflow files use outdated action versions:

| File | Action | Current | Should Be |
|---|---|---|---|
| `ai-review.yml` | `actions/checkout` | `@v3` | `@v4` |
| `ai-review.yml` | `coderabbitai/ai-pr-reviewer` | `@latest` | `@v2` (pin to stable) |
| `first-interaction.yml` | `actions/github-script` | `@v6` | `@v7` |
| `pr-merged.yml` | `actions/github-script` | `@v6` | `@v7` |

Using `@latest` tags is a security risk — a compromised upstream action can run arbitrary code in your CI. Using outdated pinned versions means missing security patches and new features.

#### 🛠 Fix

Update each action reference to the latest stable pinned version. Avoid `@latest` for actions that execute code (use `@v2`, `@v4`, etc.).

#### 📦 Files to Modify

- `.github/workflows/ai-review.yml`
- `.github/workflows/first-interaction.yml`
- `.github/workflows/pr-merged.yml`

#### ✅ Acceptance Criteria

- [ ] `actions/checkout` uses `@v4` in all workflow files
- [ ] `actions/github-script` uses `@v7` in all workflow files
- [ ] No workflow file uses `@latest` for any action that executes JavaScript or shell commands
- [ ] All updated workflows still pass on a test PR

---

### [MEDIUM-09] Add Loading Skeleton States to All Data-Fetching Pages

**Labels:** `medium`, `enhancement`, `frontend`, `ux`, `apertre3.0`

#### 📖 Description

The `Skeleton.tsx` component infrastructure already exists (see `frontend/src/components/Skeleton.tsx`) but most data-fetching pages (`Dashboard.jsx`, `Reports.jsx`, `StudentList.jsx`, `Analytics.jsx`) render nothing — or a brief spinner — while waiting for API responses. A proper skeleton loading screen that matches the final layout gives users instant visual feedback and reduces perceived load time.

#### 🎯 Problem It Solves

- Reduces layout shift (CLS) when data loads
- Makes slow API calls feel faster (perceived performance)
- Provides a consistent loading pattern across all pages

#### 🛠 Proposed Solution

1. Review `frontend/src/components/Skeleton.tsx` and extend it with new skeleton variants:
   - `CardSkeleton` — for dashboard stat cards
   - `TableRowSkeleton` — for reports and student list tables
   - `ChartSkeleton` — for analytics charts
2. For each data-fetching page, identify the loading state and replace blank/spinner with the matching skeleton:
   - `Dashboard.jsx` → 4 × `CardSkeleton`
   - `Reports.jsx` → 10 × `TableRowSkeleton`
   - `StudentList.jsx` → 8 × `TableRowSkeleton`
   - `Analytics.jsx` → 2 × `ChartSkeleton`
3. Remove any existing `CircularProgress` spinners on these pages
4. Ensure skeleton display duration is tied to the actual API call (not a fixed timer)

#### 📦 Files to Modify

- `frontend/src/components/Skeleton.tsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Reports.jsx`
- `frontend/src/pages/StudentList.jsx`
- `frontend/src/pages/Analytics.jsx`

#### ✅ Acceptance Criteria

- [ ] All four pages show a skeleton (not a spinner or blank) while data is loading
- [ ] Skeleton layout matches the final rendered layout (same number of columns/rows)
- [ ] No layout shift visible when data loads and replaces the skeleton
- [ ] Skeleton components are reusable and documented in `Skeleton.tsx`
- [ ] Unit tests verify each page renders the skeleton during loading state

---

### [MEDIUM-10] Extend i18n Support: Add Hindi, French, and Spanish Translations

**Labels:** `medium`, `enhancement`, `frontend`, `i18n`, `apertre3.0`

#### 📖 Description

The frontend already has an `i18n.js` setup (`frontend/src/i18n.js`) and the infrastructure for internationalization is in place. However, translations exist only for English. To make the system accessible to institutions in India, France, and Spanish-speaking countries, Hindi (`hi`), French (`fr`), and Spanish (`es`) translations should be added.

#### 🎯 Problem It Solves

- Makes the application usable by non-English-speaking institutions
- Demonstrates the i18n infrastructure works end-to-end
- Encourages future contributors to add more languages

#### 🛠 Proposed Solution

1. Audit `frontend/src/i18n.js` to understand the current structure and which keys exist
2. Create translation files:
   - `frontend/public/locales/hi/translation.json` (Hindi)
   - `frontend/public/locales/fr/translation.json` (French)
   - `frontend/public/locales/es/translation.json` (Spanish)
3. Translate all existing English keys. Use a translation reference tool; do not use machine translation alone — have a native/fluent speaker review
4. Register the new languages in `i18n.js` (add to `resources` or configure backend loading)
5. Add a language selector dropdown to the `Header.jsx` or `Settings.jsx` page
6. Persist the selected language in `localStorage`
7. Verify right-to-left (RTL) is not needed for Hindi (Devanagari script is LTR ✓)

#### 📦 Files to Modify

- `frontend/src/i18n.js`
- `frontend/public/locales/hi/translation.json` (new)
- `frontend/public/locales/fr/translation.json` (new)
- `frontend/public/locales/es/translation.json` (new)
- `frontend/src/components/Header.jsx`

#### ✅ Acceptance Criteria

- [ ] Language selector is visible in the UI (header or settings)
- [ ] Switching language immediately updates all visible text without page reload
- [ ] Selected language persists across page reloads via `localStorage`
- [ ] All three new locales have 100% key coverage (no missing translation keys)
- [ ] Unit test verifies language switching updates the `i18n` instance

---

## 🔧 Workflow Bugs Identified

The following bugs exist in `.github/workflows/` and have been partially addressed by the workflow fixes in this PR. Contributors can verify and extend the fixes:

| # | File | Bug | Fix Applied |
|---|---|---|---|
| 1 | `ai-review.yml` | Uses `actions/checkout@v3` (outdated) and `@latest` tag (security risk) | ✅ Updated to `@v4` and `@v2` |
| 2 | `backend-quality.yml` | `ruff format .` modifies files in-place during CI without committing; the subsequent `--check` always passes on the CI runner but repo files remain unformatted | ✅ Changed to `--check` only |
| 3 | `frontend-quality.yml` | `npm audit` fails on any severity including `low`, blocking all PRs unnecessarily | ✅ Changed to `--audit-level=high` |
| 4 | `first-interaction.yml` | Uses `actions/github-script@v6` (outdated) | ✅ Updated to `@v7` |
| 5 | `pr-merged.yml` | Uses `actions/github-script@v6` (outdated) | ✅ Updated to `@v7` |
| 6 | `test.yml` | ML service in `e2e-test` job starts without required environment variables (`MONGO_URI`, `MONGO_DB_NAME`), causing it to fail silently or use wrong defaults | ✅ Added `env` block to ML service start step |
