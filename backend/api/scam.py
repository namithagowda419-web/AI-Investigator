"""
TraceShield – Scam Detection API Routes
POST /api/scam/analyze
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from backend.ai.scam_detector import analyze_scam

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scam", tags=["Scam Detection"])

MAX_MESSAGE_LENGTH = 5000


class ScamAnalysisRequest(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > MAX_MESSAGE_LENGTH:
            raise ValueError(f"Message too long (max {MAX_MESSAGE_LENGTH} characters)")
        return v


@router.post("/analyze")
async def analyze_message(request: ScamAnalysisRequest):
    """
    Analyze a suspicious message for scam indicators.
    Returns verdict, risk score, category, indicators, and explanation.
    """
    try:
        result = await analyze_scam(request.message)
        return {
            "success": True,
            "message_length": len(request.message),
            "analysis": result,
        }
    except Exception as e:
        logger.error(f"Scam analysis error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}. Please try again.",
        )
