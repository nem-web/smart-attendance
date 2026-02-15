from app.ml.face_matcher import cosine_similarity


def test_cosine_similarity_identical():
    a = [1, 2, 3]
    b = [1, 2, 3]
    assert abs(cosine_similarity(a, b) - 1.0) < 1e-9


def test_cosine_similarity_orthogonal():
    a = [1, 0, 0]
    b = [0, 1, 0]
    assert abs(cosine_similarity(a, b)) < 1e-9


def test_cosine_similarity_opposite():
    a = [1, 0]
    b = [-1, 0]
    assert abs(cosine_similarity(a, b) + 1.0) < 1e-9


def test_cosine_similarity_zeros():
    a = [0, 0, 0]
    b = [1, 2, 3]
    assert cosine_similarity(a, b) == 0.0
