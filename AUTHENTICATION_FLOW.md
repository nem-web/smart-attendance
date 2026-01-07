# User Authentication & Profile Flow

This document describes the complete authentication and profile completion flow in the Smart Attendance System.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NEW USER SIGNUP FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

    1. User visits /register
           │
           ▼
    2. Clerk SignUp Component
       (Email/Password or Google OAuth)
           │
           ▼
    3. Successful Clerk Signup
           │
           ▼
    4. Redirect to /complete-profile ◄─────────────┐
           │                                        │
           ▼                                        │
    5. User selects role:                          │
       ┌──────────────┬──────────────┐             │
       │   Student    │   Teacher    │             │
       └──────┬───────┴──────┬───────┘             │
              │              │                     │
              ▼              ▼                     │
    6. Fill in required fields:                    │
       STUDENT:              TEACHER:              │
       • Branch/Dept        • Branch/Dept          │
       • Admission Year     • Designation          │
       • Class/Semester     • Assigned Classes     │
       • Roll Number                               │
              │              │                     │
              └──────┬───────┘                     │
                     ▼                             │
    7. Submit profile form                         │
           │                                        │
           ▼                                        │
    8. Profile saved to MongoDB                    │
       (linked to Clerk user ID)                   │
           │                                        │
           ▼                                        │
    9. Clerk metadata updated with role            │
           │                                        │
           ▼                                        │
   10. Redirect based on role:                     │
       • Student → /student-dashboard              │
       • Teacher → /dashboard                      │
                                                    │
┌─────────────────────────────────────────────────┼──────────────────────┐
│                   RETURNING USER LOGIN FLOW      │                      │
└──────────────────────────────────────────────────┘                      │
                                                                           │
    1. User visits /login                                                  │
           │                                                               │
           ▼                                                               │
    2. Clerk SignIn Component                                              │
       (Email/Password or Google OAuth)                                    │
           │                                                               │
           ▼                                                               │
    3. Successful Clerk Login                                              │
           │                                                               │
           ▼                                                               │
    4. Redirect to /                                                       │
       (RedirectToHome component)                                          │
           │                                                               │
           ▼                                                               │
    5. Fetch user profile from backend                                     │
       (GET /user-profiles/{clerk_user_id})                                │
           │                                                               │
           ├─── Profile Found ───┐                                         │
           │                     │                                         │
           │                     ▼                                         │
           │            6a. Check role:                                    │
           │                • Student → /student-dashboard                 │
           │                • Teacher → /dashboard                         │
           │                                                               │
           └─── Profile NOT Found ───────────────────────────────────────┘
                     │
                     ▼
            6b. Redirect to /complete-profile

┌─────────────────────────────────────────────────────────────────────────┐
│                       ROUTE PROTECTION                                   │
└─────────────────────────────────────────────────────────────────────────┘

    User tries to access protected route
    (e.g., /dashboard, /student-dashboard)
           │
           ▼
    ProtectedRoute component checks:
           │
           ├─── User NOT signed in ───► Redirect to /login
           │
           ├─── User signed in ───┐
           │                      │
           │                      ▼
           │             Fetch user profile
           │                      │
           │                      ├─── Profile exists ───► Allow access
           │                      │
           │                      └─── Profile missing ───► Redirect to /complete-profile
           │
           └─── User on /complete-profile ───► Allow access (skip check)
```

## Key Components

### 1. Backend API Endpoints

**POST /user-profiles/**
- Creates a new user profile
- Validates role and required fields
- Stores profile linked to clerkUserId
- Returns created profile

**GET /user-profiles/{clerk_user_id}**
- Fetches user profile by Clerk user ID
- Returns 404 if profile not found
- Used by frontend to check profile completion

**PUT /user-profiles/{clerk_user_id}**
- Updates existing user profile
- Validates updated fields
- Returns updated profile

### 2. Frontend Components

**CompleteProfile.jsx**
- Role selection UI (Student/Teacher)
- Conditional form fields based on role
- Client-side validation
- API integration for profile creation
- Clerk metadata update
- Role-based redirect

**App.jsx - ProtectedRoute**
- Authentication check via Clerk
- Profile completion check via backend
- Redirects incomplete profiles to /complete-profile

**App.jsx - RedirectToHome**
- Determines user destination after login
- Checks backend profile for role
- Fallback to Clerk metadata
- Redirects to appropriate dashboard

### 3. Data Storage

**MongoDB Collection: user_profiles**
```javascript
{
  _id: ObjectId,
  clerk_user_id: String,     // Links to Clerk user
  role: String,              // "student" or "teacher"
  branch: String,            // Required for both
  
  // Student fields (optional, only for students)
  admission_year: Number,
  class_semester: String,
  roll_number: String,
  
  // Teacher fields (optional, only for teachers)
  designation: String,
  assigned_classes: [String],
  
  // Timestamps
  created_at: DateTime,
  updated_at: DateTime
}
```

**Clerk publicMetadata**
```javascript
{
  role: "student" | "teacher"  // Set after profile completion
}
```

## Security Considerations

1. **Clerk Handles Authentication**: No passwords or auth tokens stored in our backend
2. **Profile Linked to Clerk ID**: Each profile tied to immutable Clerk user ID
3. **Role Stored in Two Places**: 
   - Clerk publicMetadata (for client-side routing)
   - Backend database (source of truth)
4. **Protected Routes**: All routes check both authentication and profile completion
5. **No unsafeMetadata**: Only publicMetadata used for security
6. **Server-side Validation**: All profile data validated on backend

## Error Handling

### Scenario: User tries to create profile twice
- Backend checks for existing profile
- Returns 400 error
- Frontend shows error message

### Scenario: User loses connection during profile creation
- Form data preserved in component state
- User can retry submission
- No partial profiles created

### Scenario: User navigates away from /complete-profile
- Next protected route access redirects back
- Cannot access app without completing profile
- Login always works (returns to /complete-profile if needed)

### Scenario: Backend is down
- Frontend shows error message
- User can retry
- Clerk authentication still works
- User remains signed in

## Migration Notes

For existing users who signed up before this feature:
1. They have Clerk accounts but no backend profiles
2. On next login, they'll be redirected to /complete-profile
3. They fill in the profile form
4. Profile is created and they can access the app normally

## Testing Checklist

- [ ] New student signup flow
- [ ] New teacher signup flow
- [ ] Login with complete profile
- [ ] Login with incomplete profile
- [ ] Protected route access with profile
- [ ] Protected route access without profile
- [ ] Form validation (empty fields)
- [ ] Role-based redirects
- [ ] Google OAuth signup
- [ ] Profile creation API
- [ ] Profile fetch API
- [ ] Error handling
- [ ] Clerk metadata update
