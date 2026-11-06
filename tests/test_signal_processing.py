import pytest
import numpy as np
from app.services.signal_processing import SignalProcessor

def test_time_features_calculation():
    # Test with standard sinusoidal wave
    fs = 12000.0
    t = np.linspace(0, 1.0, int(fs), endpoint=False)
    sig = 2.0 * np.sin(2 * np.pi * 50.0 * t)
    
    feats = SignalProcessor.extract_time_features(sig)
    
    assert abs(feats["mean"]) < 1e-2
    # For sine wave with amplitude A=2: RMS should be A / sqrt(2) ~ 1.414
    assert abs(feats["rms"] - (2.0 / np.sqrt(2))) < 0.05
    assert abs(feats["peak"] - 2.0) < 0.05
    # Crest factor for sine wave = peak / RMS = sqrt(2) ~ 1.414
    assert abs(feats["crest_factor"] - np.sqrt(2)) < 0.05

def test_frequency_features_fft():
    fs = 12000.0
    t = np.linspace(0, 1.0, int(fs), endpoint=False)
    # 120 Hz component
    sig = 1.5 * np.sin(2 * np.pi * 120.0 * t)
    
    feats, freqs, mags = SignalProcessor.extract_frequency_features(sig, fs=fs)
    
    assert abs(feats["dominant_frequency"] - 120.0) < 2.0
    assert len(freqs) == len(mags)
    assert len(freqs) > 0

def test_defect_frequencies_calculation():
    rpm = 1797.0
    freqs = SignalProcessor.calculate_defect_frequencies(rpm)
    
    # fr = 1797 / 60 ~ 29.95 Hz
    assert abs(freqs["shaft_frequency_hz"] - 29.95) < 0.1
    # SKF 6205 bearing: BPFO ~ 3.585 * fr ~ 107.4 Hz
    assert abs(freqs["bpfo_hz"] - (3.5848 * 29.95)) < 1.0
    # BPFI ~ 5.415 * fr ~ 162.2 Hz
    assert abs(freqs["bpfi_hz"] - (5.4152 * 29.95)) < 1.0
