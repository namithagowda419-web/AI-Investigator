"""
TraceShield – FastAPI Application Entry Point
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run with: uvicorn main:app --reload --port 8000
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.api.scam import router as scam_router
from backend.api.investigation import router as investigation_router
from backend.api.search import router as search_router

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("traceshield")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TraceShield API",
    description="AI-Powered Investigation & Scam Detection Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(scam_router)
app.include_router(investigation_router)
app.include_router(search_router)


# ─── Health & Status ──────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "service": "TraceShield API",
        "version": "1.0.0",
        "capabilities": {
            "ai_model": "hf-inference" if settings.hf_available else "rule-based-fallback",
            "model_id": settings.hf_model_id if settings.hf_available else "N/A",
            "search": "tavily" if settings.tavily_available else "unavailable",
            "intelligence": "newsapi" if settings.news_available else "unavailable",
            "qlora_adapter": bool(settings.qlora_adapter_path),
        },
    }


@app.get("/")
async def root():
    return {
        "message": "TraceShield API is running",
        "docs": "/docs",
        "health": "/api/health",
    }


# ─── Dev runner ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.backend_port, reload=True)
