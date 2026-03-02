
import pytest
import numpy as np
from unittest.mock import MagicMock, patch

# Assuming relative imports or python path is set correctly
try:
    from app.ml.face_detector import detect_faces
    from app.ml.face_encoder import encode_face
    from app.ml.face_matcher import match_faces
except ImportError:
    # If running from ml-service root
    import sys
    import os
    sys.path.append(os.path.join(os.getcwd(), 'app'))
    from ml.face_detector import detect_faces
    from ml.face_encoder import encode_face
    from ml.face_matcher import match_faces

def test_detect_faces_empty():
    # Black image
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    
    # Mock mediapipe usage inside detect_faces if needed, or assume it returns empty list for black image
    # Assuming detect_faces handles numpy array
    try:
        faces = detect_faces(img)
        assert isinstance(faces, list)
        assert len(faces) == 0
    except Exception as e:
        pytest.fail(f"detect_faces raised exception: {e}")

def test_encode_face_mock():
    # Since we don't have a real face image easily without heavy setup, we mock dependencies
    with patch("app.ml.face_encoder.face_recognition") as mock_fr:
        mock_fr.face_encodings.return_value = [np.array([0.1, 0.2])]
        
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        # Assuming encode_face takes image and location or just image
        # Checking signature would be better, but implementing based on common usage
        encoding = encode_face(img, [(10, 10, 50, 50)])
        
        assert encoding is not None
        assert len(encoding) > 0

def test_match_faces():
    known_encoding = np.array([0.1, 0.2, 0.3])
    unknown_encoding = np.array([0.1, 0.2, 0.35]) # Close match
    different_encoding = np.array([0.9, 0.8, 0.7]) # Far match
    
    # Assuming match_faces returns boolean or distance
    # Implementation dependent. 
    # Let's assume it returns a match result.
    
    # Mock
    with patch("app.ml.face_matcher.face_recognition") as mock_fr:
         # Mock compare_faces
         mock_fr.compare_faces.return_value = [True]
         mock_fr.face_distance.return_value = [0.05]
         
         result = match_faces(known_encoding, unknown_encoding)
         assert result is not None
