import os
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
from scipy import io as sp_io
from app.core.config import settings
from app.services.signal_processing import SignalProcessor

class DatasetService:
    """
    Manages loading, parsing, and preprocessing of vibration datasets,
    with native support for Case Western Reserve University (CWRU) MATLAB .mat
    and comma-separated .csv vibration files.
    """

    @staticmethod
    def parse_mat_file(filepath: Path) -> Dict[str, Any]:
        """
        Extract Drive End (DE) and Fan End (FE) vibration signals from CWRU .mat structures.
        """
        try:
            mat = sp_io.loadmat(str(filepath))
        except Exception as e:
            raise ValueError(f"Failed to parse MATLAB file '{filepath.name}': {str(e)}")

        de_signal = None
        fe_signal = None
        rpm = settings.DEFAULT_RATED_RPM

        for key, val in mat.items():
            if "__" in key:
                continue
            k_upper = key.upper()
            if "DE_TIME" in k_upper or ("DE" in k_upper and isinstance(val, np.ndarray) and val.ndim in (1, 2)):
                arr = val.flatten()
                if len(arr) > 100:
                    de_signal = arr
            elif "FE_TIME" in k_upper or ("FE" in k_upper and isinstance(val, np.ndarray) and val.ndim in (1, 2)):
                arr = val.flatten()
                if len(arr) > 100:
                    fe_signal = arr
            elif "RPM" in k_upper:
                try:
                    rpm_val = float(val.flatten()[0])
                    if 300.0 <= rpm_val <= 3600.0:
                        rpm = rpm_val
                except Exception:
                    pass

        # If standard keys were not matched, find first numerical 1D/2D array with sufficient samples
        if de_signal is None:
            for key, val in mat.items():
                if not key.startswith("__") and isinstance(val, np.ndarray):
                    arr = val.flatten()
                    if np.issubdtype(arr.dtype, np.number) and len(arr) > 500:
                        de_signal = arr
                        break

        if de_signal is None:
            raise ValueError(f"No suitable 1D vibration time-series array found in '{filepath.name}'")

        # CWRU standard sampling frequency is 12,000 Hz (or 48,000 Hz for certain drive end setups)
        sampling_rate = 12000.0

        return {
            "signal": de_signal.astype(np.float64),
            "fe_signal": fe_signal.astype(np.float64) if fe_signal is not None else None,
            "rpm": rpm,
            "sampling_rate_hz": sampling_rate,
            "total_samples": len(de_signal)
        }

    @staticmethod
    def parse_csv_file(filepath: Path) -> Dict[str, Any]:
        """
        Parse CSV formatted vibration signals. Accepts single-column raw vibration
        or multi-column with headers (e.g. 'vibration', 'DE', 'amplitude').
        """
        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            raise ValueError(f"Failed to read CSV file '{filepath.name}': {str(e)}")

        target_col = None
        for col in df.columns:
            c_str = str(col).lower()
            if any(term in c_str for term in ["vibration", "de", "signal", "accel", "amplitude", "drive_end"]):
                target_col = col
                break
        
        if target_col is None:
            # Fall back to first numerical column
            num_cols = df.select_dtypes(include=[np.number]).columns
            if len(num_cols) > 0:
                target_col = num_cols[0]
            else:
                raise ValueError(f"No numerical vibration column identified in CSV '{filepath.name}'")

        sig = df[target_col].dropna().to_numpy(dtype=np.float64)
        if len(sig) < 100:
            raise ValueError(f"Signal in '{filepath.name}' has fewer than 100 samples.")

        return {
            "signal": sig,
            "rpm": settings.DEFAULT_RATED_RPM,
            "sampling_rate_hz": 12000.0,
            "total_samples": len(sig)
        }

    @classmethod
    def load_signal_file(cls, filepath: Path) -> Dict[str, Any]:
        """
        Dispatches loader according to extension.
        """
        ext = filepath.suffix.lower()
        if ext == ".mat":
            return cls.parse_mat_file(filepath)
        elif ext in [".csv", ".txt"]:
            return cls.parse_csv_file(filepath)
        else:
            raise ValueError(f"Unsupported file format '{ext}'. Must be .mat or .csv")

    @classmethod
    def segment_signal(
        cls,
        sig: np.ndarray,
        window_size: int = 2048,
        stride: int = 1024
    ) -> List[np.ndarray]:
        """
        Partition continuous 1D vibration signal into segmented windows.
        """
        sig = np.asarray(sig, dtype=np.float64)
        n = len(sig)
        if n < window_size:
            # Pad with reflect or repeat if shorter
            padded = np.pad(sig, (0, window_size - n), mode='reflect')
            return [padded]

        windows = []
        for i in range(0, n - window_size + 1, stride):
            windows.append(sig[i : i + window_size])
        return windows
