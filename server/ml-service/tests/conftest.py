import sys
import os
from unittest.mock import Mock

# Add the parent directory to sys.path so tests can find 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Mock MediaPipe completely to avoid model file requirement during tests
def create_mock_mediapipe():
    """Create a complete mock of the mediapipe module"""
    mock_mp = Mock()
    
    # Mock mediapipe.Image
    mock_image_class = Mock()
    mock_image_class.return_value = Mock()
    mock_mp.Image = mock_image_class
    mock_mp.ImageFormat = Mock()
    mock_mp.ImageFormat.SRGB = "SRGB"
    
    # Mock tasks
    mock_tasks = Mock()
    
    # Mock python
    mock_python = Mock()
    mock_python.BaseOptions = Mock
    
    # Mock vision
    mock_vision = Mock()
    
    # Create mock detector
    mock_detector = Mock()
    mock_result = Mock()
    mock_result.detections = []
    mock_detector.detect.return_value = mock_result
    
    # Mock FaceDetector class
    mock_face_detector_class = Mock()
    mock_face_detector_class.create_from_options = Mock(return_value=mock_detector)
    mock_vision.FaceDetector = mock_face_detector_class
    
    # Mock other vision items
    mock_vision.RunningMode = Mock()
    mock_vision.RunningMode.IMAGE = "IMAGE"
    mock_vision.FaceDetectorOptions = Mock
    
    # Wire up the module structure
    mock_python.vision = mock_vision
    mock_tasks.python = mock_python
    mock_mp.tasks = mock_tasks
    
    return mock_mp

# Mock mediapipe modules before any app imports
if "mediapipe" not in sys.modules:
    sys.modules["mediapipe"] = create_mock_mediapipe()
    sys.modules["mediapipe.tasks"] = sys.modules["mediapipe"].tasks
    sys.modules["mediapipe.tasks.python"] = sys.modules["mediapipe"].tasks.python
    sys.modules["mediapipe.tasks.python.vision"] = sys.modules["mediapipe"].tasks.python.vision
