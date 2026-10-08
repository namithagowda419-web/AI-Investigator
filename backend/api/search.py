"""
TraceShield – Search & Intelligence API Routes
POST /api/search
POST /api/intelligence
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.services.search import search_web
from backend.services.intelligence import search_news, search_entity_news

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Search & Intelligence"])


class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 8


class IntelligenceRequest(BaseModel):
    query: str
    entity_type: Optional[str] = "general"
    page_size: Optional[int] = 10


@router.post("/api/search")
async def web_search(request: SearchRequest):
    """Search for publicly available information using Tavily."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    try:
        results = await search_web(request.query, request.max_results or 8)
        return {"success": True, **results}
    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/api/intelligence")
async def intelligence_search(request: IntelligenceRequest):
    """Search news intelligence for an entity."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        results = await search_entity_news(request.query, request.entity_type or "general")
        return {"success": True, **results}
    except Exception as e:
        logger.error(f"Intelligence search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Intelligence search failed: {str(e)}")
