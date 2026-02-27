# Smart Attendance System

## Running Tests

### Backend (Python/FastAPI)

**Python version**: Python 3.11+ is required for local development. The CI also tests Python 3.10, 3.11, and 3.12.

Prerequisites: MongoDB running on `localhost:27017` (or set `MONGO_URI`). Integration tests will be skipped automatically if MongoDB is unavailable.

1. Navigate to `server/backend-api`:
   ```bash
   cd server/backend-api
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run tests with coverage:
   ```bash
   pytest --cov=app --cov-report=term-missing
   ```
   Target Coverage: **35%** (gradually increasing towards 80%)

#### Test Structure

```
tests/
├── conftest.py                          # Shared fixtures (MongoDB, HTTP client)
├── unit/                                # Unit tests (no MongoDB required)
│   ├── test_attendance_alerts.py
│   ├── test_jwt.py
│   ├── test_scheduler.py
│   ├── test_security.py
│   └── test_students.py
├── integration/                         # Integration tests (MongoDB required)
│   ├── test_analytics.py
│   ├── test_analytics_subject.py
│   ├── test_attendance_confirm.py
│   ├── test_auth.py
│   ├── test_device_binding.py
│   ├── test_health.py
│   ├── test_qr_attendance_validation.py
│   ├── test_session_management.py
│   └── test_student_attendance_fix.py
├── test_attendance_daily_schema_refactor.py
├── test_forgot_password.py
├── test_notification_integration.py
└── test_reports_mock.py
```

### ML Service (Python/FastAPI)

1. Navigate to `server/ml-service`:
   ```bash
   cd server/ml-service
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run tests:
   ```bash
   pytest --cov=app --cov-report=term-missing
   ```
   Target Coverage: **75%**

### Frontend (React/Vite)

1. Navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run unit/integration tests:
   ```bash
   npm test
   # Or with coverage
   npm run test:coverage
   ```
   Target Coverage: **70%**

#### Frontend Test Structure

```
src/
├── App.test.jsx
├── components/__tests__/
│   ├── AddSubjectModal.test.jsx
│   ├── Header.test.jsx
│   └── Spinner.test.jsx
├── hooks/__tests__/
│   └── useCurrentUser.test.jsx
└── pages/__tests__/
    ├── Analytics.test.jsx
    ├── Login.test.jsx
    └── Register.test.jsx
```

### End-to-End (Playwright)

Requires all services (Backend, ML, Mongo, Frontend) to be running.

1. Install Playwright browsers:
   ```bash
   cd frontend
   npx playwright install
   ```
2. Run E2E tests:
   ```bash
   npx playwright test
   ```
   Review results in `playwright-report/`.

## Code Quality

### Backend (Python)

The project uses [Ruff](https://docs.astral.sh/ruff/) for both formatting and linting:

```bash
# Format check
ruff format --check .

# Lint check
ruff check .

# Auto-fix
ruff format .
ruff check --fix .
```

### Frontend (JavaScript/TypeScript)

```bash
cd frontend
npm run lint
```

## CI/CD Pipeline

The project uses GitHub Actions (`.github/workflows/`) to automatically run all test suites on every push to `main` and PRs.

| Workflow | Description |
|----------|-------------|
| `test.yml` (CI) | Backend (pytest + MongoDB), ML (pytest), Frontend (vitest), E2E (Playwright) |
| `backend-tests.yml` | Backend tests across Python 3.10, 3.11, 3.12 |
| `frontend-tests.yml` | Frontend tests across Node.js 18.x and 20.x |
| `backend-quality.yml` | Ruff format + lint + Bandit security scan |
| `frontend-quality.yml` | ESLint + npm audit |
| `code-quality.yml` | Ruff format/lint for backend and ml-service, ESLint for frontend |
| `security.yml` | Bandit, npm audit, Gitleaks, CodeQL |
| `docker-build.yml` | Docker image builds for all services |
