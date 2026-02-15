# Improve: Python backend and ML service

Backend and ML service improvements: config, logging, health check, type hints, RGB handling for face pipeline, and secure Dynamic QR Code attendance system.

Closes #258

---

## Summary

This PR adds a full Dynamic QR Code attendance feature alongside backend improvements for config, logging, and security hardening.

### Backend API
- **Config**: Use Pydantic `Settings` with `Config.env_file` and default values; CORS origins configurable via `CORS_ORIGINS` env (comma-separated).
- **Main**: Use `ORIGINS` from config for CORS; add FastAPI `lifespan` to close `ml_client` and Redis on shutdown; add structured logging.
- **Auth deps**: Catch JWT decode exceptions and return 401 instead of 500.
- **Logging**: Replace `print()` with `logging` in auth, attendance, students, security, and email.
- **Attendance**: Use `ML_CONFIDENT_THRESHOLD` and `ML_UNCERTAIN_THRESHOLD` from config instead of literals; remove debug prints.
- **QR Attendance**: Dynamic QR code generation and validation with replay protection (nonce-based), server-side time validation, and duplicate attendance guards.
- **Security**: `is_verified` is env-gated (`ENVIRONMENT=development` for auto-verify); `QR_JWT_SECRET` fails fast at startup if unset; strict ownership checks for QR generation; `ObjectId` inputs validated with proper error responses.

### ML Service
- **Health**: Check for actual stack (`cv2`, `mediapipe`, `numpy`) instead of non-existent `face_recognition` import.
- **Face detector**: Document and handle RGB input from API (PIL); support grayscale; fix formatting.
- **Face encoder**: Expect RGB input and use `COLOR_RGB2GRAY`; add return type `List[float]`.
- **Face matcher**: Add type hints and guard for zero-norm vectors in `cosine_similarity`.

## Redis Setup (Required)

This feature uses Redis for QR nonce replay protection.

### Local setup
1. Install Redis
   - macOS: `brew install redis`
   - Ubuntu: `sudo apt install redis`
   - Windows: Use WSL or Docker (`docker run -p 6379:6379 redis`)
2. Start Redis:
   ```
   redis-server
   ```
3. Set env variable:
   ```
   REDIS_URL=redis://localhost:6379/0
   ```

### Production
Use a managed Redis provider (Upstash / Redis Cloud) and set:
```
REDIS_URL=redis://:<password>@<host>:<port>/<db>
```

### Fallback
If `REDIS_URL` is not set, the system falls back to MongoDB-based nonce storage with TTL indexes. Redis is recommended for production.

## Why It Was Needed

- Config and CORS should be env-driven for deployment.
- Proper shutdown of the ML HTTP client and Redis avoids connection leaks.
- Logging is preferable to print for production and debugging.
- Health check was failing because it imported a library the project does not use.
- Face pipeline receives RGB from the API; using BGR assumptions caused wrong color handling.
- QR attendance enables fast, secure check-ins without face recognition for environments that need it.

## How to Test

1. Set required env vars:
   ```
   QR_JWT_SECRET=your-secret-here
   REDIS_URL=redis://localhost:6379/0   # optional, falls back to MongoDB
   ENVIRONMENT=development              # for auto-verify during local testing
   ```
2. Run backend: `cd server/backend-api && python -m app.main`
3. Run ML service: `cd server/ml-service && python -m app.main`
4. Open `http://localhost:8001/health` — should return `models_loaded: true` and status `healthy`.
5. Mark attendance flow: use existing flow; thresholds come from env (optional: set `ML_CONFIDENT_THRESHOLD`, `ML_UNCERTAIN_THRESHOLD`).
6. QR flow:
   - As teacher: `GET /api/qr/generate?course_id=<id>` → returns signed JWT
   - As student: `POST /api/attendance/qr-mark` with `{qr_token, student_id}` → marks attendance
   - Second scan of same QR → 409 (replay detected)
   - Expired QR (>10s) → 401

## Type of Change

- [x] Bug fix (health check, RGB handling)
- [x] New feature (Dynamic QR Code attendance)
- [x] Code refactoring (logging, config, types)
- [x] Configuration (CORS, thresholds, Redis)

## Checklist

- [x] My code follows the project's style guidelines
- [x] I have performed a self-review of my code
- [x] I have commented my code where necessary
- [x] My changes generate no new warnings
- [x] I have added/updated tests as needed
- [x] All new and existing tests pass
- [x] No hardcoded secrets — all secrets come from env vars
- [x] `is_verified` defaults to `False` (env-gated for development)
- [x] `QR_JWT_SECRET` validated at startup
- [x] ObjectId inputs validated with proper HTTP 400 responses
- [x] Nonce consumed only after duplicate-attendance check (correct ordering)
