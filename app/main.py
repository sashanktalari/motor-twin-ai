from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.core.logging import logger
from app.database.session import Base, engine
from app.database.seed import seed_database

# Ensure tables are created and seeded with benchmark datasets
Base.metadata.create_all(bind=engine)
seed_database()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=f"### {settings.PROJECT_TITLE}\n\n{settings.PROJECT_SUBTITLE}",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}", "path": request.url.path}
    )

# Routers
from app.api.endpoints import (
    health,
    dashboard,
    datasets,
    diagnosis,
    simulation,
    maintenance,
    digital_twin,
    models_perf,
    reports
)

app.include_router(health.router, prefix="/api", tags=["System Health"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Overview Dashboard"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["Dataset Explorer"])
app.include_router(diagnosis.router, prefix="/api/diagnosis", tags=["Fault Diagnosis Engine"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["Motor Simulation"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["Predictive Maintenance"])
app.include_router(digital_twin.router, prefix="/api/digital-twin", tags=["Digital Twin"])
app.include_router(models_perf.router, prefix="/api/models", tags=["Model Performance"])
app.include_router(reports.router, prefix="/api/reports", tags=["Maintenance Reports"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
