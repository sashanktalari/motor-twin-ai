from fastapi import APIRouter, HTTPException
from pathlib import Path
import json
from app.ml.train import train_and_evaluate_models
from app.ml.model_manager import model_manager
from app.core.logging import logger

router = APIRouter()

@router.get("")
def list_models():
    """
    Returns available ML models in the platform.
    """
    return [
        {
            "id": "random_forest",
            "name": "Random Forest Classifier",
            "type": "Supervised Ensemble",
            "description": "100 bagged decision trees with Gini impurity splitting on 16 time/frequency features.",
            "is_trained": model_manager.is_loaded
        },
        {
            "id": "svm",
            "name": "Support Vector Machine (RBF)",
            "type": "Kernelized Maximum Margin Classifier",
            "description": "Radial Basis Function (RBF) kernel with Platt probability calibration.",
            "is_trained": model_manager.is_loaded
        },
        {
            "id": "isolation_forest",
            "name": "Isolation Forest",
            "type": "Unsupervised Anomaly Detector",
            "description": "Tree-based recursive partitioning calibrated on nominal baseline vibration for outlier scoring.",
            "is_trained": model_manager.is_loaded
        }
    ]

@router.get("/performance")
def get_models_performance():
    """
    Returns validated model benchmark metrics from models/metrics.json.
    Strictly reports real empirical metrics on disjoint test splits (zero data leakage).
    """
    from app.core.config import settings
    metrics_file = settings.MODELS_DIR / "metrics.json"
    if not metrics_file.exists():
        return {
            "is_trained": False,
            "message": "Model not trained yet. Run the training pipeline to generate empirical validation benchmarks.",
            "models": [],
            "feature_names": [],
            "best_model": "None",
            "dataset_summary": {},
            "last_trained_at": None
        }

    try:
        with open(metrics_file, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        logger.error(f"Error reading metrics.json: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load model performance metrics.")

@router.post("/train")
def trigger_training():
    """
    Executes CWRU dataset training and validation benchmark.
    """
    try:
        results = train_and_evaluate_models()
        model_manager.load_models()
        return {
            "success": True,
            "message": "Model training and evaluation successfully executed.",
            "performance": results
        }
    except Exception as e:
        logger.error(f"Training failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Training pipeline execution failed: {str(e)}")
