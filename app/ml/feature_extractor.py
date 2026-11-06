import numpy as np
from typing import List, Dict, Any, Tuple
from app.services.signal_processing import SignalProcessor

FEATURE_NAMES = [
    "mean",
    "std",
    "variance",
    "rms",
    "peak_to_peak",
    "skewness",
    "kurtosis",
    "peak",
    "crest_factor",
    "shape_factor",
    "impulse_factor",
    "dominant_frequency",
    "spectral_centroid",
    "spectral_energy",
    "spectral_std",
    "spectral_skewness",
    "spectral_kurtosis"
]

class MLFeatureExtractor:
    """
    Standardized feature extraction pipeline for machine learning training and inference.
    Guarantees feature ordering consistency across all estimators.
    """

    @staticmethod
    def extract_vector(sig_window: np.ndarray, fs: float = 12000.0) -> List[float]:
        """
        Extracts 17-element feature vector in exact canonical order.
        """
        feats = SignalProcessor.extract_all_features(sig_window, fs=fs)
        return [float(feats[name]) for name in FEATURE_NAMES]

    @classmethod
    def extract_matrix(
        cls, windows: List[np.ndarray], fs: float = 12000.0
    ) -> np.ndarray:
        """
        Extracts 2D feature matrix (N_samples x 17_features) from a list of signal windows.
        """
        rows = [cls.extract_vector(w, fs=fs) for w in windows]
        return np.array(rows, dtype=np.float64)
