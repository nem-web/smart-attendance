# 🎓 Smart Attendance - Frontend

A modern, responsive React-based frontend application for the Smart Attendance System with facial recognition capabilities. This application provides an intuitive interface for teachers to manage attendance, view analytics, and monitor student performance.

## 🎨 UI Design Preview

Check out the complete UI design preview: **[https://app.banani.co/preview/n08pleRdJIZY](https://app.banani.co/preview/n08pleRdJIZY)**

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Components](#-components)
- [Theme System](#-theme-system)
- [Installation](#-installation)
- [Development](#-development)
- [Build & Deployment](#-build--deployment)
- [Styling Architecture](#-styling-architecture)
- [API Integration](#-api-integration)

## 🌟 Overview

The frontend application is built with React 19 and Vite, providing a fast and modern development experience. It features a clean, responsive UI with support for multiple themes and real-time camera integration for facial recognition-based attendance marking.

### Key Features

- 📸 **Webcam Integration**: Real-time camera access for capturing student photos
- 📊 **Dashboard Analytics**: Visual representation of attendance data and trends
- 👥 **Student Management**: Comprehensive list view with attendance tracking
- 🎨 **Multi-theme Support**: Light, Dark, and Soft themes with persistent preferences
- 🔐 **Teacher Authentication**: Secure login system for authorized access
- 📱 **Responsive Design**: Mobile-first design that works on all devices
- ⚡ **Fast Performance**: Built with Vite for lightning-fast HMR and build times

## 🛠️ Tech Stack

### Core Libraries

- **[React 19.2.0](https://react.dev/)** - Modern UI library with latest features
- **[Vite 7.2.4](https://vite.dev/)** - Next-generation frontend build tool
- **[React Router DOM 7.9.6](https://reactrouter.com/)** - Client-side routing solution

### UI & Styling

- **[Tailwind CSS 4.1.17](https://tailwindcss.com/)** - Utility-first CSS framework
- **[PostCSS](https://postcss.org/)** - CSS transformation tool
- **Custom CSS Variables** - Dynamic theming system

### Additional Libraries

- **[react-webcam 7.2.0](https://www.npmjs.com/package/react-webcam)** - Webcam component for React
- **[clsx 2.1.1](https://www.npmjs.com/package/clsx)** - Utility for constructing className strings

### Development Tools

- **[ESLint 9.39.1](https://eslint.org/)** - JavaScript linting
- **[@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react)** - Official React plugin for Vite

## 📁 Project Structure

```
frontend/
├── public/                     # Static assets served directly
│   └── (static files)
│
├── src/                        # Source code
│   ├── assets/                 # Images, icons, and media files
│   │   └── react.svg
│   │
│   ├── pages/                  # Page components (route-level)
│   │   ├── Dashboard.jsx       # Main dashboard with stats
│   │   ├── TeacherLogin.jsx    # Login page for teachers
│   │   ├── MarkAttendance.jsx  # Webcam interface for marking attendance
│   │   └── StudentList.jsx     # Table view of all students
│   │
│   ├── renderer/               # Renderer utilities and components
│   │   ├── index.jsx           # Renderer exports
│   │   └── styles.css          # Renderer-specific styles
│   │
│   ├── theme/                  # Theme management
│   │   └── ThemeContext.jsx    # Theme provider and hook
│   │
│   ├── App.jsx                 # Root component with routing
│   ├── main.jsx                # Application entry point
│   └── index.css               # Global styles and theme variables
│
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
├── eslint.config.js            # ESLint rules
├── postcss.config.js           # PostCSS configuration
└── README.md                   # This file
```

## 🧩 Components

### Page Components

#### 1. **Dashboard** (`src/pages/Dashboard.jsx`)

The main dashboard page that displays attendance overview and statistics.

**Features:**
- Total students count card
- Today's attendance statistics
- Average attendance percentage
- Attendance trend chart placeholder
- At-risk students list (students with <75% attendance)
- Quick action buttons to mark attendance or view student list

**Route:** `/`

```jsx
// Usage
import Dashboard from './pages/Dashboard';
<Route path="/" element={<Dashboard />} />
```

---

#### 2. **TeacherLogin** (`src/pages/TeacherLogin.jsx`)

Authentication page for teachers to access the system.

**Features:**
- Email and password input fields
- Form validation and submission
- Forgot password link
- Visual illustration of face recognition feature
- Responsive two-column layout

**Route:** `/login`

**State Management:**
- `email` - stores teacher's email input
- `password` - stores password input

```jsx
// API Integration (stub)
const submit = async (e) => {
  e.preventDefault();
  // POST to /api/login
  nav("/");
};
```

---

#### 3. **MarkAttendance** (`src/pages/MarkAttendance.jsx`)

Interactive page for marking attendance using webcam-based facial recognition.

**Features:**
- Live webcam preview using `react-webcam`
- Capture snapshot functionality
- Image preview before submission
- Upload captured image to backend
- Real-time status feedback
- Reset functionality

**Route:** `/mark`

**State Management:**
- `snap` - stores captured image as base64
- `status` - tracks upload/processing status

**Workflow:**
1. Allow camera access
2. Position students in frame
3. Click "Capture" to take snapshot
4. Review captured image
5. Click "Send to Server" to process
6. Backend detects faces and marks attendance

```jsx
// Capture image
const capture = useCallback(() => {
  const imageSrc = webcamRef.current.getScreenshot();
  setSnap(imageSrc);
}, [webcamRef]);

// Submit to backend
const submitImage = async () => {
  const res = await fetch("/api/attendance/mark", {
    method: "POST",
    body: JSON.stringify({ image: snap })
  });
};
```

---

#### 4. **StudentList** (`src/pages/StudentList.jsx`)

Comprehensive table view of all registered students with their attendance records.

**Features:**
- Sortable table with student data
- Photo placeholders for each student
- Roll number, name, and attendance percentage
- Action buttons for viewing detailed records
- Fetches data from backend API

**Route:** `/students`

**Data Structure:**
```javascript
{
  roll: "2101",
  name: "Ravi Kumar",
  attendance: 72  // percentage
}
```

**API Integration:**
```jsx
useEffect(() => {
  async function load() {
    const res = await fetch("/api/students");
    const data = await res.json();
    setStudents(data);
  }
  load();
}, []);
```

---

### Core Components

#### 5. **App** (`src/App.jsx`)

Root component that sets up routing and navigation.

**Features:**
- Top navigation bar with branding
- Theme selector dropdown
- React Router integration
- Route definitions for all pages

**Structure:**
```jsx
<div>
  <nav>
    {/* Navigation bar with theme selector */}
  </nav>
  <div>
    <Routes>
      {/* Route definitions */}
    </Routes>
  </div>
</div>
```

---

### Utility Components

#### 6. **ThemeContext** (`src/theme/ThemeContext.jsx`)

React Context provider for managing application themes.

**Features:**
- Three theme options: Light, Dark, Soft
- Persistent theme storage in localStorage
- Auto-apply theme on mount
- `useTheme` hook for accessing theme state

**API:**
```jsx
const { theme, setTheme, toggle } = useTheme();

// Available themes
- "light" (default)
- "dark"
- "soft"
```

**Usage:**
```jsx
import { useTheme } from './theme/ThemeContext';

function Component() {
  const { theme, setTheme } = useTheme();
  
  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="soft">Soft</option>
    </select>
  );
}
```

## 🎨 Theme System

The application uses a CSS variable-based theming system for consistent styling across all themes.

### Theme Variables

Located in `src/index.css`:

```css
:root {
  /* Light theme (default) */
  --color-primary: #3A7AFE;
  --color-primary-600: #205BDE;
  --color-bg: #F9FAFB;
  --color-surface: #FFFFFF;
  --color-text: #0F172A;
  --color-muted: #6B7280;
  --color-success: #31C48D;
  --color-warning: #FBBF24;
  --color-danger: #F87171;
}

[data-theme="dark"] {
  /* Dark theme overrides */
}

[data-theme="soft"] {
  /* Soft theme overrides */
}
```

### Reusable CSS Classes

The application provides utility classes for common UI elements:

- **`.btn-primary`** - Primary action button with blue background
- **`.btn-ghost`** - Secondary button with transparent background
- **`.card`** - Container card with shadow and rounded corners

### Using Theme Variables

```jsx
// In JSX
<div style={{ color: 'var(--color-primary)' }}>Text</div>

// In CSS/Tailwind
<div className="text-[var(--color-muted)]">Muted text</div>
```

## 🚀 Installation

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Steps

1. **Clone the repository** (if not already done)
   ```bash
   git clone https://github.com/nem-web/smart-attendance.git
   cd smart-attendance/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify installation**
   ```bash
   npm run lint
   ```

## 💻 Development

### Start Development Server

```bash
npm run dev
```

This will start the Vite development server at `http://localhost:5173` with:
- ⚡ Hot Module Replacement (HMR)
- 🔄 Fast Refresh for React components
- 📦 On-demand compilation

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

### Development Workflow

1. **Run the development server**
   ```bash
   npm run dev
   ```

2. **Make changes** to files in `src/`

3. **See changes** reflected instantly in the browser

4. **Lint your code** before committing
   ```bash
   npm run lint
   ```

### Backend Integration

The frontend expects the backend API to be running on `http://localhost:8000`. 

**Note:** For proper API proxying in Vite, you should configure the proxy in `vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

Make sure to start the backend server before testing API-dependent features.

## 🏗️ Build & Deployment

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder with:
- Minified JavaScript and CSS
- Code splitting for better performance
- Asset optimization
- Source maps (optional)

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally on `http://localhost:4173` for testing.

### Deployment Options

#### Option 1: Static Hosting (Recommended)

Deploy the `dist/` folder to any static hosting service:

- **Vercel**
  ```bash
  npm install -g vercel
  vercel --prod
  ```

- **Netlify**
  ```bash
  npm install -g netlify-cli
  netlify deploy --prod --dir=dist
  ```

- **GitHub Pages**
  ```bash
  npm run build
  # Push dist folder to gh-pages branch
  ```

#### Option 2: Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t smart-attendance-frontend .
docker run -p 80:80 smart-attendance-frontend
```

## 🎯 Styling Architecture

### Tailwind CSS

The project uses Tailwind CSS v4 with PostCSS for utility-first styling.

**Configuration:** `postcss.config.js`
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
}
```

### Custom Styles

Global styles are defined in `src/index.css`:

1. **Tailwind Import**
   ```css
   @import "tailwindcss";
   ```

2. **Theme Variables**
   ```css
   :root { /* CSS variables */ }
   ```

3. **Utility Classes**
   ```css
   .btn-primary { /* ... */ }
   .card { /* ... */ }
   ```

### Styling Best Practices

- Use Tailwind utility classes for layout and spacing
- Use CSS variables for theme-dependent colors
- Use custom classes (`.card`, `.btn-primary`) for reusable components
- Avoid inline styles unless absolutely necessary

## 🔌 API Integration

The frontend communicates with the backend through REST APIs.

### Base URL

Development: `http://localhost:8000` (via proxy)

### API Endpoints Used

#### 1. **Login**
```javascript
POST /api/login
Body: { email, password }
Response: { ok: true, token: "..." }
```

#### 2. **Get Students**
```javascript
GET /api/students
Response: [{ roll, name, attendance }, ...]
```

#### 3. **Mark Attendance**
```javascript
POST /api/attendance/mark
Body: { image: "base64..." }
Response: { ok: true, detected: [...], count: 2 }
```

### Fetch Examples

```javascript
// GET request
const response = await fetch('/api/students');
const data = await response.json();

// POST request
const response = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

## 🔧 Configuration Files

### `vite.config.js`

Vite configuration for React:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### `eslint.config.js`

ESLint configuration for code quality checks.

### `postcss.config.js`

PostCSS configuration for Tailwind CSS processing.

## 🐛 Troubleshooting

### Common Issues

1. **Camera not working**
   - Ensure you're using HTTPS or localhost
   - Check browser permissions for camera access
   - Verify camera is not in use by another application

2. **Theme not persisting**
   - Check localStorage is enabled in browser
   - Clear browser cache and try again

3. **API calls failing**
   - Verify backend server is running on port 8000
   - Check browser console for CORS errors
   - Ensure proxy configuration is correct

4. **Build errors**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again
   - Clear Vite cache: `rm -rf node_modules/.vite`

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Guide](https://vite.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com/)
- [React Webcam Package](https://www.npmjs.com/package/react-webcam)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run linting: `npm run lint`
5. Build to verify: `npm run build`
6. Commit your changes: `git commit -m "Add feature"`
7. Push to your fork: `git push origin feature/your-feature`
8. Open a Pull Request

## 📄 License

This project is part of the Smart Attendance System. See the main repository for license information.

---

Made with ❤️ by [nem-web](https://github.com/nem-web)
