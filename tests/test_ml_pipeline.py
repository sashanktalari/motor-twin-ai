import pytest
import numpy as np
from app.ml.model_manager import model_manager
from app.ml.feature_extractor import MLFeatureExtractor, FEATURE_NAMES

def test_feature_extractor_structure():
    sig = np.random.normal(0, 1, 2048)
    vec = MLFeatureExtractor.extract_vector(sig, fs=12000.0)
    assert len(vec) == 17
    assert len(FEATURE_NAMES) == 17
    assert "peak_to_peak" in FEATURE_NAMES

def test_model_manager_inference():
    assert model_manager.is_loaded is True
    
    # Generate test normal-like signal
    t = np.linspace(0, 0.2, 2400)
    sig = 0.04 * np.sin(2 * np.pi * 30.0 * t) + 0.01 * np.random.normal(0, 1, len(t))
    
    # Predict with Random Forest
    rf_res = model_manager.predict(sig, fs=12000.0, model_name="random_forest")
    assert "predicted_fault" in rf_res
    assert "confidence" in rf_res
    assert rf_res["confidence"] >= 0.0
    assert abs(sum(rf_res["probabilities"].values()) - 1.0) < 0.05
    assert 0.0 <= rf_res["health_score"] <= 100.0
    
    # Predict with SVM
    svm_res = model_manager.predict(sig, fs=12000.0, model_name="svm")
    assert "predicted_fault" in svm_res
    assert svm_res["model_used"] == "svm"

    # Predict with KNN
    knn_res = model_manager.predict(sig, fs=12000.0, model_name="knn")
    assert "predicted_fault" in knn_res
    assert knn_res["model_used"] == "knn"
