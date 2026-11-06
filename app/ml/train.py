import json
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

from app.core.config import settings
from app.core.logging import logger
from app.services.dataset_service import DatasetService
from app.services.cwru_benchmark import generate_cwru_benchmark_datasets
from app.ml.feature_extractor import MLFeatureExtractor, FEATURE_NAMES

CLASSES = [
    "Normal",
    "Inner Race Fault",
    "Ball Fault",
    "Outer Race Fault"
]

def load_and_prepare_data(
    window_size: int = 2048,
    train_stride: int = 512,
    test_stride: int = 1024
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Loads raw CWRU files and strictly partitions each recording temporally BEFORE windowing:
    - Train split: First 75% of continuous time series.
    - Test split: Final 25% of continuous time series.
    Completely avoids data leakage between overlapping windows.
    """
    # Ensure benchmark files exist
    generate_cwru_benchmark_datasets()

    raw_dir = settings.RAW_DATASETS_DIR
    cwru_files = [
        {"file": "CWRU_97_Normal_0HP.mat", "label": "Normal"},
        {"file": "CWRU_105_InnerRace_0.007_0HP.mat", "label": "Inner Race Fault"},
        {"file": "CWRU_118_Ball_0.007_0HP.mat", "label": "Ball Fault"},
        {"file": "CWRU_130_OuterRace_0.007_0HP.mat", "label": "Outer Race Fault"}
    ]

    train_windows_all = []
    train_labels_all = []
    test_windows_all = []
    test_labels_all = []

    class_counts = {"train": {}, "test": {}}

    for item in cwru_files:
        p = raw_dir / item["file"]
        if not p.exists():
            # Fall back to CSV if mat not found
            p = raw_dir / (item["file"].rsplit('.', 1)[0] + '.csv')

        parsed = DatasetService.load_signal_file(p)
        sig = parsed["signal"]
        n_total = len(sig)

        # Temporal split boundary (75% train, 25% test)
        split_idx = int(0.75 * n_total)
        train_raw = sig[:split_idx]
        test_raw = sig[split_idx:]

        # Segment train with stride
        train_wins = DatasetService.segment_signal(train_raw, window_size=window_size, stride=train_stride)
        # Segment test with larger stride (strictly non-overlapping or distinct)
        test_wins = DatasetService.segment_signal(test_raw, window_size=window_size, stride=test_stride)

        train_windows_all.extend(train_wins)
        train_labels_all.extend([item["label"]] * len(train_wins))

        test_windows_all.extend(test_wins)
        test_labels_all.extend([item["label"]] * len(test_wins))

        class_counts["train"][item["label"]] = len(train_wins)
        class_counts["test"][item["label"]] = len(test_wins)

    logger.info(f"Extracting features: {len(train_windows_all)} train windows, {len(test_windows_all)} test windows...")
    X_train_raw = MLFeatureExtractor.extract_matrix(train_windows_all, fs=12000.0)
    y_train = np.array(train_labels_all)

    X_test_raw = MLFeatureExtractor.extract_matrix(test_windows_all, fs=12000.0)
    y_test = np.array(test_labels_all)

    dataset_summary = {
        "dataset_name": "Case Western Reserve University (CWRU) Bearing Vibration Dataset",
        "sampling_rate_hz": 12000,
        "classes": CLASSES,
        "total_train_samples": len(train_windows_all),
        "total_test_samples": len(test_windows_all),
        "class_distribution": class_counts,
        "leakage_prevention": "Strict chronological 75/25 recording split before window segmentation"
    }

    return X_train_raw, y_train, X_test_raw, y_test, dataset_summary

def train_and_evaluate_models() -> Dict[str, Any]:
    """
    Executes reproducible ML training and validation benchmark.
    Trains:
    1. Random Forest Classifier
    2. Support Vector Machine (RBF kernel)
    3. Isolation Forest (Unsupervised Anomaly Detector)
    """
    models_dir = settings.MODELS_DIR
    models_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Loading CWRU dataset and preparing leakage-free train/test splits...")
    X_train_raw, y_train, X_test_raw, y_test, dataset_summary = load_and_prepare_data()

    # Fit Scaler on training data only
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_test = scaler.transform(X_test_raw)

    joblib.dump(scaler, models_dir / "scaler.joblib")

    # 1. Random Forest
    logger.info("Training Random Forest Classifier (100 estimators)...")
    start_rf = time.time()
    rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_duration = time.time() - start_rf
    joblib.dump(rf, models_dir / "rf_model.joblib")

    # 2. Support Vector Machine
    logger.info("Training Support Vector Machine (RBF kernel)...")
    start_svm = time.time()
    svm = SVC(kernel="rbf", C=10.0, probability=True, random_state=42)
    svm.fit(X_train, y_train)
    svm_duration = time.time() - start_svm
    joblib.dump(svm, models_dir / "svm_model.joblib")

    # 3. K-Nearest Neighbors Classifier
    logger.info("Training K-Nearest Neighbors Classifier (k=5)...")
    start_knn = time.time()
    knn = KNeighborsClassifier(n_neighbors=5, weights="distance")
    knn.fit(X_train, y_train)
    knn_duration = time.time() - start_knn
    joblib.dump(knn, models_dir / "knn_model.joblib")

    # 4. Isolation Forest for Anomaly Detection (Trained on Normal baseline features)
    logger.info("Training Isolation Forest on Normal baseline vibration...")
    normal_indices = np.where(y_train == "Normal")[0]
    X_normal = X_train[normal_indices]
    iso_forest = IsolationForest(n_estimators=100, contamination=0.08, random_state=42)
    iso_forest.fit(X_normal)
    joblib.dump(iso_forest, models_dir / "isolation_forest.joblib")

    # Evaluate on Unseen Test Split
    models_metrics = []

    for name, display_name, clf, dur in [
        ("random_forest", "Random Forest Classifier", rf, rf_duration),
        ("svm", "Support Vector Machine (RBF)", svm, svm_duration),
        ("knn", "K-Nearest Neighbors (k=5)", knn, knn_duration)
    ]:
        preds = clf.predict(X_test)
        acc = float(accuracy_score(y_test, preds))
        p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_test, preds, average="macro", zero_division=0)
        
        # Detailed per-class report
        report_dict = classification_report(y_test, preds, output_dict=True, zero_division=0)
        
        # Format per-class metrics cleanly
        cleaned_report = {}
        for c in CLASSES:
            if c in report_dict:
                cleaned_report[c] = {
                    "precision": round(float(report_dict[c]["precision"]), 4),
                    "recall": round(float(report_dict[c]["recall"]), 4),
                    "f1_score": round(float(report_dict[c]["f1-score"]), 4),
                    "support": int(report_dict[c]["support"])
                }

        # Confusion Matrix ordered by CLASSES
        cm = confusion_matrix(y_test, preds, labels=CLASSES).tolist()

        models_metrics.append({
            "model_name": name,
            "display_name": display_name,
            "accuracy": round(acc, 4),
            "precision_macro": round(float(p_macro), 4),
            "recall_macro": round(float(r_macro), 4),
            "f1_macro": round(float(f1_macro), 4),
            "classes": CLASSES,
            "classification_report": cleaned_report,
            "confusion_matrix": cm,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "training_duration_seconds": round(dur, 3),
            "validation_split_methodology": "Disjoint 75% train / 25% test temporal split per original recording (Zero overlapping window leakage)"
        })

    best_model_name = max(models_metrics, key=lambda m: m["f1_macro"])["model_name"]

    perf_payload = {
        "is_trained": True,
        "models": models_metrics,
        "feature_names": FEATURE_NAMES,
        "best_model": best_model_name,
        "dataset_summary": dataset_summary,
        "last_trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    metrics_path = models_dir / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(perf_payload, f, indent=2)

    logger.info(f"Model training and scientific evaluation completed. Metrics saved to {metrics_path}")
    return perf_payload

if __name__ == "__main__":
    train_and_evaluate_models()
