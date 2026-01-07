# 🎓 Smart Attendance System

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/nem-web/smart-attendance?style=social)](https://github.com/nem-web/smart-attendance/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/nem-web/smart-attendance?style=social)](https://github.com/nem-web/smart-attendance/network/members)
[![GitHub issues](https://img.shields.io/github/issues/nem-web/smart-attendance)](https://github.com/nem-web/smart-attendance/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/nem-web/smart-attendance)](https://github.com/nem-web/smart-attendance/pulls)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**An intelligent, AI-powered attendance management system built with facial recognition technology**

[Features](#-features) • [Installation](#-installation) • [Documentation](#-api-documentation) • [Contributing](#-contributing) • [Demo](#-live-demo)

</div>

---

## 📖 About The Project

Smart Attendance is a modern, intelligent attendance management system designed for educational institutions. It leverages cutting-edge facial recognition technology to automate attendance tracking, making it faster, more accurate, and significantly easier to manage. The system provides real-time analytics, comprehensive dashboards, and intelligent reporting features for both teachers and students.

### Why Smart Attendance?

- ⏱️ **Save Time**: Automated attendance marking reduces manual work
- 🎯 **Improve Accuracy**: AI-powered facial recognition eliminates errors
- 📊 **Gain Insights**: Real-time analytics and predictive forecasting
- 🔐 **Stay Secure**: Modern Clerk authentication with email and Google OAuth
- 📱 **Access Anywhere**: Responsive design works on all devices

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [Usage](#-usage)
  - [For Teachers](#for-teachers)
  - [For Students](#for-students)
- [Docker Deployment](#-docker-deployment)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [Security](#-security)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Support](#-support)
- [Authors](#-authors)
- [Acknowledgments](#-acknowledgments)

---

## ✨ Features

### 🎓 For Teachers

- **📸 Facial Recognition Attendance**: Mark attendance using advanced facial recognition through webcam
- **👨‍🏫 Comprehensive Dashboard**: View attendance statistics, trends, and analytics at a glance
- **📊 Real-time Analytics**: Monitor total students, daily attendance, and average attendance rates
- **📈 Subject Management**: Manage multiple subjects and classes efficiently
- **👥 Student Management**: Add, view, and manage student records with attendance percentages
- **⚠️ At-Risk Detection**: Automatically identify students with low attendance (<75%)
- **📧 Email Notifications**: Send automated alerts to students with poor attendance
- **📅 Attendance Reports**: Generate and export detailed attendance reports
- **⚙️ Teacher Settings**: Customize notification preferences and profile settings
- **🔐 Clerk Authentication**: Secure authentication with email/password and Google OAuth via Clerk

### 🎓 For Students

- **📱 Student Dashboard**: Personal dashboard with attendance overview
- **📚 Subject View**: Track attendance across all enrolled subjects
- **📈 Attendance Forecast**: Predict future attendance and plan accordingly
- **👤 Profile Management**: View and update personal information
- **📊 Visual Analytics**: Charts and graphs showing attendance trends
- **🔔 Low Attendance Alerts**: Get notified when attendance falls below threshold

### 🎨 General Features

- **🎨 Theme Support**: Multiple theme options (Light, Dark, Soft) for better user experience
- **📱 Responsive Design**: Seamlessly works across desktop, tablet, and mobile devices
- **🔐 Clerk Authentication**: Modern authentication with email/password and social login (Google)
- **👤 Profile Completion**: Role-based onboarding with student/teacher specific fields
- **🛡️ Role-Based Access**: Automatic redirection to appropriate dashboards based on user role
- **💾 Cloud Storage**: Profile pictures stored securely on Cloudinary
- **🗄️ MongoDB Database**: Scalable and flexible data storage
- **🚀 High Performance**: Built with FastAPI for lightning-fast API responses

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2.0 | Modern UI library for building interactive interfaces |
| **React Router DOM** | 7.9.6 | Client-side routing and navigation |
| **Clerk** | Latest | Modern authentication with email and social login |
| **Vite** | 7.2.4 | Lightning-fast build tool and dev server |
| **Tailwind CSS** | 4.1.17 | Utility-first CSS framework for styling |
| **Material-UI** | 7.3.5 | React UI component library |
| **Recharts** | 3.5.1 | Composable charting library for data visualization |
| **React Webcam** | 7.2.0 | Webcam component for capturing images |
| **Axios** | 1.13.2 | Promise-based HTTP client |
| **TanStack Query** | 5.90.12 | Powerful data fetching and state management |
| **Lucide React** | 0.555.0 | Beautiful & consistent icon toolkit |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **FastAPI** | 0.115.5 | High-performance Python web framework |
| **Uvicorn** | 0.32.1 | Lightning-fast ASGI server |
| **MongoDB** | - | NoSQL database for flexible data storage |
| **Motor** | - | Asynchronous MongoDB driver for Python |
| **PyJWT** | - | JSON Web Token implementation |
| **Face Recognition** | 1.3.0 | Face recognition library built with dlib |
| **OpenCV** | - | Computer vision and image processing |
| **NumPy** | 1.26.4 | Numerical computing library |
| **Pillow** | 11.0.0 | Python Imaging Library |
| **Cloudinary** | - | Cloud-based image storage and management |
| **Passlib** | 1.7.4 | Password hashing library |
| **Python Dotenv** | - | Environment variable management |
| **Authlib** | - | OAuth and authentication library |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v8.0 or higher) - Comes with Node.js
- **Python** (v3.10 or higher) - [Download](https://www.python.org/)
- **pip** (Latest version) - Comes with Python
- **MongoDB** (v5.0 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/)
- **Modern web browser** with webcam support (Chrome, Firefox, Edge, Safari)

### Optional but Recommended

- **Docker** and **Docker Compose** - For containerized deployment
- **Virtual Environment** - For Python dependency isolation

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/nem-web/smart-attendance.git
cd smart-attendance
```

### Backend Setup

#### Step 1: Navigate to Backend Directory

```bash
cd backend
```

#### Step 2: Create and Activate Virtual Environment

**On Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### Step 3: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Note**: Installing `face-recognition` may take several minutes as it compiles dlib from source. Ensure you have CMake and build tools installed.

**For Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install build-essential cmake
```

**For macOS:**
```bash
brew install cmake
```

#### Step 4: Setup Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration (see [Environment Variables](#environment-variables) section).

#### Step 5: Start MongoDB

Ensure MongoDB is running on your system:

```bash
# On Ubuntu/Debian
sudo systemctl start mongod

# On macOS (with Homebrew)
brew services start mongodb-community

# Or run manually
mongod --dbpath /path/to/your/data/directory
```

#### Step 6: Run the Backend Server

```bash
# From the backend directory
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend server will start on `http://localhost:8000`

You can access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

Open a new terminal window:

#### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

#### Step 2: Install Dependencies

```bash
npm install
```

If you encounter any issues, try:
```bash
npm install --legacy-peer-deps
```

#### Step 3: Start Development Server

```bash
npm run dev
```

The frontend application will start on `http://localhost:5173`

#### Step 4: Build for Production (Optional)

```bash
npm run build
npm run preview
```

### Environment Variables

#### Backend (.env)

Create a `.env` file in the `backend` directory with the following variables:

```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017
MONGO_DB=smart_attendance

# JWT Configuration
JWT_SECRET=your-secret-key-here  # Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=60

# Session Configuration
SESSION_SECRET_KEY=your-secret-key-here  # Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
BACKEND_BASE_URL=http://127.0.0.1:8000
FRONTEND_BASE_URL=http://localhost:5173

# Cloudinary Configuration (for image storage)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Demo User Credentials (for testing)
TEACHER_EMAIL=teacher@gmail.com
TEACHER_PASSWORD=teacher123
STUDENT_EMAIL=student@gmail.com
STUDENT_PASSWORD=student123
```

#### Frontend (.env)

Create a `.env` file in the `frontend` directory:

```env
# Clerk Authentication (Required)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# Backend API URL
VITE_API_URL=http://localhost:8000
```

#### Important Notes:

1. **Clerk Authentication**: 
   - Sign up at [Clerk](https://clerk.com/)
   - Create a new application
   - Enable Email and Google OAuth providers
   - Copy your Publishable Key from the API Keys section
   - See `frontend/CLERK_SETUP.md` for detailed setup instructions
   - **Note**: User roles are now collected during signup via the Complete Profile page, not through Clerk metadata

2. **JWT_SECRET**: Generate a strong random secret:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. **Gmail SMTP**: 
   - Enable 2-factor authentication on your Gmail account
   - Generate an [App Password](https://myaccount.google.com/apppasswords)
   - Use the app password in `SMTP_PASS`

4. **Cloudinary**:
   - Sign up at [Cloudinary](https://cloudinary.com/)
   - Get your credentials from the dashboard

---

## 💻 Usage

### For Teachers

#### 1. Login/Register

- Navigate to `http://localhost:5173`
- Click **"Register"** to create a new account
- Sign up with Clerk authentication:
  - Use email/password authentication
  - Or click "Continue with Google" for Google OAuth
- After successful signup, you'll be directed to **Complete Your Profile**:
  - Select your role (Teacher or Student)
  - Enter your Branch/Department
  - Fill in role-specific fields:
    - **Teachers**: Designation, Assigned Classes/Subjects
    - **Students**: Admission Year, Class/Semester, Roll Number
- Submit the form to complete your registration
- You'll be automatically redirected to your role-based dashboard

#### 2. Dashboard Overview

After completing your profile, you'll see:
- **Total Students**: Number of students across all subjects
- **Today's Attendance**: Attendance marked today
- **Average Attendance**: Overall attendance percentage
- **At-Risk Students**: Students with attendance < 75%
- **Recent Activity**: Latest attendance records

#### 3. Managing Subjects

- Navigate to **Settings** → **Subjects**
- Click **"Add Subject"** to create a new subject
- Add subject name, code, and schedule
- Enroll students in subjects

#### 4. Adding Students

- Go to **"Add Students"** page
- Enter student details (name, email, roll number)
- Upload student photo for facial recognition
- Click **"Submit"** to add the student
- Students will receive an email invitation

#### 5. Marking Attendance

- Navigate to **"Mark Attendance"**
- Select the subject from dropdown
- Click **"Start Camera"** and allow camera access
- Position students in front of the camera
- Click **"Capture Photo"**
- Click **"Mark Attendance"**
- System will:
  - Detect faces in the image
  - Match faces with enrolled students
  - Mark attendance automatically
  - Show results with confidence scores

#### 6. Viewing Analytics

- Navigate to **"Analytics"** page
- View:
  - Daily attendance trends
  - Subject-wise attendance comparison
  - Monthly attendance heatmap
  - Student performance charts

#### 7. Generating Reports

- Go to **"Reports"** page
- Select date range
- Choose subject or all subjects
- Click **"Generate Report"**
- Export as PDF or CSV

#### 8. Settings & Preferences

- Navigate to **"Settings"**
- Update profile information
- Configure email notification preferences
- Set attendance threshold for alerts
- Manage subject and class settings

### For Students

#### 1. Login/Register

- Navigate to `http://localhost:5173`
- Click **"Register"** to create a new account
- Sign up with Clerk authentication:
  - Use email/password authentication
  - Or click "Continue with Google" for Google OAuth
- After successful signup, you'll be directed to **Complete Your Profile**:
  - Select **"Student"** as your role
  - Enter your Branch/Department
  - Fill in student-specific fields:
    - Admission Year
    - Class/Semester
    - Roll Number/Registration ID
- Submit the form to complete your registration
- You'll be automatically redirected to your student dashboard

#### 2. Student Dashboard

After completing your profile, view:
- **Overall Attendance**: Your attendance percentage
- **Subject-wise Attendance**: Attendance in each subject
- **Recent Classes**: Latest attendance records
- **Alerts**: Low attendance warnings

#### 3. View Subjects

- Navigate to **"Subjects"**
- See all enrolled subjects
- View attendance percentage per subject
- Check class schedule and timings

#### 4. Attendance Forecast

- Go to **"Forecast"** page
- View predicted attendance trends
- See required classes to maintain target percentage
- Plan accordingly to avoid low attendance

#### 5. Profile Management

- Navigate to **"Profile"**
- Update personal information
- Change profile picture
- View enrollment details

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

Create a `docker-compose.yml` file in the root directory:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: smart-attendance-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: smart_attendance

  backend:
    build: ./backend
    container_name: smart-attendance-backend
    ports:
      - "8000:8000"
    depends_on:
      - mongodb
    environment:
      MONGO_URI: mongodb://mongodb:27017
      MONGO_DB: smart_attendance
    env_file:
      - ./backend/.env
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    container_name: smart-attendance-frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    environment:
      VITE_API_URL: http://localhost:8000

volumes:
  mongodb_data:
```

#### Run with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Using Individual Docker Commands

#### Backend

```bash
cd backend
docker build -t smart-attendance-backend .
docker run -p 8000:8000 --env-file .env smart-attendance-backend
```

#### Frontend

```bash
cd frontend
docker build -t smart-attendance-frontend .
docker run -p 5173:5173 smart-attendance-frontend
```

---

## 📁 Project Structure

```
smart-attendance/
├── backend/                          # Backend API server
│   ├── app/
│   │   ├── api/                     # API routes
│   │   │   ├── routes/
│   │   │   │   ├── auth.py          # Authentication endpoints
│   │   │   │   ├── students.py      # Student management
│   │   │   │   ├── attendance.py    # Attendance marking
│   │   │   │   ├── classes.py       # Class management
│   │   │   │   ├── face.py          # Face recognition endpoints
│   │   │   │   ├── teacher_settings.py # Teacher preferences
│   │   │   │   └── users.py         # User management
│   │   │   └── deps.py              # API dependencies
│   │   ├── core/                    # Core configuration
│   │   │   ├── config.py            # App configuration
│   │   │   ├── security.py          # Security utilities
│   │   │   ├── email.py             # Email service
│   │   │   └── cloudinary_config.py # Cloud storage config
│   │   ├── db/                      # Database layer
│   │   │   ├── mongo.py             # MongoDB connection
│   │   │   ├── models.py            # Database models
│   │   │   ├── base.py              # Base repository
│   │   │   ├── session.py           # Session management
│   │   │   ├── subjects_repo.py     # Subject repository
│   │   │   └── teacher_settings_repo.py
│   │   ├── schemas/                 # Pydantic schemas
│   │   │   ├── user.py              # User schemas
│   │   │   ├── student.py           # Student schemas
│   │   │   ├── teacher.py           # Teacher schemas
│   │   │   ├── auth.py              # Authentication schemas
│   │   │   ├── attendance.py        # Attendance schemas
│   │   │   ├── face.py              # Face data schemas
│   │   │   ├── timetable.py         # Timetable schemas
│   │   │   └── teacher_settings.py  # Settings schemas
│   │   ├── services/                # Business logic
│   │   │   ├── face_recognition.py  # Face recognition service
│   │   │   ├── attendance.py        # Attendance logic
│   │   │   ├── students.py          # Student management
│   │   │   ├── subject_service.py   # Subject management
│   │   │   ├── email.py             # Email service
│   │   │   └── teacher_settings_service.py
│   │   ├── utils/                   # Utility functions
│   │   │   ├── face_detect.py       # Face detection
│   │   │   ├── face_encode.py       # Face encoding
│   │   │   ├── match_utils.py       # Face matching
│   │   │   ├── image.py             # Image processing
│   │   │   ├── jwt_token.py         # JWT utilities
│   │   │   ├── logging.py           # Logging configuration
│   │   │   └── utils.py             # General utilities
│   │   ├── static/                  # Static files
│   │   │   └── avatars/             # User profile pictures
│   │   └── main.py                  # Application entry point
│   ├── tests/                       # Test suite
│   │   ├── test_auth.py
│   │   └── test_attendance.py
│   ├── .env.example                 # Environment variables template
│   ├── Dockerfile                   # Docker configuration
│   ├── requirements.txt             # Python dependencies
│   └── alembic.ini                  # Database migration config
│
├── frontend/                        # Frontend React application
│   ├── public/                      # Public assets
│   │   ├── logo.png
│   │   └── logo-bg.png
│   ├── src/
│   │   ├── api/                     # API client
│   │   │   └── axios.js             # Axios configuration
│   │   ├── assets/                  # Images and resources
│   │   ├── components/              # Reusable components
│   │   │   ├── Header.jsx           # Navigation header
│   │   │   └── ...
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── pages/                   # Page components
│   │   │   ├── Dashboard.jsx        # Teacher dashboard
│   │   │   ├── Login.jsx            # Login page
│   │   │   ├── Register.jsx         # Registration page
│   │   │   ├── MarkAttendance.jsx   # Attendance marking
│   │   │   ├── StudentList.jsx      # Student listing
│   │   │   ├── AddStudents.jsx      # Add students
│   │   │   ├── Analytics.jsx        # Analytics page
│   │   │   ├── Reports.jsx          # Reports generation
│   │   │   ├── Settings.jsx         # Settings page
│   │   │   └── OAuthCallback.jsx    # OAuth callback
│   │   ├── students/                # Student portal
│   │   │   └── pages/
│   │   │       ├── StudentDashboard.jsx
│   │   │       ├── StudentSubjects.jsx
│   │   │       ├── StudentForecast.jsx
│   │   │       └── StudentProfile.jsx
│   │   ├── renderer/                # UI renderers
│   │   ├── theme/                   # Theme configuration
│   │   │   └── ThemeContext.jsx
│   │   ├── App.jsx                  # Main app component
│   │   ├── main.jsx                 # Application entry
│   │   └── index.css                # Global styles
│   ├── .gitignore
│   ├── index.html
│   ├── package.json                 # NPM dependencies
│   ├── package-lock.json
│   ├── vite.config.js               # Vite configuration
│   ├── eslint.config.js             # ESLint configuration
│   ├── postcss.config.js            # PostCSS configuration
│   └── vercel.json                  # Vercel deployment config
│
├── .github/                         # GitHub configuration
│   ├── ISSUE_TEMPLATE/
│   │   └── bug_report.md
│   └── pull_request_template.md
├── .gitignore                       # Git ignore rules
├── CODE_OF_CONDUCT.md               # Code of conduct
├── CONTRIBUTING.md                  # Contribution guidelines
├── README.md                        # This file
├── learn.md                         # Beginner's guide
└── diagram.drawio                   # Architecture diagram
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:8000
```

### Interactive Documentation
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Authentication

Authentication is now handled by Clerk on the frontend. The backend API endpoints may still require authentication tokens for certain operations. Clerk provides secure JWT tokens that can be used to authenticate API requests.

To get a user's session token in a Clerk-authenticated app:
```javascript
const { getToken } = useAuth();
const token = await getToken();
// Use token in Authorization header
```

All protected endpoints require a token in the Authorization header:
```
Authorization: Bearer <your-clerk-jwt-token>
```

**Note:** The legacy `/api/auth/register` and `/api/auth/login` endpoints are now replaced by Clerk's authentication flow. Users sign up and log in through Clerk's UI components.
```

### API Endpoints

#### Students

##### Get All Students
```http
GET /api/students
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Ravi Kumar",
    "email": "ravi@example.com",
    "roll_number": "2101",
    "profile_image": "https://cloudinary.com/...",
    "attendance_percentage": 85.5
  }
]
```

##### Add Student
```http
POST /api/students
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "name": "New Student",
  "email": "student@example.com",
  "roll_number": "2150",
  "photo": <file>
}
```

##### Get Student Details
```http
GET /api/students/{student_id}
Authorization: Bearer <token>
```

#### Attendance

##### Mark Attendance
```http
POST /api/attendance/mark
Authorization: Bearer <token>
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "subject_id": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "detected": [
    {
      "student_id": "507f1f77bcf86cd799439011",
      "name": "Ravi Kumar",
      "roll_number": "2101",
      "confidence": 0.95,
      "status": "present"
    }
  ],
  "not_detected": [
    {
      "student_id": "507f1f77bcf86cd799439012",
      "name": "Priya Singh",
      "roll_number": "2102"
    }
  ],
  "count": 1,
  "timestamp": "2025-01-15T10:30:00"
}
```

##### Get Attendance Records
```http
GET /api/attendance?subject_id={id}&date={YYYY-MM-DD}
Authorization: Bearer <token>
```

##### Get Student Attendance
```http
GET /api/attendance/student/{student_id}
Authorization: Bearer <token>
```

#### Subjects/Classes

##### Get All Subjects
```http
GET /api/classes
Authorization: Bearer <token>
```

##### Create Subject
```http
POST /api/classes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Data Structures",
  "code": "CS201",
  "students": ["507f1f77bcf86cd799439011"]
}
```

##### Get Subject Details
```http
GET /api/classes/{subject_id}
Authorization: Bearer <token>
```

#### Face Recognition

##### Upload Student Face
```http
POST /api/face/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "student_id": "507f1f77bcf86cd799439011",
  "image": <file>
}
```

##### Verify Face
```http
POST /api/face/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "student_id": "507f1f77bcf86cd799439011",
  "image": "data:image/jpeg;base64,..."
}
```

#### Teacher Settings

##### Get Settings
```http
GET /api/teacher-settings
Authorization: Bearer <token>
```

##### Update Settings
```http
PUT /api/teacher-settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "email_notifications": true,
  "attendance_threshold": 75,
  "notification_time": "09:00"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

#### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

#### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## 📸 Screenshots

### Teacher Dashboard
![Teacher Dashboard](https://via.placeholder.com/800x450?text=Teacher+Dashboard)
*Comprehensive overview of attendance statistics and analytics*

### Mark Attendance
![Mark Attendance](https://via.placeholder.com/800x450?text=Mark+Attendance)
*Real-time facial recognition attendance marking*

### Student List
![Student List](https://via.placeholder.com/800x450?text=Student+List)
*Manage and view all enrolled students*

### Analytics
![Analytics](https://via.placeholder.com/800x450?text=Analytics+Dashboard)
*Detailed attendance analytics and reports*

### Student Dashboard
![Student Dashboard](https://via.placeholder.com/800x450?text=Student+Dashboard)
*Student portal with attendance overview*

---

## 🤝 Contributing

We love contributions! Smart Attendance is an open-source project and we welcome contributions from developers of all skill levels. Whether you're fixing a bug, adding a feature, or improving documentation, your help is appreciated.

### How to Contribute

Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines on:
- Code of Conduct
- Setting up your development environment
- Making changes and creating pull requests
- Coding standards and best practices

### Quick Start for Contributors

1. **Fork the repository**
   ```bash
   # Click the 'Fork' button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/smart-attendance.git
   cd smart-attendance
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

4. **Make your changes**
   - Write clean, well-documented code
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   # or
   git commit -m "fix: resolve bug in attendance marking"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Submit!

### Contribution Areas

- 🐛 **Bug Fixes**: Found a bug? Fix it!
- ✨ **New Features**: Have an idea? Implement it!
- 📝 **Documentation**: Improve README, add tutorials
- 🎨 **UI/UX**: Enhance the user interface
- 🧪 **Testing**: Add unit tests, integration tests
- ♿ **Accessibility**: Make the app more accessible
- 🌐 **Internationalization**: Add multi-language support
- ⚡ **Performance**: Optimize code for better performance

### Development Guidelines

- Follow **PEP 8** for Python code
- Use **ESLint** for JavaScript/React code
- Write **meaningful commit messages**
- Add **comments** for complex logic
- Update **documentation** for new features
- **Test your changes** thoroughly
- Keep PRs **focused and small**

### Community

- 📢 **Discussions**: Join GitHub Discussions
- 🐛 **Issues**: Report bugs or request features
- 💬 **Discord**: Join our community server (coming soon)
- 📧 **Email**: Contact maintainers for questions

---

## 🔒 Security

### Security Best Practices

Smart Attendance implements several security measures:

✅ **Implemented:**
- Modern authentication via Clerk (email/password and Google OAuth)
- Secure session management with Clerk
- CORS protection
- Input validation with Pydantic
- Secure environment variable storage
- HTTPS support (in production)

⚠️ **Important Notes:**

1. **Never commit sensitive data** to version control
   - Use `.env` files for secrets
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Production Deployment:**
   - Change all default secrets and keys
   - Use strong, randomly generated passwords
   - Enable HTTPS/TLS
   - Set `https_only=True` in SessionMiddleware
   - Use secure MongoDB connection strings
   - Implement rate limiting
   - Add CSRF protection
   - Use security headers (Helmet.js equivalent)

3. **Database Security:**
   - Use MongoDB authentication
   - Restrict database access to backend only
   - Regular backups
   - Encrypt sensitive data at rest

4. **Face Recognition Data:**
   - Face embeddings are stored securely
   - Images are processed and discarded (not stored permanently)
   - Profile pictures stored on Cloudinary with access control

### Reporting Security Vulnerabilities

If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email the maintainers privately
3. Provide detailed information about the vulnerability
4. Allow time for a fix before public disclosure

We take security seriously and will respond promptly to all reports.

---

## 🗺️ Roadmap

### Version 1.0 (Current)
- [x] Basic facial recognition attendance
- [x] Teacher and student dashboards
- [x] MongoDB integration
- [x] Google OAuth login
- [x] Email notifications
- [x] Subject management
- [x] Attendance analytics
- [x] Reports generation

### Version 1.1 (In Progress)
- [ ] Mobile app (React Native)
- [ ] Improved face recognition accuracy
- [ ] Bulk student import (CSV/Excel)
- [ ] Attendance geofencing
- [ ] QR code backup attendance
- [ ] Multi-language support
- [ ] Dark mode improvements

### Version 2.0 (Planned)
- [ ] AI-powered attendance forecasting
- [ ] Integration with LMS (Moodle, Canvas)
- [ ] Video-based attendance (process video feed)
- [ ] Biometric integration
- [ ] Advanced analytics with ML insights
- [ ] Parent portal
- [ ] Mobile notifications (Push)
- [ ] Offline mode support

### Version 3.0 (Future)
- [ ] Multi-institution support
- [ ] API marketplace for third-party integrations
- [ ] Blockchain-based attendance records
- [ ] Advanced fraud detection
- [ ] Virtual/Remote class support with Zoom/Meet integration

### Community Requested Features
- Custom attendance policies per subject
- Proxy detection using advanced AI
- Attendance appeals/corrections workflow
- Integration with ID card systems
- Exam hall attendance mode
- Leave management system

Want to contribute to any of these? Check out our [issues](https://github.com/nem-web/smart-attendance/issues) page!

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 nem-web

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 Support

### Get Help

If you need help or have questions:

- 📖 **Documentation**: Read this README and [learn.md](./learn.md)
- 🐛 **Bug Reports**: [Open an issue](https://github.com/nem-web/smart-attendance/issues/new?template=bug_report.md)
- 💡 **Feature Requests**: [Request a feature](https://github.com/nem-web/smart-attendance/issues/new)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/nem-web/smart-attendance/discussions)
- 📧 **Email**: Contact the maintainers
- 🌐 **Community**: Join our Discord server (coming soon)

### FAQ

**Q: Does this work on mobile devices?**  
A: Yes! The web app is fully responsive and works on mobile browsers.

**Q: Can I use this for my school/college?**  
A: Absolutely! This is open-source software. Just follow the installation guide.

**Q: Is facial recognition accurate?**  
A: The system uses the `face_recognition` library with high accuracy. However, lighting and camera quality affect results.

**Q: Do I need a GPU for face recognition?**  
A: No, CPU is sufficient for small-scale deployments. GPU recommended for 100+ students.

**Q: Can I customize the attendance threshold?**  
A: Yes, teachers can set custom thresholds in Settings.

**Q: Is the data secure?**  
A: Yes, we use industry-standard security practices. See the [Security](#-security) section.

---

## 👥 Authors

### Main Contributors

- **nem-web** - *Project Creator & Lead Developer* - [GitHub](https://github.com/nem-web)

### Contributors

A big thank you to all our contributors! 🎉

[![Contributors](https://contrib.rocks/image?repo=nem-web/smart-attendance)](https://github.com/nem-web/smart-attendance/graphs/contributors)

Want to see your name here? Check out our [Contributing Guide](#-contributing)!

---

## 🙏 Acknowledgments

Special thanks to:

- **FastAPI** team for the amazing framework
- **React** team for the powerful UI library
- **face_recognition** library by Adam Geitgey
- All our **open-source contributors**
- Educational institutions testing this system
- The **open-source community** for invaluable feedback

### Built With Love Using

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - JavaScript library for user interfaces
- [MongoDB](https://www.mongodb.com/) - NoSQL database
- [face_recognition](https://github.com/ageitgey/face_recognition) - Face recognition library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vite](https://vitejs.dev/) - Next-generation frontend tooling
- [Cloudinary](https://cloudinary.com/) - Media management platform

---

## 🌐 Live Demo

### Try It Out

- **Frontend Demo**: [https://studentcheck.vercel.app](https://studentcheck.vercel.app)
- **UI Design Preview**: [https://app.banani.co/preview/n08pleRdJIZY](https://app.banani.co/preview/n08pleRdJIZY)
- **API Documentation**: Available at `/docs` endpoint when running locally

### Demo Credentials

```
Teacher Account:
Email: teacher@gmail.com
Password: teacher123

Student Account:
Email: student@gmail.com
Password: student123
```

**Note**: Demo deployment may have limited features. For full functionality, run locally.

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=nem-web/smart-attendance&type=Date)](https://star-history.com/#nem-web/smart-attendance&Date)

---

## 📊 Project Stats

![GitHub repo size](https://img.shields.io/github/repo-size/nem-web/smart-attendance)
![GitHub language count](https://img.shields.io/github/languages/count/nem-web/smart-attendance)
![GitHub top language](https://img.shields.io/github/languages/top/nem-web/smart-attendance)
![GitHub last commit](https://img.shields.io/github/last-commit/nem-web/smart-attendance)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/nem-web/smart-attendance)

---

<div align="center">

### ⭐ Star this repository if you find it helpful!

**Made with ❤️ for better education management**

[Report Bug](https://github.com/nem-web/smart-attendance/issues) · [Request Feature](https://github.com/nem-web/smart-attendance/issues) · [Contribute](./CONTRIBUTING.md)

</div>
