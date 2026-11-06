from pydantic import BaseModel
from typing import Optional, Any

class StandardResponse(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Any] = None

class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    project: str = "MOTOR TWIN AI"
    models_loaded: bool = False
    database_connected: bool = True
