#!/bin/bash
set -e

echo "Starting ML Service initialization..."

# Download models if they don't exist
if [ ! -f "/app/app/ml/blaze_face_short_range.tflite" ]; then
    echo "Model file not found. Attempting to download..."
    python3 /app/download_models.py
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to download required model file."
        echo "Please ensure the model file is available or check network connectivity."
        exit 1
    fi
else
    echo "✓ Model file already exists"
fi

echo "Starting uvicorn server..."
exec "$@"
