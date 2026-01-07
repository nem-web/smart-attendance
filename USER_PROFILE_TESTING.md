# User Profile Enhancement - Testing Guide

## Overview
This update adds a complete profile flow to the Clerk authentication system, collecting role-based information from users after signup.

## What Changed

### Backend Changes
1. **New Schema** (`backend/app/schemas/user.py`):
   - Added `UserProfileCreate`, `UserProfileUpdate`, and `UserProfileResponse` schemas
   - Support for role-based fields (student/teacher)

2. **New API Endpoints** (`backend/app/api/routes/user_profiles.py`):
   - `POST /user-profiles/` - Create user profile
   - `GET /user-profiles/{clerk_user_id}` - Get user profile
   - `PUT /user-profiles/{clerk_user_id}` - Update user profile
   - `DELETE /user-profiles/{clerk_user_id}` - Delete user profile

3. **Updated Main App** (`backend/app/main.py`):
   - Registered user_profiles router

### Frontend Changes
1. **New Page** (`frontend/src/pages/CompleteProfile.jsx`):
   - Role selection (Student/Teacher)
   - Branch/Department field (required for both)
   - Student-specific fields: Admission Year, Class/Semester, Roll Number
   - Teacher-specific fields: Designation, Assigned Classes/Subjects

2. **New API Client** (`frontend/src/api/userProfile.js`):
   - Functions to create, get, and update user profiles

3. **Updated App Router** (`frontend/src/App.jsx`):
   - Added `/complete-profile` route
   - Enhanced `ProtectedRoute` to check for profile completion
   - Updated `RedirectToHome` to check backend profile and redirect accordingly
   - Profile check prevents access to protected routes until profile is complete

4. **Updated Auth Flow**:
   - Register page now redirects to `/complete-profile` after signup
   - Login page redirects to `/` which determines destination based on profile

## User Flow

### New User Signup Flow
1. User visits `/register`
2. User signs up with Clerk (email/password or Google OAuth)
3. After successful Clerk signup, user is redirected to `/complete-profile`
4. User selects role (Student or Teacher)
5. User fills in branch/department
6. User fills in role-specific fields:
   - **Student**: Admission Year, Class/Semester, Roll Number
   - **Teacher**: Designation, Assigned Classes (comma-separated)
7. Form is validated and submitted to backend API
8. User's Clerk metadata is updated with role
9. User is redirected based on role:
   - Student → `/student-dashboard`
   - Teacher → `/dashboard`

### Returning User Login Flow
1. User visits `/login`
2. User signs in with Clerk
3. After successful login, user is redirected to `/`
4. App checks backend for user profile:
   - If profile exists → Redirect to role-based dashboard
   - If profile missing → Redirect to `/complete-profile`

### Route Protection
- All protected routes now check for profile completion
- If profile is incomplete, user is redirected to `/complete-profile`
- User cannot access main app until profile is complete

## Database Schema

### user_profiles Collection
```json
{
  "clerk_user_id": "user_abc123",
  "role": "student",
  "branch": "Computer Science",
  "admission_year": 2020,
  "class_semester": "Semester 5",
  "roll_number": "2020CS001",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

Or for teachers:
```json
{
  "clerk_user_id": "user_xyz789",
  "role": "teacher",
  "branch": "Computer Science",
  "designation": "Assistant Professor",
  "assigned_classes": ["Data Structures", "Algorithms"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Testing Instructions

### Prerequisites
1. MongoDB instance running
2. Clerk account set up with publishable key
3. Backend environment variables configured
4. Frontend environment variables configured

### Backend Testing

1. **Start Backend Server**:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Test API Endpoints** (using curl or Postman):
   
   Create Profile:
   ```bash
   curl -X POST http://localhost:8000/user-profiles/ \
     -H "Content-Type: application/json" \
     -d '{
       "clerk_user_id": "user_test123",
       "role": "student",
       "branch": "Computer Science",
       "admission_year": 2020,
       "class_semester": "Semester 5",
       "roll_number": "2020CS001"
     }'
   ```

   Get Profile:
   ```bash
   curl http://localhost:8000/user-profiles/user_test123
   ```

### Frontend Testing

1. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test Signup Flow**:
   - Navigate to `http://localhost:5173/register`
   - Sign up with email/password or Google
   - Verify redirect to `/complete-profile`
   - Select "Student" role
   - Fill in all required fields
   - Submit form
   - Verify redirect to `/student-dashboard`

3. **Test Teacher Signup**:
   - Repeat signup with a different email
   - Select "Teacher" role
   - Fill in teacher-specific fields
   - Verify redirect to `/dashboard`

4. **Test Login Flow**:
   - Log out
   - Log in with created credentials
   - Verify redirect to appropriate dashboard based on role

5. **Test Incomplete Profile Protection**:
   - Create a new Clerk user (via Clerk dashboard)
   - Try to log in with that user
   - Verify redirect to `/complete-profile`
   - Try to manually navigate to `/dashboard` or `/student-dashboard`
   - Verify redirect back to `/complete-profile`

### Edge Cases to Test

1. **Profile Already Exists**:
   - Try to access `/complete-profile` with a user who already has a profile
   - Should allow updating existing profile or redirect away

2. **Validation Errors**:
   - Try submitting form without selecting role
   - Try submitting without branch
   - Try submitting student form without student fields
   - Try submitting teacher form without teacher fields
   - Verify appropriate error messages

3. **API Errors**:
   - Stop backend server
   - Try to submit profile
   - Verify graceful error handling

## Validation Rules

### Common Fields (Both Roles)
- `role`: Required, must be "student" or "teacher"
- `branch`: Required, non-empty string

### Student Fields
- `admission_year`: Required, integer (2000-2099)
- `class_semester`: Required, non-empty string
- `roll_number`: Required, non-empty string

### Teacher Fields
- `designation`: Required, non-empty string
- `assigned_classes`: Required, array of strings (comma-separated input)

## Known Limitations

1. **No Profile Editing**: Users cannot edit their profile after creation from the UI (would need separate settings page)
2. **No Profile Validation on Backend Role Change**: If Clerk role metadata is changed manually, it won't automatically update backend profile
3. **No Duplicate Roll Number Check**: System doesn't prevent multiple students with same roll number

## Future Enhancements

1. Add profile editing capability in Settings page
2. Add profile picture upload during onboarding
3. Add email verification requirement before profile completion
4. Add admin panel to manage user profiles
5. Add profile deletion/account deletion flow
6. Add validation for unique roll numbers
7. Add sync between Clerk metadata and backend profile
