"""
TraceShield – In-Memory Case Store
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lightweight in-memory persistence for cases during a session.
For production, replace with PostgreSQL / MongoDB.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

_cases: dict[str, dict] = {}


def create_case(data: dict) -> dict:
    case_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    raw_data = dict(data)

    # Ensure entities is always a list
    entities = raw_data.get("entities")
    if isinstance(entities, str):
        entities = [{"type": "Entity", "value": item.strip(), "context": "initial"} for item in entities.split(",") if item.strip()]
    elif not isinstance(entities, list):
        entities = []

    connections = raw_data.get("connections", [])
    if not isinstance(connections, list):
        connections = []

    case = {
        "id": case_id,
        "created_at": now,
        "updated_at": now,
        "status": "open",
        "risk_level": raw_data.get("risk_level", "Unknown"),
        "entity_count": len(entities),
        "connection_count": len(connections),
        "source_count": 0,
        "analysis": raw_data.get("analysis", None),
        "connections": connections,
        "timeline": [],
        "web_intelligence": [],
        "activity": [{"time": now, "action": "Case created", "detail": raw_data.get("name", "New Case")}],
        **raw_data,
    }
    case["entities"] = entities
    case["entity_count"] = len(entities)
    case["connections"] = connections
    case["connection_count"] = len(connections)
    _cases[case_id] = case
    return case


def get_case(case_id: str) -> Optional[dict]:
    return _cases.get(case_id)


def list_cases() -> list[dict]:
    return sorted(_cases.values(), key=lambda c: c["created_at"], reverse=True)


def update_case(case_id: str, updates: dict) -> Optional[dict]:
    if case_id not in _cases:
        return None
    _cases[case_id].update(updates)
    _cases[case_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
    return _cases[case_id]


def add_activity(case_id: str, action: str, detail: str = "") -> None:
    if case_id in _cases:
        now = datetime.now(timezone.utc).isoformat()
        _cases[case_id].setdefault("activity", []).append({
            "time": now,
            "action": action,
            "detail": detail,
        })
        _cases[case_id]["updated_at"] = now
