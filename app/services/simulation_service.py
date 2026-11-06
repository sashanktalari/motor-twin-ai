import numpy as np
from typing import Dict, Any, List
from app.services.signal_processing import SignalProcessor
from app.schemas.simulation import SimulationConfig

class MotorSimulationEngine:
    """
    Physics-based synthetic mechanical vibration simulator for electrical induction motors.
    Simulates:
    - Fundamental rotational imbalance (1X, 2X, 3X harmonics)
    - Stator electrical line frequency hum (120 Hz)
    - Kinematic bearing defect impact impulses with structural resonance ringing:
      * Outer Race Fault: Periodic impacts at BPFO
      * Inner Race Fault: Periodic impacts at BPFI amplitude-modulated by rotor rotation (1X)
      * Ball Fault: Periodic impacts at 2*BSF amplitude-modulated by cage train rotation (FTF)
      * Abnormal Vibration / Mechanical Looseness: Subharmonic (0.5X) + severe harmonic distortion
    """

    @classmethod
    def run_simulation(cls, config: SimulationConfig) -> Dict[str, Any]:
        fs = float(config.sampling_rate_hz)
        duration = float(config.duration_seconds)
        rpm = float(config.rpm)
        fr = rpm / 60.0
        n_samples = int(fs * duration)
        t = np.linspace(0, duration, n_samples, endpoint=False)

        # Defect frequencies for SKF 6205-2RS bearing
        defect_freqs = SignalProcessor.calculate_defect_frequencies(rpm)
        bpfo = defect_freqs["bpfo_hz"]
        bpfi = defect_freqs["bpfi_hz"]
        bsf = defect_freqs["bsf_hz"]
        ftf = defect_freqs["ftf_hz"]

        # Base nominal vibration: 1X imbalance + 2X misalignment + 120Hz magnetic hum
        amp = float(config.amplitude_scaling)
        base_signal = (
            0.04 * amp * np.sin(2 * np.pi * fr * t) +
            0.015 * amp * np.sin(4 * np.pi * fr * t) +
            0.01 * amp * np.sin(2 * np.pi * 120.0 * t)
        )

        f_type = config.fault_type.strip()
        impact_signal = np.zeros_like(t)

        # Structural high-frequency resonance (bearing housing natural frequency ~ 3.2 kHz)
        fn_res = 3200.0
        decay_factor = 250.0

        if f_type == "Inner Race Fault":
            # Repetition rate = BPFI, amplitude modulated by 1X rotation
            # Generate impulse train
            T_bpfi = 1.0 / bpfi
            n_impacts = int(duration / T_bpfi)
            for k in range(n_impacts):
                tk = k * T_bpfi
                idx_start = int(tk * fs)
                idx_end = min(idx_start + int(0.005 * fs), n_samples)
                if idx_start < n_samples:
                    dt_k = t[idx_start:idx_end] - tk
                    # Amplitude modulation by rotor shaft position
                    mod = 1.0 + 0.65 * np.cos(2 * np.pi * fr * tk)
                    impact_signal[idx_start:idx_end] += (
                        0.35 * amp * mod * np.exp(-decay_factor * dt_k) * np.sin(2 * np.pi * fn_res * dt_k)
                    )

        elif f_type == "Outer Race Fault":
            # Repetition rate = BPFO, stationary defect (constant amplitude)
            T_bpfo = 1.0 / bpfo
            n_impacts = int(duration / T_bpfo)
            for k in range(n_impacts):
                tk = k * T_bpfo
                idx_start = int(tk * fs)
                idx_end = min(idx_start + int(0.005 * fs), n_samples)
                if idx_start < n_samples:
                    dt_k = t[idx_start:idx_end] - tk
                    impact_signal[idx_start:idx_end] += (
                        0.38 * amp * np.exp(-decay_factor * dt_k) * np.sin(2 * np.pi * 3500.0 * dt_k)
                    )

        elif f_type == "Ball Fault":
            # Repetition rate = 2*BSF, modulated by cage train frequency FTF
            T_ball = 1.0 / (2.0 * bsf)
            n_impacts = int(duration / T_ball)
            for k in range(n_impacts):
                tk = k * T_ball
                idx_start = int(tk * fs)
                idx_end = min(idx_start + int(0.004 * fs), n_samples)
                if idx_start < n_samples:
                    dt_k = t[idx_start:idx_end] - tk
                    mod = 1.0 + 0.5 * np.cos(2 * np.pi * ftf * tk)
                    impact_signal[idx_start:idx_end] += (
                        0.30 * amp * mod * np.exp(-decay_factor * dt_k) * np.sin(2 * np.pi * 2800.0 * dt_k)
                    )

        elif "Abnormal" in f_type or "Looseness" in f_type:
            # Sub-harmonics 0.5X, 1.5X, 2.5X and severe broadband distortion
            impact_signal = (
                0.25 * amp * np.sin(2 * np.pi * 0.5 * fr * t) +
                0.18 * amp * np.sin(2 * np.pi * 1.5 * fr * t) +
                0.15 * amp * np.sin(2 * np.pi * 2.5 * fr * t)
            )

        # Add Gaussian measurement noise
        noise_std = float(config.noise_level) * 0.1
        noise = np.random.normal(0, noise_std, n_samples) if noise_std > 0 else np.zeros_like(t)

        total_signal = base_signal + impact_signal + noise

        # Extract features
        summary_features = SignalProcessor.extract_all_features(total_signal, fs=fs)
        _, freqs, mags = SignalProcessor.extract_frequency_features(total_signal, fs=fs)

        # Downsample preview for UI
        step = max(1, n_samples // 800)
        preview_signal = [round(float(v), 5) for v in total_signal[::step]]
        preview_time = [round(float(v), 5) for v in t[::step]]

        # Subsample FFT spectrum to max 400 bins
        f_step = max(1, len(freqs) // 400)
        spectrum_freqs = [round(float(v), 1) for v in freqs[::f_step]]
        spectrum_mags = [round(float(v), 5) for v in mags[::f_step]]

        return {
            "is_simulated": True,
            "notice": "SIMULATED DATA — ARTIFICIALLY GENERATED (NOT ACTUAL SENSOR SAMPLES)",
            "simulation_category": f_type,
            "rpm": rpm,
            "sampling_rate_hz": fs,
            "sample_count": n_samples,
            "duration_seconds": duration,
            "rms": summary_features["rms"],
            "peak": summary_features["peak"],
            "crest_factor": summary_features["crest_factor"],
            "kurtosis": summary_features["kurtosis"],
            "dominant_frequency": summary_features["dominant_frequency"],
            "defect_frequencies": defect_freqs,
            "summary_features": summary_features,
            "time_axis": preview_time,
            "signal_preview": preview_signal,
            "spectrum_frequencies": spectrum_freqs,
            "spectrum_magnitudes": spectrum_mags
        }
