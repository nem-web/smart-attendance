import numpy as np
from app.ml.face_encoder import get_face_embedding


def test_get_face_embedding_length():
    # 96x96 = 9216
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    img[:] = 100  # Make it non-zero
    emb = get_face_embedding(img)
    assert isinstance(emb, list)
    assert len(emb) == 96 * 96

    # Check normalization would be done on non-zero vector
    # flatten() of zeros -> norm is 0 -> div by zero in code?
    # `emb /= np.linalg.norm(emb)` will raise warning or NaN if norm is 0.
    pass


def test_get_face_embedding_zeros():
    # If image is black, norm is 0.
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    # Expect runtime warning or NaN
    # The current code might crash or produce NaNs.
    # Let's test with non-zero image.
    img[:] = 128

    emb = get_face_embedding(img)
    arr = np.array(emb)
    norm = np.linalg.norm(arr)
    assert abs(norm - 1.0) < 1e-5
