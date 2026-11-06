import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import joblib
import numpy as np

from app.core.config import settings
from app.core.logging import logger
from app.ml.feature_extractor import MLFeatureExtractor, FEATURE_NAMES
from app.services.signal_processing import SignalProcessor

class ModelManager:
    """
    Manages loading, caching, and inference of trained scikit-learn models:
    - Random Forest Classifier
    - Support Vector Machine (RBF)
    - Isolation Forest Anomaly Detector
    """

    def __init__(self):
        self.models_dir = settings.MODELS_DIR
        self._scaler = None
        self._rf_model = None
        self._svm_model = None
        self._knn_model = None
        self._iso_forest = None
        self._metrics = None
        self._is_loaded = False
        self.load_models()

    def load_models(self) -> bool:
        scaler_p = self.models_dir / "scaler.joblib"
        rf_p = self.models_dir / "rf_model.joblib"
        svm_p = self.models_dir / "svm_model.joblib"
        knn_p = self.models_dir / "knn_model.joblib"
        iso_p = self.models_dir / "isolation_forest.joblib"
        metrics_p = self.models_dir / "metrics.json"

        if rf_p.exists() and svm_p.exists() and scaler_p.exists():
            try:
                self._scaler = joblib.load(scaler_p)
                self._rf_model = joblib.load(rf_p)
                self._svm_model = joblib.load(svm_p)
                if knn_p.exists():
                    self._knn_model = joblib.load(knn_p)
                if iso_p.exists():
                    self._iso_forest = joblib.load(iso_p)
                if metrics_p.exists():
                    with open(metrics_p, "r") as f:
                        self._metrics = json.load(f)
                self._is_loaded = True
                logger.info("Successfully loaded ML models (Random Forest, SVM, KNN, Isolation Forest).")
                return True
            except Exception as e:
                logger.error(f"Error loading trained models: {str(e)}", exc_info=True)
                self._is_loaded = False
                return False
        else:
            self._is_loaded = False
            return False

    @property
    def is_loaded(self) -> bool:
        if not self._is_loaded:
            return self.load_models()
        return True

    def predict(
        self,
        signal_segment: np.ndarray,
        fs: float = 12000.0,
        model_name: str = "random_forest"
    ) -> Dict[str, Any]:
        """
        Runs complete inference pipeline:
        1. Feature extraction (16 features)
        2. Feature normalization using fitted StandardScaler
        3. Multi-class prediction & probability distribution
        4. Isolation Forest anomaly scoring
        5. ISO 10816-calibrated health score computation
        """
        if not self.is_loaded:
            raise RuntimeError(
                "ML model artifacts not found. Please train models first using the Model Performance module or app.ml.train."
            )

        # 1. Feature extraction
        raw_features_dict = SignalProcessor.extract_all_features(signal_segment, fs=fs)
        feature_vector = np.array([[raw_features_dict[k] for k in FEATURE_NAMES]], dtype=np.float64)

        # 2. Scaling
        scaled_vector = self._scaler.transform(feature_vector)

        # 3. Model selection
        m_name = model_name.lower().replace("-", "_").strip()
        if m_name in ["knn", "k_nearest_neighbors"]:
            clf = self._knn_model if self._knn_model is not None else self._rf_model
        elif m_name in ["svm", "support_vector_machine"]:
            clf = self._svm_model
        else:
            clf = self._rf_model

        # Multi-class inference
        pred_label = str(clf.predict(scaled_vector)[0])
        classes = list(clf.classes_)
        probabilities_raw = clf.predict_proba(scaled_vector)[0]
        prob_dict = {cls_name: round(float(p), 4) for cls_name, p in zip(classes, probabilities_raw)}
        confidence = prob_dict.get(pred_label, float(np.max(probabilities_raw)))

        # 4. Anomaly detection via Isolation Forest
        anomaly_score = 0.0
        is_anomaly = False
        if self._iso_forest:
            # decision_function: positive = inlier, negative = outlier
            dec_func = float(self._iso_forest.decision_function(scaled_vector)[0])
            anomaly_score = round(dec_func, 4)
            is_anomaly = bool(self._iso_forest.predict(scaled_vector)[0] == -1)

        # 5. Scientific Health Score Calculation
        rms_val = raw_features_dict["rms"]
        health_score, severity = self.calculate_health_score(
            pred_fault=pred_label,
            confidence=confidence,
            rms_vibration=rms_val,
            is_anomaly=is_anomaly
        )

        return {
            "predicted_fault": pred_label,
            "confidence": round(confidence, 4),
            "probabilities": prob_dict,
            "health_score": round(health_score, 1),
            "severity": severity,
            "features": raw_features_dict,
            "anomaly_detected": is_anomaly,
            "anomaly_score": anomaly_score,
            "model_used": model_name
        }

    @staticmethod
    def calculate_health_score(
        pred_fault: str,
        confidence: float,
        rms_vibration: float,
        is_anomaly: bool
    ) -> Tuple[float, str]:
        """
        Calculates health score [0..100] based on fault diagnosis, probability confidence,
        and vibration RMS in accordance with ISO 10816 standards for small-to-medium electrical machines.
        """
        if pred_fault == "Normal":
            # Baseline normal healthy motor: RMS typically < 0.10 g
            penalty = max(0.0, (rms_vibration - 0.05) * 50.0)
            if is_anomaly:
                penalty += 12.0
            health = max(70.0, 100.0 - penalty)
            severity = "NORMAL" if health >= 85.0 else "LOW"
        else:
            # Fault condition: health drops proportionally to fault confidence and RMS growth
            base_fault_health = 55.0 - (confidence * 25.0)  # ~30 to 45
            rms_penalty = min(25.0, rms_vibration * 40.0)
            health = max(5.0, base_fault_health - rms_penalty)
            
            if health < 30.0 or confidence > 0.85:
                severity = "CRITICAL"
            elif health < 50.0:
                severity = "MODERATE"
            else:
                severity = "LOW"

        return float(health), severity

# Global singleton
model_manager = ModelManager()
