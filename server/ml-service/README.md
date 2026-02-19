# ML Service - Smart Attendance System

Machine Learning microservice for face recognition operations in the Smart Attendance System.

## Features

- **Face Encoding**: Extract 128-dimensional face embeddings from images
- **Face Detection**: Detect multiple faces in classroom photos
- **Face Matching**: Match detected faces against student database
- **Batch Operations**: Process multiple faces efficiently
- **Stateless Design**: No database dependencies, pure ML operations
- **Scalable**: Can be deployed independently and scaled horizontally

## Tech Stack

- **Framework**: FastAPI
- **ML Library**: face_recognition (dlib-based)
- **Image Processing**: OpenCV, Pillow
- **Numerical Computing**: NumPy

## API Endpoints

### POST /api/ml/encode-face
Encode a single face from an image.

**Request:**
```json
{
  "image_base64": "base64_encoded_image",
  "validate_single": true,
  "min_face_area_ratio": 0.05,
  "num_jitters": 5
}
```

**Response:**
```json
{
  "success": true,
  "embedding": [128 floats],
  "face_location": {"top": 100, "right": 300, "bottom": 400, "left": 150},
  "metadata": {
    "face_area_ratio": 0.15,
    "image_dimensions": [640, 480]
  }
}
```

### POST /api/ml/detect-faces
Detect multiple faces in an image.

**Request:**
```json
{
  "image_base64": "base64_encoded_image",
  "min_face_area_ratio": 0.04,
  "num_jitters": 3,
  "model": "hog"
}
```

**Response:**
```json
{
  "success": true,
  "faces": [
    {
      "embedding": [128 floats],
      "location": {"top": 100, "right": 300, "bottom": 400, "left": 150},
      "face_area_ratio": 0.15
    }
  ],
  "count": 1,
  "metadata": {
    "image_dimensions": [1920, 1080],
    "processing_time_ms": 245
  }
}
```

### POST /api/ml/batch-match
Match multiple faces against candidate embeddings.

**Request:**
```json
{
  "detected_faces": [
    {"embedding": [128 floats]}
  ],
  "candidate_embeddings": [
    {
      "student_id": "student_id_1",
      "embeddings": [[128 floats], [128 floats]]
    }
  ],
  "confident_threshold": 0.50,
  "uncertain_threshold": 0.60
}
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "face_index": 0,
      "student_id": "student_id_1",
      "distance": 0.42,
      "status": "present"
    }
  ]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "ML Service",
  "version": "1.0.0",
  "models_loaded": true,
  "uptime_seconds": 3600
}
```

## Local Development

### Prerequisites

- Python 3.10+
- CMake (for building dlib)
- Build tools (gcc, g++)

### Installation

```bash
# Clone the repository
cd server/ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download required MediaPipe models
python3 download_models.py

# Copy environment file
cp .env.example .env

# Run the service
python -m app.main
```

The service will be available at `http://localhost:8001`

### MediaPipe Model Setup

The service requires the MediaPipe BlazeFace Short Range model for face detection.

**Automatic Download (Recommended):**
```bash
python3 download_models.py
```

**Manual Download:**
If automatic download fails (network restrictions), see [MODEL_README.md](MODEL_README.md) for alternative download methods.

**Docker Deployment:**
The model is automatically downloaded during container startup via the `entrypoint.sh` script.

### Testing

```bash
# Test health endpoint
curl http://localhost:8001/health

# Test face encoding (requires base64 image)
curl -X POST http://localhost:8001/api/ml/encode-face \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "YOUR_BASE64_IMAGE"}'
```

## Docker Deployment

### Prerequisites

The ML service requires the MediaPipe BlazeFace model, which is automatically downloaded during container startup.

### Build Image

```bash
docker build -t ml-service:latest .
```

The Dockerfile includes an entrypoint script that will download the model if it's not present.

### Run Container

```bash
docker run -p 8001:8001 \
  -e LOG_LEVEL=info \
  ml-service:latest
```

On first run, you'll see:
```
Starting ML Service initialization...
Model file not found. Attempting to download...
Downloading MediaPipe BlazeFace model from...
✓ Successfully downloaded blaze_face_short_range.tflite
Starting uvicorn server...
```

### Docker Compose

```bash
# From server directory
docker-compose up ml-service
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8001)
- `ML_MODEL`: Face detection model - "hog" (CPU) or "cnn" (GPU)
- `NUM_JITTERS`: Number of re-samplings for encoding (default: 5)
- `LOG_LEVEL`: Logging level (info, debug, warning, error)

## Performance Considerations

### Face Detection Models

- **HOG (Histogram of Oriented Gradients)**: CPU-friendly, faster, good for production
- **CNN (Convolutional Neural Network)**: GPU-required, slower, more accurate

### Optimization Tips

1. Use `num_jitters=1` for faster encoding (less accurate)
2. Use HOG model for CPU-based deployments
3. Scale horizontally for high load (multiple instances)
4. Consider GPU instances for CNN model
5. Implement result caching in frontend/backend

### Resource Requirements

- **CPU**: 1-2 cores recommended
- **Memory**: 1-2 GB RAM
- **Processing Time**: 
  - Single face encoding: ~500ms (CPU)
  - Detect 10 faces: ~1-2s (CPU)
  - Batch matching: ~50ms per student

## Scaling

### Horizontal Scaling

Deploy multiple instances behind a load balancer:

```yaml
# docker-compose.yml
ml-service:
  deploy:
    replicas: 3
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-service
  template:
    metadata:
      labels:
        app: ml-service
    spec:
      containers:
      - name: ml-service
        image: ml-service:latest
        ports:
        - containerPort: 8001
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

## Serverless Deployment

### AWS Lambda (with Container Support)

```dockerfile
# Dockerfile.lambda
FROM public.ecr.aws/lambda/python:3.10

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ${LAMBDA_TASK_ROOT}/app/

CMD ["app.lambda_handler.handler"]
```

### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/ml-service
gcloud run deploy ml-service --image gcr.io/PROJECT_ID/ml-service --memory 2Gi
```

## Monitoring

### Health Checks

- Endpoint: `GET /health`
- Frequency: Every 30 seconds
- Timeout: 10 seconds

### Metrics to Monitor

- Request latency (p50, p95, p99)
- Error rate
- Memory usage
- CPU usage
- Request throughput

### Logging

Logs are output to stdout in JSON format:

```json
{
  "timestamp": "2024-01-20T10:30:00Z",
  "level": "INFO",
  "message": "Face detection completed",
  "duration_ms": 245,
  "faces_detected": 5
}
```

## Troubleshooting

### Common Issues

**1. "Unable to open file at /app/app/ml/blaze_face_short_range.tflite"**
- **Cause**: MediaPipe model file is missing
- **Solution**: 
  - Local: Run `python3 download_models.py`
  - Docker: Ensure the entrypoint script runs (check Docker logs)
  - Manual: Download from MediaPipe and place in `app/ml/` directory
- **See**: [MODEL_README.md](MODEL_README.md) for detailed instructions

**2. "No face detected" errors**
- Ensure image contains a clear, frontal face
- Check image quality and lighting
- Adjust `min_face_area_ratio` parameter

**3. Slow performance**
- Use HOG model instead of CNN
- Reduce `num_jitters` parameter
- Scale horizontally

**4. High memory usage**
- Limit concurrent requests
- Use connection pooling
- Monitor for memory leaks

**5. Build failures**
- Ensure CMake and build tools are installed
- Check dlib installation logs
- Try using pre-built wheel packages

**6. Model download failures in Docker**
- Check network connectivity from container
- Verify no firewall blocking Google Cloud Storage
- If persistent, manually download model and rebuild image
- See [MODEL_README.md](MODEL_README.md) for manual download

## API Documentation

Interactive API docs available at:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Security

- No authentication required (handled by backend API)
- Should be deployed in private network
- Use firewall rules to restrict access
- Consider API gateway for production

## Contributing

See main repository CONTRIBUTING.md

## License

See main repository LICENSE
