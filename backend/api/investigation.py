"""
TraceShield – Investigation API Routes
POST /api/investigation/create
POST /api/investigation/analyze
GET  /api/investigation/list
GET  /api/investigation/{case_id}
POST /api/entities/extract
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.ai.investigator import analyze_investigation, extract_entities, classify_user_entity
from backend.models.case_store import create_case, get_case, list_cases, update_case, add_activity

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Investigation"])


# ─── Schemas ──────────────────────────────────────────────────────────────────
class CreateCaseRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    entities: Optional[str] = ""
    notes: Optional[str] = ""
    evidence: Optional[str] = ""


class AnalyzeCaseRequest(BaseModel):
    case_id: str


class EntityExtractionRequest(BaseModel):
    text: str


# ─── Routes ───────────────────────────────────────────────────────────────────
@router.post("/api/investigation/create")
async def create_investigation(request: CreateCaseRequest):
    """Create a new investigation case and execute initial AI investigation analysis."""
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Case name is required")

    data = request.model_dump()
    raw_entities = (data.get("entities") or "").strip()
    entities_list = []

    # Extract structured entities across all fields (description, evidence, notes, raw entities)
    texts_to_extract = []
    if raw_entities:
        texts_to_extract.append(raw_entities)
    if data.get("description"):
        texts_to_extract.append(data["description"])
    if data.get("evidence"):
        texts_to_extract.append(data["evidence"])
    if data.get("notes"):
        texts_to_extract.append(data["notes"])

    combined_text = "\n".join(texts_to_extract)
    if combined_text:
        try:
            entities_list = await extract_entities(combined_text)
        except Exception as e:
            logger.warning(f"Initial entity extraction failed: {e}")
            entities_list = []

    # Parse and classify user-provided entities with accurate types
    existing_vals = {e["value"].strip().lower() for e in entities_list if "value" in e}
    if raw_entities:
        import re as _re
        for item in _re.split(r"[\n,;]+", raw_entities):
            item = item.strip()
            if item and item.lower() not in existing_vals and len(item) > 1:
                classified = classify_user_entity(item)
                entities_list.append(classified)
                existing_vals.add(item.lower())

    data["raw_entities"] = raw_entities
    data["entities"] = entities_list
    data["entity_count"] = len(entities_list)

    # 1. Create the case in the store
    case = create_case(data)

    # 2. Automatically execute investigation analysis on the case
    try:
        analysis = await analyze_investigation(case)

        # Merge key entities from analysis with existing user entities
        extracted = analysis.get("key_entities", [])
        seen = set()
        merged_entities = []
        for e in entities_list + extracted:
            val = str(e.get("value", "")).strip().lower()
            if val and val not in seen:
                seen.add(val)
                merged_entities.append(e)

        # Build graph connections
        connections = []
        for rel in analysis.get("relationships", []):
            connections.append({
                "source": rel.get("entity_a", ""),
                "target": rel.get("entity_b", ""),
                "type": rel.get("relationship", "Potential connection"),
                "confidence": rel.get("confidence", "medium"),
            })

        updates = {
            "analysis": analysis,
            "risk_level": analysis.get("risk_level", "Medium"),
            "entities": merged_entities,
            "entity_count": len(merged_entities),
            "connections": connections,
            "connection_count": len(connections),
        }

        updated_case = update_case(case["id"], updates)
        add_activity(case["id"], "AI Analysis Complete", f"Risk level: {updates['risk_level']} · {len(connections)} connections mapped")
        return {"success": True, "case": updated_case or case}

    except Exception as e:
        logger.error(f"Automatic investigation analysis error on create: {e}", exc_info=True)
        # Even if analysis fails, return the saved case safely
        return {"success": True, "case": case}


@router.post("/api/investigation/analyze")
async def analyze_case(request: AnalyzeCaseRequest):
    """Run or re-run AI analysis on an existing case."""
    case = get_case(request.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    try:
        analysis = await analyze_investigation(case)

        # Merge extracted entities without discarding existing entities
        existing_entities = case.get("entities", [])
        extracted = analysis.get("key_entities", [])
        seen = set()
        merged_entities = []
        for e in existing_entities + extracted:
            val = str(e.get("value", "")).strip().lower()
            if val and val not in seen:
                seen.add(val)
                merged_entities.append(e)

        # Build connections for graph
        connections = []
        for rel in analysis.get("relationships", []):
            connections.append({
                "source": rel.get("entity_a", ""),
                "target": rel.get("entity_b", ""),
                "type": rel.get("relationship", "Potential connection"),
                "confidence": rel.get("confidence", "medium"),
            })

        updates = {
            "analysis": analysis,
            "risk_level": analysis.get("risk_level", "Unknown"),
            "entities": merged_entities,
            "entity_count": len(merged_entities),
            "connections": connections,
            "connection_count": len(connections),
        }

        updated_case = update_case(request.case_id, updates)
        add_activity(request.case_id, "AI Analysis Complete", f"Risk level: {updates['risk_level']} · {len(connections)} connections mapped")

        return {"success": True, "case_id": request.case_id, "analysis": analysis, "case": updated_case}

    except Exception as e:
        logger.error(f"Investigation analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/api/investigation/list")
async def list_investigations():
    """List all cases."""
    cases = list_cases()
    return {"success": True, "cases": cases, "count": len(cases)}


@router.get("/api/investigation/{case_id}")
async def get_investigation(case_id: str):
    """Get a specific case by ID."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"success": True, "case": case}


@router.post("/api/entities/extract")
async def extract_entities_endpoint(request: EntityExtractionRequest):
    """Extract entities from arbitrary text."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        entities = await extract_entities(request.text)
        return {"success": True, "entities": entities, "count": len(entities)}
    except Exception as e:
        logger.error(f"Entity extraction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Entity extraction failed: {str(e)}")
