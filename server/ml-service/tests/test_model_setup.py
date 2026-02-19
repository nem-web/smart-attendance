"""Test model file setup and path resolution"""
import os
from pathlib import Path
import sys

# Add parent directory to path to import download_models
sys.path.insert(0, str(Path(__file__).parent.parent))

# Minimum expected model file size (BlazeFace model is ~200-300 KB)
# We use 1KB as a sanity check to detect obviously corrupted/placeholder files
MIN_MODEL_SIZE_BYTES = 1000  # 1 KB - very conservative threshold


def test_model_path_resolution():
    """Test that the model path is correctly resolved in face_detector"""
    from app.ml import face_detector
    
    # The model_path should be defined and absolute
    assert hasattr(face_detector, 'model_path')
    assert os.path.isabs(face_detector.model_path)
    
    # It should point to the expected filename
    assert face_detector.model_path.endswith('blaze_face_short_range.tflite')
    
    # BASE_DIR should be the ml directory
    assert hasattr(face_detector, 'BASE_DIR')
    assert face_detector.BASE_DIR.endswith('/ml') or face_detector.BASE_DIR.endswith('\\ml')


def test_model_file_exists():
    """Test that the model file exists (should be downloaded)"""
    from app.ml import face_detector
    
    # Model file must exist for the service to work
    # If this fails, the download_models.py script needs to be run
    model_path = Path(face_detector.model_path)
    
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model file not found at {model_path}. "
            f"Please run: python3 download_models.py"
        )
    
    # Verify it's not empty
    assert model_path.stat().st_size > 0, "Model file is empty"
    assert model_path.stat().st_size > MIN_MODEL_SIZE_BYTES, \
        f"Model file is too small ({model_path.stat().st_size} bytes, expected >{MIN_MODEL_SIZE_BYTES})"


def test_download_models_script_exists():
    """Test that the download_models.py script exists"""
    project_root = Path(__file__).parent.parent
    download_script = project_root / "download_models.py"
    
    assert download_script.exists(), "download_models.py script not found"
    
    # Verify it's executable
    content = download_script.read_text()
    assert 'def download_model' in content
    assert 'MODEL_URLS' in content or 'MODEL_URL' in content


def test_entrypoint_script_exists():
    """Test that the entrypoint.sh script exists"""
    project_root = Path(__file__).parent.parent
    entrypoint = project_root / "entrypoint.sh"
    
    assert entrypoint.exists(), "entrypoint.sh script not found"
    
    # Verify it's executable
    import stat
    file_stat = entrypoint.stat()
    assert file_stat.st_mode & stat.S_IXUSR, "entrypoint.sh is not executable"
