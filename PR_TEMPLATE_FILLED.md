# PR Description

## Type of Change
- [x] Bug fix (backend dependencies, env setup)
- [x] New feature (Dynamic Credits page)
- [x] Documentation/Seed scripts

## Description
This PR addresses several issues to stabilize the local development environment and enhances the "Credits" page in the Settings.

### Key Changes:
1.  **Frontend (`frontend/src/pages/Settings.jsx`)**:
    *   Replaced the hardcoded "Shoutout" section with a dynamic list fetching real contributors from the GitHub API.
    *   Added a redirection check: Students accessing `/settings` are now redirected to `/student-profile`.
    *   Cleaned up unused imports.

2.  **Backend API (`server/backend-api`)**:
    *   **Dependency Fix**: Downgraded `bcrypt` to `4.0.1` to resolve the `AttributeError: module 'bcrypt' has no attribute '__about__'` crash when using `passlib`.
    *   **Seeding**: Added `seed_db.py` to easily populate the local MongoDB with demo users (`teacher@gmail.com`, `student@gmail.com`).

3.  **ML Service (`server/ml-service`)**:
    *   **Dependency Fix**: Downgraded `mediapipe` to `0.10.14` to ensure compatibility with the Windows environment and avoid `DLL load failed` errors.
    *   Updated `face_detector.py` imports to match the `mediapipe` version changes.

4.  **Configuration**:
    *   Updated `frontend/vite.config.js` to correctly proxy API requests to `localhost:8000` (removing the mismatched `/api` prefix).

## How to Test
1.  **Backend**:
    *   Run `pip install -r server/backend-api/requirements.txt`
    *   Run `pip install -r server/ml-service/requirements.txt`
    *   Start services.
2.  **Frontend**:
    *   Run `npm install` and `npm run dev`.
    *   Login as `teacher@gmail.com`.
    *   Go to **Settings** > **Credits**.
    *   Verify that the list of contributors is loaded from GitHub.

## Screenshots
(Add screenshots of the new Credits page here if desired)
