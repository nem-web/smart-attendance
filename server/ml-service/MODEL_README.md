# MediaPipe Model Setup

## BlazeFace Short Range Model

This service requires the MediaPipe BlazeFace Short Range model for face detection.

### Automatic Download (Recommended)

The model is automatically downloaded during Docker build using the `download_models.py` script.

**In Dockerfile:**
```dockerfile
RUN python3 download_models.py
```

This downloads `blaze_face_short_range.tflite` to `/app/app/ml/` during the build process.

### Manual Download (Development)

If you're running locally and the automatic download fails:

1. **Option 1: Run the download script**
   ```bash
   cd server/ml-service
   python3 download_models.py
   ```

2. **Option 2: Manual download from MediaPipe**
   - Visit: https://developers.google.com/mediapipe/solutions/vision/face_detector
   - Or: https://github.com/google/mediapipe
   - Download `blaze_face_short_range.tflite`
   - Place it in `server/ml-service/app/ml/`

3. **Option 3: Use wget/curl**
   ```bash
   cd server/ml-service/app/ml/
   wget https://storage.googleapis.com/mediapipe-assets/blaze_face_short_range.tflite
   ```

### Verification

After downloading, verify the model file exists:
```bash
ls -lh server/ml-service/app/ml/*.tflite
```

You should see:
```
blaze_face_short_range.tflite  (~200-300 KB)
```

### Troubleshooting

**FileNotFoundError in Docker:**
- Ensure the download script runs successfully during build
- Check Docker build logs for any download errors
- Verify `.dockerignore` doesn't exclude `.tflite` files (it doesn't)
- NOTE: `.tflite` files ARE excluded from git via `.gitignore` by design
  - This is intentional - models are downloaded at runtime, not committed
  - See the download_models.py script for automatic fetching

**403 Forbidden errors:**
- This is normal in restricted network environments
- The script tries multiple mirror URLs automatically
- In production (Render), downloads should work fine
- For local development, use manual download option

**Model file missing after build:**
- `.tflite` files are intentionally excluded from git (see `.gitignore`)
- The model must be downloaded using `download_models.py` or at runtime
- Ensure Dockerfile includes `RUN python3 download_models.py` or uses entrypoint.sh
- Rebuild the Docker image: `docker build --no-cache .`

### Why Not Commit the Model?

The model file (~300KB) is intentionally excluded from git via `.gitignore` because:
- Keeps repository size smaller
- Allows easy model updates
- Follows MediaPipe best practices
- Model is downloaded once during build, then cached in Docker layers
- Binary files in git cause merge conflicts and bloat history

The model is automatically fetched at build/runtime, ensuring it's always available without being tracked in version control.
