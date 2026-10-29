from fastapi import APIRouter

from app.api.v1.approvals import router as approvals_router
from app.api.v1.auth import router as auth_router
from app.api.v1.evaluations import router as evaluations_router
from app.api.v1.health import router as health_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.runs import router as runs_router
from app.api.v1.workflows import router as workflows_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="", tags=["Health"])
api_router.include_router(workflows_router, prefix="", tags=["Workflows"])
api_router.include_router(runs_router, prefix="", tags=["Executions"])
api_router.include_router(knowledge_router, prefix="", tags=["Knowledge & Retrieval"])
api_router.include_router(approvals_router, prefix="", tags=["Human Approvals"])
api_router.include_router(auth_router, prefix="", tags=["Authentication"])
api_router.include_router(evaluations_router, prefix="", tags=["AI Evaluations & Benchmarks"])
