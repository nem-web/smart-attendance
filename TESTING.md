# Smart Attendance System

## Running Tests

### Backend (Python/FastAPI)

Prerequisites: MongoDB running on `localhost:27017` (or set `MONGO_URI`).

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

## CI/CD Pipeline

The project uses GitHub Actions (`.github/workflows/test.yml`) to automatically run all test suites on every push to `main` and PRs.
- **Backend Job**: Pytest + MongoDB Service
- **ML Job**: Pytest
- **Frontend Job**: Vitest
- **E2E Job**: Full stack spin-up + Playwright
