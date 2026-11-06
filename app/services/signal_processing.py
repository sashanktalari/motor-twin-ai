import numpy as np
from scipy import signal as sp_signal
from scipy import stats as sp_stats
from typing import Dict, Any, Tuple, List
from app.core.config import settings

class SignalProcessor:
    """
    Scientific signal processing module for electrical motor vibration analysis.
    Implements standardized time-domain statistical moments, FFT spectral decomposition,
    and bearing defect kinematic frequency calculations.
    """

    @staticmethod
    def calculate_defect_frequencies(
        rpm: float,
        num_balls: int = settings.DEFAULT_BEARING_NUM_BALLS,
        ball_diameter_mm: float = settings.DEFAULT_BEARING_BALL_DIAMETER_MM,
        pitch_diameter_mm: float = settings.DEFAULT_BEARING_PITCH_DIAMETER_MM,
        contact_angle_deg: float = settings.DEFAULT_CONTACT_ANGLE_DEG
    ) -> Dict[str, float]:
        """
        Calculate theoretical bearing defect frequencies:
        - Shaft Rotational Frequency (f_r)
        - Ball Pass Frequency Outer Race (BPFO)
        - Ball Pass Frequency Inner Race (BPFI)
        - Ball Spin Frequency (BSF)
        - Fundamental Train Frequency (FTF / Cage)
        """
        fr = rpm / 60.0
        alpha_rad = np.radians(contact_angle_deg)
        d_over_D = (ball_diameter_mm / pitch_diameter_mm) * np.cos(alpha_rad)

        bpfo = (num_balls / 2.0) * fr * (1.0 - d_over_D)
        bpfi = (num_balls / 2.0) * fr * (1.0 + d_over_D)
        bsf = (pitch_diameter_mm / (2.0 * ball_diameter_mm)) * fr * (1.0 - d_over_D**2)
        ftf = (fr / 2.0) * (1.0 - d_over_D)

        return {
            "shaft_frequency_hz": round(float(fr), 2),
            "bpfo_hz": round(float(bpfo), 2),
            "bpfi_hz": round(float(bpfi), 2),
            "bsf_hz": round(float(bsf), 2),
            "ftf_hz": round(float(ftf), 2)
        }

    @staticmethod
    def extract_time_features(sig: np.ndarray) -> Dict[str, float]:
        """
        Extract 10 classical time-domain statistical features from a vibration signal window.
        """
        if len(sig) == 0:
            return {k: 0.0 for k in [
                "mean", "std", "variance", "rms", "peak_to_peak", "skewness", "kurtosis",
                "peak", "crest_factor", "shape_factor", "impulse_factor"
            ]}

        sig = np.asarray(sig, dtype=np.float64)
        mean_val = float(np.mean(sig))
        std_val = float(np.std(sig, ddof=1)) if len(sig) > 1 else 0.0
        var_val = float(np.var(sig, ddof=1)) if len(sig) > 1 else 0.0
        rms_val = float(np.sqrt(np.mean(sig**2)))
        peak_to_peak = float(np.ptp(sig))
        
        # Safe moments
        skew_val = float(sp_stats.skew(sig)) if std_val > 1e-12 else 0.0
        kurt_val = float(sp_stats.kurtosis(sig, fisher=False)) if std_val > 1e-12 else 3.0
        peak_val = float(np.max(np.abs(sig)))
        
        # Absolute mean amplitude
        mean_abs = float(np.mean(np.abs(sig))) + 1e-12
        rms_safe = rms_val + 1e-12

        crest_factor = float(peak_val / rms_safe)
        shape_factor = float(rms_val / mean_abs)
        impulse_factor = float(peak_val / mean_abs)

        return {
            "mean": round(mean_val, 6),
            "std": round(std_val, 6),
            "variance": round(var_val, 6),
            "rms": round(rms_val, 6),
            "peak_to_peak": round(peak_to_peak, 6),
            "skewness": round(skew_val, 4),
            "kurtosis": round(kurt_val, 4),
            "peak": round(peak_val, 6),
            "crest_factor": round(crest_factor, 4),
            "shape_factor": round(shape_factor, 4),
            "impulse_factor": round(impulse_factor, 4)
        }

    @staticmethod
    def extract_frequency_features(sig: np.ndarray, fs: float = 12000.0) -> Tuple[Dict[str, float], np.ndarray, np.ndarray]:
        """
        Compute FFT magnitude spectrum and frequency-domain metrics.
        Returns (spectral_features, frequencies, magnitudes).
        """
        sig = np.asarray(sig, dtype=np.float64)
        n = len(sig)
        if n == 0:
            return ({k: 0.0 for k in [
                "dominant_frequency", "spectral_centroid", "spectral_energy",
                "spectral_std", "spectral_skewness", "spectral_kurtosis"
            ]}, np.array([]), np.array([]))

        # Remove DC bias before FFT
        sig_centered = sig - np.mean(sig)
        
        # Real FFT
        fft_vals = np.fft.rfft(sig_centered)
        freqs = np.fft.rfftfreq(n, d=1.0 / fs)
        magnitudes = np.abs(fft_vals) / (n / 2.0)
        
        total_mag = np.sum(magnitudes) + 1e-12
        p_k = magnitudes / total_mag  # Spectral probability distribution

        # Dominant frequency
        dom_idx = int(np.argmax(magnitudes))
        dominant_freq = float(freqs[dom_idx]) if len(freqs) > 0 else 0.0

        # Spectral Centroid (mean frequency)
        spec_centroid = float(np.sum(freqs * p_k))

        # Spectral Variance / Std
        spec_var = float(np.sum(((freqs - spec_centroid)**2) * p_k))
        spec_std = float(np.sqrt(max(spec_var, 0.0)))

        # Spectral Skewness and Kurtosis
        spec_std_safe = spec_std if spec_std > 1e-12 else 1.0
        spec_skew = float(np.sum(((freqs - spec_centroid)**3) * p_k) / (spec_std_safe**3))
        spec_kurt = float(np.sum(((freqs - spec_centroid)**4) * p_k) / (spec_std_safe**4))

        # Spectral Energy
        spec_energy = float(np.sum(magnitudes**2))

        features = {
            "dominant_frequency": round(dominant_freq, 2),
            "spectral_centroid": round(spec_centroid, 2),
            "spectral_energy": round(spec_energy, 6),
            "spectral_std": round(spec_std, 2),
            "spectral_skewness": round(spec_skew, 4),
            "spectral_kurtosis": round(spec_kurt, 4)
        }

        return features, freqs, magnitudes

    @classmethod
    def extract_all_features(cls, sig: np.ndarray, fs: float = 12000.0) -> Dict[str, float]:
        """
        Combine all 16 time and frequency domain features into a single dictionary.
        """
        time_feats = cls.extract_time_features(sig)
        freq_feats, _, _ = cls.extract_frequency_features(sig, fs=fs)
        combined = {**time_feats, **freq_feats}
        return combined

    @classmethod
    def compute_spectrogram(
        cls, sig: np.ndarray, fs: float = 12000.0, nperseg: int = 256
    ) -> Dict[str, Any]:
        """
        Compute Short-Time Fourier Transform (STFT) spectrogram for time-frequency analysis.
        """
        sig = np.asarray(sig, dtype=np.float64)
        if len(sig) < nperseg:
            nperseg = max(len(sig) // 2, 32)
            
        f, t, Sxx = sp_signal.spectrogram(sig, fs=fs, nperseg=nperseg, noverlap=nperseg // 2)
        
        # Convert to dB scale and downsample for transmission if large
        Sxx_db = 10 * np.log10(np.maximum(Sxx, 1e-10))
        
        # Subsample to keep JSON payload manageable (max 40x40 grid)
        f_step = max(1, len(f) // 40)
        t_step = max(1, len(t) // 40)
        
        return {
            "frequencies": [round(float(val), 1) for val in f[::f_step]],
            "times": [round(float(val), 4) for val in t[::t_step]],
            "matrix": [[round(float(cell), 2) for cell in row[::t_step]] for row in Sxx_db[::f_step]]
        }
