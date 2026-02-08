from typing import List, Union

import numpy as np


def cosine_similarity(
    a: Union[List[float], np.ndarray],
    b: Union[List[float], np.ndarray],
) -> float:
    """Cosine similarity between two vectors (1 = identical, 0 = orthogonal)."""
    a_arr = np.asarray(a, dtype=np.float64)
    b_arr = np.asarray(b, dtype=np.float64)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))
