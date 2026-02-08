# Improve: Python backend and ML service

Backend and ML service improvements: config, logging, health check, type hints, and RGB handling for face pipeline.

---

## What I Changed

- **Backend API**
  - **Config**: Use Pydantic `Settings` with `Config.env_file` and default values; CORS origins configurable via `CORS_ORIGINS` env (comma-separated).
  - **Main**: Use `ORIGINS` from config for CORS; add FastAPI `lifespan` to close `ml_client` on shutdown; add structured logging.
  - **Auth deps**: Catch JWT decode exceptions and return 401 instead of 500.
  - **Logging**: Replace `print()` with `logging` in auth, attendance, students, security, and email.
  - **Attendance**: Use `ML_CONFIDENT_THRESHOLD` and `ML_UNCERTAIN_THRESHOLD` from config instead of literals; remove debug prints.
- **ML Service**
  - **Health**: Check for actual stack (`cv2`, `mediapipe`, `numpy`) instead of non-existent `face_recognition` import.
  - **Face detector**: Document and handle RGB input from API (PIL); support grayscale; fix formatting.
  - **Face encoder**: Expect RGB input and use `COLOR_RGB2GRAY`; add return type `List[float]`.
  - **Face matcher**: Add type hints and guard for zero-norm vectors in `cosine_similarity`.

## Why It Was Needed

- Config and CORS should be env-driven for deployment.
- Proper shutdown of the ML HTTP client avoids connection leaks.
- Logging is preferable to print for production and debugging.
- Health check was failing because it imported a library the project does not use.
- Face pipeline receives RGB from the API; using BGR assumptions caused wrong color handling.

## How to Test

1. Run backend: `cd server/backend-api && python -m app.main`
2. Run ML service: `cd server/ml-service && python -m app.main`
3. Open `http://localhost:8001/health` — should return `models_loaded: true` and status `healthy`.
4. Mark attendance flow: use existing flow; thresholds come from env (optional: set `ML_CONFIDENT_THRESHOLD`, `ML_UNCERTAIN_THRESHOLD`).

## Type of Change

- [x] Bug fix (health check, RGB handling)
- [x] Code refactoring (logging, config, types)
- [x] Configuration (CORS, thresholds)
