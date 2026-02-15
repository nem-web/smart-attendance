# Backend API - Smart Attendance System

Main backend API service for the Smart Attendance System. Handles all business logic, authentication, database operations, and orchestrates ML service calls.

## Features

- **User Authentication**: JWT-based authentication and authorization
- **Student Management**: CRUD operations for student profiles
- **Attendance Management**: Mark and track attendance
- **Subject/Class Management**: Manage subjects and enrolled students
- **Schedule Management**: Weekly timetable, recurring schedules, holidays
- **Teacher Settings**: Manage teacher preferences
- **Email Notifications**: Automated email notifications
- **Image Upload**: Cloudinary integration for face images
- **ML Orchestration**: Coordinates with ML service for face recognition

## Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB (Motor async driver)
- **Authentication**: JWT, OAuth
- **Image Storage**: Cloudinary
- **Email**: SMTP
- **HTTP Client**: httpx (for ML service)

## Architecture

```
Frontend → Backend API → ML Service
              ↓
           MongoDB
              ↓
          Cloudinary
```

## API Endpoints

### Authentication (`/api/auth`)

- `POST /login` - User login
- `POST /register` - User registration
- `POST /logout` - User logout
- `GET /me` - Get current user

### Students (`/api/students`)

- `GET /` - List students
- `POST /` - Create student
- `GET /{id}` - Get student details
- `PUT /{id}` - Update student
- `DELETE /{id}` - Delete student
- `POST /upload-face` - Upload student face image

### Attendance (`/api/attendance`)

- `POST /mark` - Mark attendance with classroom photo
- `POST /confirm` - Confirm attendance after review

### Analytics (`/api/analytics`)

- `GET /attendance-trend` - Get attendance trend for a class over time
  - Query params: `classId`, `dateFrom`, `dateTo`
- `GET /monthly-summary` - Get monthly attendance summary
  - Query params: `classId` (optional)
- `GET /class-risk` - Get classes with low attendance (<75%)

### Teacher Settings & Schedule (`/api/settings`)

- `GET /api/settings` – Get teacher profile, settings, and schedule
- `PATCH /api/settings` – Partially update teacher settings
- `PUT /api/settings` – Update teacher settings including full schedule

## Local Development

### Prerequisites

- Python 3.10+
- MongoDB (running locally or remotely)
- ML Service (running on port 8001)

### Installation

```bash
# Clone the repository
cd server/backend-api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run the service
python -m app.main
```

The service will be available at `http://localhost:8000`

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure MongoDB connection
3. Set up Cloudinary credentials
4. Configure SMTP for emails
5. Set ML service URL
6. Generate JWT secret key

## Docker Deployment

### Build Image

```bash
docker build -t backend-api:latest .
```

### Run Container

```bash
docker run -p 8000:8000 \
  --env-file .env \
  -e ML_SERVICE_URL=http://ml-service:8001 \
  backend-api:latest
```

### Docker Compose

```bash
# From server directory
docker-compose up backend-api
```

## Configuration

### Environment Variables

See `.env.example` for all configuration options.

**Required Variables:**

- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CLOUDINARY_*`: Cloudinary credentials
- `SMTP_*`: Email server configuration

**ML Service Configuration:**

- `ML_SERVICE_URL`: ML service endpoint (default: http://localhost:8001)
- `ML_SERVICE_TIMEOUT`: Request timeout in seconds (default: 30)
- `ML_SERVICE_MAX_RETRIES`: Number of retry attempts (default: 3)

**ML Thresholds:**

- `ML_CONFIDENT_THRESHOLD`: Distance threshold for confident match (default: 0.50)
- `ML_UNCERTAIN_THRESHOLD`: Distance threshold for uncertain match (default: 0.60)

## ML Service Integration

### ML Client

The `ml_client.py` module provides HTTP client for ML service communication:

```python
from app.services.ml_client import ml_client

# Encode single face
result = await ml_client.encode_face(
    image_base64=base64_image,
    validate_single=True
)

# Detect multiple faces
result = await ml_client.detect_faces(
    image_base64=base64_image,
    num_jitters=3
)

# Batch match faces
result = await ml_client.batch_match(
    detected_faces=[{"embedding": [...]}],
    candidate_embeddings=[...]
)
```

### Error Handling

The ML client includes:

- Automatic retry with exponential backoff
- Timeout handling
- Connection pooling
- Graceful error messages

### Circuit Breaker Pattern

If ML service is unavailable:

1. Request fails after max retries
2. Error is logged
3. User-friendly error returned
4. Service continues for non-ML operations

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  name: String,
  roll: String,
  role: String, // "student" | "teacher"
  createdAt: Date
}
```

### Students Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  name: String,
  verified: Boolean,
  face_embeddings: [[Float]], // 128-dimensional embeddings
  face_image_url: String,
  createdAt: Date
}
```

### Subjects Collection

```javascript
{
  _id: ObjectId,
  name: String,
  code: String,
  teacher_id: ObjectId,
  students: [
    {
      student_id: ObjectId,
      verified: Boolean,
      attendance: {
        present: Number,
        absent: Number,
        lastMarkedAt: Date
      }
    }
  ]
}
```

### Attendance Daily Collection

```javascript
{
  _id: ObjectId,
  classId: ObjectId,      // Reference to subject (class)
  subjectId: ObjectId,    // Same as classId
  teacherId: ObjectId,    // Teacher who marked attendance
  date: String,           // ISO date (YYYY-MM-DD)
  summary: {
    present: Number,
    absent: Number,
    late: Number,
    total: Number,
    percentage: Number    // Rounded to 2 decimals
  },
  createdAt: Date
}
```

## API Documentation

Interactive API docs available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Analytics Endpoints

The analytics endpoints provide aggregated attendance data from the `attendance_daily` collection.

#### Attendance Trend

Get daily attendance data for a specific class over a date range:

```bash
GET /api/analytics/attendance-trend?classId={classId}&dateFrom=2024-01-01&dateTo=2024-01-31
```

**Response:**

```json
{
  "classId": "507f1f77bcf86cd799439011",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "data": [
    {
      "date": "2024-01-15",
      "present": 22,
      "absent": 4,
      "late": 0,
      "total": 26,
      "percentage": 84.62
    }
  ]
}
```

#### Monthly Summary

Get monthly aggregated attendance data, optionally filtered by class:

```bash
GET /api/analytics/monthly-summary?classId={classId}
```

**Response:**

```json
{
  "data": [
    {
      "classId": "507f1f77bcf86cd799439011",
      "month": "2024-01",
      "totalPresent": 420,
      "totalAbsent": 80,
      "totalLate": 10,
      "totalStudents": 510,
      "daysRecorded": 20,
      "averagePercentage": 82.35
    }
  ]
}
```

#### Class Risk

Get classes with attendance percentage below 75%:

```bash
GET /api/analytics/class-risk
```

**Response:**

```json
{
  "data": [
    {
      "classId": "507f1f77bcf86cd799439011",
      "className": "Mathematics",
      "classCode": "MATH101",
      "attendancePercentage": 68.5,
      "totalPresent": 350,
      "totalAbsent": 160,
      "totalLate": 5,
      "totalStudents": 515,
      "lastRecorded": "2024-01-31"
    }
  ]
}
```

#### Global Stats

Get aggregated statistics for the logged-in teacher (requires authentication):

```bash
GET /api/analytics/global
Authorization: Bearer {token}
```

**Response:**

```json
{
  "overall_attendance": 82.35,
  "risk_count": 2,
  "top_subjects": [
    {
      "subjectId": "507f1f77bcf86cd799439011",
      "subjectName": "Computer Science",
      "subjectCode": "CS101",
      "attendancePercentage": 88.5,
      "totalPresent": 442,
      "totalAbsent": 58,
      "totalLate": 0,
      "totalStudents": 500
    },
    {
      "subjectId": "507f1f77bcf86cd799439012",
      "subjectName": "Mathematics",
      "subjectCode": "MATH101",
      "attendancePercentage": 72.3,
      "totalPresent": 361,
      "totalAbsent": 138,
      "totalLate": 1,
      "totalStudents": 500
    }
  ]
}
```

**Fields:**

- `overall_attendance`: Average attendance percentage across all teacher's subjects
- `risk_count`: Number of subjects with attendance below 75%
- `top_subjects`: List of all subjects sorted by attendance percentage (descending)

## Testing

### Run Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Run with coverage
pytest --cov=app
```

### Manual Testing

```bash
# Health check
curl http://localhost:8000/

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Mark attendance (requires auth token)
curl -X POST http://localhost:8000/api/attendance/mark \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,...", "subject_id": "..."}'
```

## Performance

### Optimization Strategies

1. **Database Indexing**
   - Index on userId, email for fast lookups
   - Index on subject_id for attendance queries

2. **Connection Pooling**
   - MongoDB connection pool (default: 100)
   - HTTP client connection pool to ML service

3. **Caching** (Future Enhancement)
   - Cache student embeddings
   - Cache subject data
   - Use Redis for session storage

### Resource Requirements

- **CPU**: 0.5-1 cores
- **Memory**: 512 MB - 1 GB
- **Network**: Low latency to ML service
- **Storage**: Minimal (images on Cloudinary)

## Monitoring

### Health Checks

```bash
curl http://localhost:8000/
```

### Metrics to Monitor

- API response times
- ML service call latencies
- Database query times
- Error rates
- Active connections

### Logging

Structured logging with request correlation:

```json
{
  "timestamp": "2024-01-20T10:30:00Z",
  "level": "INFO",
  "endpoint": "/api/attendance/mark",
  "user_id": "user_123",
  "duration_ms": 2500,
  "status": "success"
}
```

## Security

### Authentication

- JWT tokens with configurable expiration
- Password hashing with bcrypt
- Session management with secure cookies

### Authorization

- Role-based access control (RBAC)
- Teacher-only endpoints
- Student-only endpoints

### Best Practices

1. Use HTTPS in production
2. Set secure cookie flags
3. Implement rate limiting
4. Validate all inputs
5. Sanitize database queries
6. Store secrets in environment variables

## Deployment

### Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure production MongoDB
- [ ] Set up SSL/TLS certificates
- [ ] Configure production SMTP
- [ ] Set up Cloudinary production account
- [ ] Enable request logging
- [ ] Set up monitoring
- [ ] Configure backup strategy
- [ ] Test failover scenarios
- [ ] Document runbook

### Scaling

**Horizontal Scaling:**

```yaml
backend-api:
  deploy:
    replicas: 3
  environment:
    - ML_SERVICE_URL=http://ml-service:8001
```

**Load Balancing:**

- Use Nginx or AWS ALB
- Sticky sessions for authenticated users
- Health check on root endpoint

### Cloud Deployment

**AWS:**

- ECS/Fargate for containers
- RDS for MongoDB (or DocumentDB)
- ELB for load balancing
- CloudWatch for monitoring

**Google Cloud:**

- Cloud Run for containers
- MongoDB Atlas
- Cloud Load Balancing
- Cloud Logging

**Azure:**

- Container Instances
- Cosmos DB
- Application Gateway
- Application Insights

## Troubleshooting

### Common Issues

**1. ML Service Connection Errors**

```text
Error: ML Service communication error
```

Solution:

- Check ML service is running
- Verify ML_SERVICE_URL is correct
- Check network connectivity
- Review firewall rules

**2. MongoDB Connection Issues**

```text
Error: Could not connect to MongoDB
```

Solution:

- Verify MONGO_URI is correct
- Check MongoDB is running
- Check network access
- Verify credentials

**3. Cloudinary Upload Failures**

```text
Error: Failed to upload image
```

Solution:

- Check Cloudinary credentials
- Verify internet connectivity
- Check file size limits
- Review Cloudinary quota

## Development Workflow

1. Create feature branch
2. Implement changes
3. Write/update tests
4. Run linter: `black app/ && isort app/`
5. Run tests: `pytest`
6. Create pull request
7. Code review
8. Merge to main
9. Deploy to staging
10. Deploy to production

## Contributing

See main repository CONTRIBUTING.md

## License

See main repository LICENSE
