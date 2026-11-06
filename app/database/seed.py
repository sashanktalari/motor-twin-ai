from app.database.session import SessionLocal
from app.database.models import DatasetRecord
from app.services.cwru_benchmark import generate_cwru_benchmark_datasets
from app.core.logging import logger

def seed_database():
    """
    Populate SQLite database with standard CWRU benchmark dataset records.
    """
    db = SessionLocal()
    try:
        count = db.query(DatasetRecord).count()
        if count == 0:
            logger.info("Initializing CWRU benchmark dataset library...")
            records = generate_cwru_benchmark_datasets()
            for r in records:
                db_record = DatasetRecord(
                    name=r["name"],
                    filename=r["filename"],
                    file_type="MAT",
                    sampling_rate_hz=r["sampling_rate_hz"],
                    fault_class=r["fault_class"],
                    motor_load_hp=r["motor_load_hp"],
                    sample_count=r["sample_count"],
                    duration_seconds=r["duration_seconds"],
                    is_benchmark=1
                )
                db.add(db_record)
            db.commit()
            logger.info(f"Successfully seeded {len(records)} CWRU benchmark records.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
