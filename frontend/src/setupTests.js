import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('react-i18next', () => {
    // Define translations inside the factory so they are available
    const enTranslations = {
        "common": {
            "loading": "Loading...",
            "error": "Error"
        },
        "auth": {
            "signInTitle": "Sign in to your account",
            "emailLabel": "Email Address"
        },
        "login": {
            "title": "Login",
            "email_label": "Email Address",
            "email_placeholder": "Enter your email",
            "password_label": "Password",
            "password_placeholder": "Enter your password",
            "remember_me": "Remember me",
            "forgot_password": "Forgot Password?",
            "submit": "Sign In",
            "no_account": "Don't have an account?",
            "register_link": "Register",
            "hero_title": "Smart Attendance System",
            "hero_subtitle": "Efficiently manage and track attendance with our automated solution."
        },
        "register": {
            "title": "Register",
            "name_placeholder": "Full Name",
            "email_placeholder": "Email Address",
            "password_placeholder": "Password",
            "role_student": "I am a Student",
            "role_teacher": "I am a Teacher",
            "submit": "Register",
            "login_link": "Already have an account? Login",
            "branch": "Branch",
            "select_branch": "Select Branch",
            "year": "Year",
            "select_year": "Select Year",
            "roll_number": "Roll Number",
            "employee_id": "Employee ID",
            "phone_number": "Phone Number"
        },
        "dashboard": {
            "title": "Dashboard",
            "welcome": "Welcome back",
            "overview": "Overview",
            "total_students": "Total Students",
            "average_attendance": "Average Attendance",
            "reports": "Reports",
            "settings": "Settings"
        },
        "students": {
            "add_student": "Add Student",
            "list_title": "Student List",
            "name": "Name",
            "roll_number": "Roll Number",
            "email": "Email",
            "actions": "Actions"
        },
        "mark_attendance": {
            "title": "Mark Attendance",
            "select_subject": "Select Subject",
            "recognizing": "Recognizing faces...",
            "success": "Attendance Marked Successfully",
            "failed": "Failed to mark attendance"
        },
        "reports": {
            "title": "Attendance Reports",
            "export": "Export CSV",
            "date_range": "Date Range"
        },
        "settings": {
            "title": "Settings",
            "sidebar": {
                "heading": "System",
                "general": "General",
                "thresholds": "Thresholds",
                "profile": "Profile",
                "face_settings": "Face Recognition",
                "credits": "Credits",
                "logout": "Logout"
            },
            "profile": {
                 "add_subject_modal": {
                      "title": "Add Subject",
                      "name_label": "Subject Name",
                      "name_placeholder": "Enter subject name",
                      "code_label": "Subject Code",
                      "code_placeholder": "Enter subject code",
                      "cancel": "Cancel",
                      "add": "Add Subject"
                 }
            },
            "notifications": "Notifications",
            "save": "Save Changes"
        }
    };

    return {
        useTranslation: () => ({
            t: (key) => {
                if (!key) return '';
                const keys = key.split('.');
                let result = enTranslations;
                for (const k of keys) {
                    if (result && typeof result === 'object' && k in result) {
                        result = result[k];
                    } else {
                        // Key not found
                        return key;
                    }
                }
                if (typeof result === 'object') return key; // return key if it points to an object (incomplete path)
                return result;
            },
            i18n: {
                changeLanguage: () => new Promise(() => { }),
                language: 'en',
            },
        }),
        initReactI18next: {
            type: '3rdParty',
            init: () => { }
        }
    };
});

afterEach(() => {
  cleanup();
});

// Mock ResizeObserver if needed by some components (charts etc)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
