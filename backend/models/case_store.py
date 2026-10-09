"""
TraceShield – In-Memory Case Store
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lightweight in-memory persistence for cases during a session.
For production, replace with PostgreSQL / MongoDB.
"""

import re
import uuid
from datetime import datetime, timezone
from typing import Optional

_cases: dict[str, dict] = {}


def split_entities_string(raw: str) -> list[str]:
    """Parse comma/newline separated entities preserving numbers with commas (e.g. Rs 2,50,000)."""
    if not raw or not raw.strip():
        return []
    # Protect currency and formatted numbers before comma splitting
    protected = re.sub(r'(\d+),(\d+)', r'\1__COMMA__\2', raw.strip())
    items = []
    for line in re.split(r'[\n;]+', protected):
        for piece in line.split(','):
            piece = piece.replace('__COMMA__', ',').strip()
            if piece:
                items.append(piece)
    return items


def create_case(data: dict) -> dict:
    case_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    raw_data = dict(data)

    # Ensure entities is always a list
    entities = raw_data.get("entities")
    if isinstance(entities, str):
        parsed_items = split_entities_string(entities)
        entities = [{"type": "Entity", "value": item, "context": "initial"} for item in parsed_items]
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
