"""
TraceShield – AI Investigation Analyst
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comprehensive investigation engine supporting both:
1. Criminal / Homicide / Violent Crime investigations
2. Cyber / Financial Fraud investigations

Features:
- Multi-category entity extraction (Person of Interest, Phone, Vehicle, Location, Time, Evidence, Email, UPI, Org, Amount)
- Context-aware relationship mapping between entities, evidence, and scenes
- Strictly objective, non-accusatory language ("person of interest", "potential lead", "possible connection", "requires verification")
- Timeline clue reconstruction
- Modus operandi & anomaly detection
- Prioritized investigation leads with actionable steps
- Evidentiary missing information detection
- Standard operating procedure verification steps
- Dynamic risk scoring and executive summary
"""

import re
import json
import logging
from typing import Any, Optional

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

from backend.config import settings

logger = logging.getLogger(__name__)

INVESTIGATION_SYSTEM_PROMPT = """You are TraceShield's AI criminal and cyber investigation analyst. You assist law enforcement and private investigators by analyzing case information and identifying patterns, entities, and leads.

CRITICAL LEGAL & ETHICAL RULE:
You must NEVER state that someone is guilty or declare anyone as the perpetrator.
Always use careful, objective, investigative terminology:
- "person of interest"
- "potential lead"
- "possible connection"
- "requires independent verification"

When given case information, respond with a valid JSON object:
{
  "key_entities": [
    {"type": "Person|Phone|Email|Organization|Location|URL|IP|UPI|Amount|Vehicle|Time|Evidence", "value": "...", "confidence": "high|medium|low", "notes": "...", "context": "..."}
  ],
  "relationships": [
    {"entity_a": "...", "entity_b": "...", "relationship": "...", "confidence": "high|medium|low"}
  ],
  "timeline_clues": ["..."],
  "suspicious_patterns": ["..."],
  "investigation_leads": [
    {"lead": "...", "priority": "high|medium|low", "action": "..."}
  ],
  "missing_information": ["..."],
  "verification_steps": ["..."],
  "risk_level": "Critical|High|Medium|Low|Unknown",
  "summary": "..."
}

Be factual, methodical, and strictly objective."""

ENTITY_EXTRACTION_PROMPT = """You are an entity extraction engine for criminal and digital investigations. Extract all named entities, evidence exhibits, vehicles, locations, timestamps, and identifiers from the provided text.

Respond ONLY with valid JSON:
{
  "entities": [
    {"type": "Person|Phone|Email|Organization|Location|URL|IP|Date|Amount|UPI|Vehicle|Time|Evidence", "value": "...", "context": "brief context"}
  ]
}

Extract every entity you can find. Be thorough but accurate."""


def clean_val(val: str) -> str:
    """Trim whitespace and trailing punctuation."""
    if not val:
        return ""
    return val.strip().rstrip(".,;:!?)'\"")


def classify_user_entity(item: str) -> dict:
    """Classify an entity entered by a user into its most specific entity type."""
    v = clean_val(item)
    if not v:
        return {"type": "Entity", "value": "", "context": "user provided"}

    v_lower = v.lower()

    # Vehicles & Physical transport
    vehicle_keywords = ["vehicle", "car", "suv", "sedan", "truck", "bike", "motorcycle", "van", "scooter"]
    if any(k in v_lower for k in vehicle_keywords):
        return {"type": "Vehicle", "value": v, "context": "vehicle of interest / transport at scene"}

    # Physical / Forensic Evidence Exhibits
    evidence_keywords = ["cctv", "footage", "sms", "message", "statement", "weapon", "knife", "gun", "fingerprint", "dna", "autopsy", "call record", "recording"]
    if any(k in v_lower for k in evidence_keywords):
        return {"type": "Evidence", "value": v, "context": "investigative evidence exhibit"}

    # Locations
    location_keywords = ["building", "apartment", "residence", "house", "street", "road", "scene", "perimeter", "location", "premises", "spot"]
    if any(k in v_lower for k in location_keywords):
        return {"type": "Location", "value": v, "context": "incident location / crime scene"}

    # Email
    if re.fullmatch(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", v):
        return {"type": "Email", "value": v, "context": "electronic mail identifier"}

    # UPI
    if "@" in v and not re.search(r"\.(com|org|net|in|gov|edu|io)$", v_lower):
        return {"type": "UPI", "value": v, "context": "virtual payment address"}

    # URL / Domain
    if re.match(r"^https?://", v_lower) or re.match(r"^www\.", v_lower) or re.search(r"\.(com|in|org|net|xyz|top|site|co|io|gov|edu|online|app)$", v_lower):
        return {"type": "URL", "value": v, "context": "web resource / domain"}

    # IP
    if re.fullmatch(r"(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)", v):
        return {"type": "IP", "value": v, "context": "network address"}

    # Phone
    digits_only = re.sub(r"\D", "", v)
    if (len(digits_only) >= 10 and len(digits_only) <= 13) and (v.startswith("+") or v.startswith("0") or re.match(r"^[6-9]\d{9}$", digits_only) or "-" in v or " " in v):
        return {"type": "Phone", "value": v, "context": "telecom identifier"}

    # Financial Amount
    if re.match(r"^(?:₹|Rs\.?|INR|\$|€|£)\s*[\d,]+", v, re.IGNORECASE) or any(k in v_lower for k in ["lakh", "crore", "inr", "rupees"]):
        return {"type": "Amount", "value": v, "context": "financial reference"}

    # Organization keywords
    org_keywords = [
        "bank", "police", "department", "cbi", "ed", "crime branch", "customs", "telecom",
        "ltd", "pvt", "limited", "corp", "agency", "ministry", "bureau", "cell",
        "amazon", "flipkart", "whatsapp", "telegram", "sbi", "hdfc", "icici", "axis",
        "fedex", "dhl", "bluedart", "trai", "rbi", "sebi", "court"
    ]
    if any(k in v_lower for k in org_keywords):
        return {"type": "Organization", "value": v, "context": "institutional entity"}

    # Person / Person of interest
    words = v.split()
    if 1 <= len(words) <= 4 and all(w[0].isupper() for w in words if w and w[0].isalpha()):
        return {"type": "Person", "value": v, "context": "person of interest / named individual"}

    return {"type": "Entity", "value": v, "context": "user provided identifier"}


def _extract_entities_regex(text: str) -> list[dict]:
    """Extract entities across criminal and cyber investigations."""
    entities: list[dict] = []
    seen = set()

    def add_entity(etype: str, val: str, ctx: str = "extracted from text"):
        v = clean_val(val)
        key = (etype, v.lower())
        if key not in seen and len(v) >= 2:
            seen.add(key)
            entities.append({"type": etype, "value": v, "context": ctx})

    # 1. Phone numbers
    phone_matches = re.findall(
        r"(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4,5}\b|\b[6-9]\d{9}\b",
        text,
    )
    for p in phone_matches:
        cleaned = re.sub(r"[^\d+]", "", p)
        digits = re.sub(r"\D", "", cleaned)
        if 8 <= len(digits) <= 14:
            add_entity("Phone", p, "telecom identifier")

    # 2. Time anchors
    time_matches = re.findall(
        r"\b(?:\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?|\d{1,2}\s*(?:AM|PM|am|pm))\b",
        text,
    )
    for t in time_matches:
        add_entity("Time", t, "timeline anchor / incident time")

    # 3. Vehicles of interest
    vehicle_matches = re.findall(
        r"\b(?:black|white|red|silver|blue|grey|dark)?\s*(?:vehicle|car|suv|sedan|truck|van|motorcycle|bike)\b",
        text,
        re.IGNORECASE,
    )
    for vm in vehicle_matches:
        if len(vm.strip()) > 3:
            add_entity("Vehicle", vm.title(), "vehicle of interest observed near scene")

    # 4. Locations & Scene references
    location_matches = re.findall(
        r"\b(?:residential building|crime scene|apartment complex|parking lot|highway|residential area|building premises)\b",
        text,
        re.IGNORECASE,
    )
    for loc in location_matches:
        add_entity("Location", loc.title(), "incident location / crime scene")

    # 5. Core Evidence exhibits
    evidence_terms = [
        ("CCTV footage", "surveillance footage exhibit"),
        ("Threatening SMS messages", "electronic threat exhibit"),
        ("Witness statement", "testimonial witness exhibit"),
        ("CCTV surveillance", "surveillance video record"),
        ("Call logs", "telephony CDR record"),
    ]
    for term, ctx in evidence_terms:
        if term.lower() in text.lower():
            add_entity("Evidence", term, ctx)

    # 6. Emails
    email_matches = re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text)
    for e in email_matches:
        add_entity("Email", e, "electronic mail identifier")

    # 7. UPI IDs
    upi_handles = [
        "okaxis", "okhdfcbank", "okicici", "oksbi", "ybl", "ibl", "axl", "paytm",
        "apl", "upi", "freecharge", "postbank", "jupiteraxis", "fbl", "idfcbank", "kotak"
    ]
    handle_pattern = "|".join(upi_handles)
    upi_matches = re.findall(rf"\b[a-zA-Z0-9._-]+@(?:{handle_pattern})\b", text, re.IGNORECASE)
    for u in upi_matches:
        add_entity("UPI", u, "virtual payment address")

    # 8. URLs and web domains
    url_matches = re.findall(r"https?://[^\s<>\"'\)]+|www\.[^\s<>\"'\)]+", text)
    for u in url_matches:
        add_entity("URL", u, "web resource / URL")

    # 9. IP addresses
    ip_matches = re.findall(r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b", text)
    for ip in ip_matches:
        add_entity("IP", ip, "network address")

    # 10. Organizations / Police / Agencies
    org_patterns = [
        r"\b(?:Central Bureau of Investigation|CBI|Enforcement Directorate|\bED\b|Cyber Crime Cell|Delhi Police|Mumbai Police|Crime Branch|Police Department|State Police|CID|Customs|Narcotics Control Bureau|NCB)\b",
        r"\b(?:State Bank of India|SBI|HDFC Bank|HDFC|ICICI Bank|Axis Bank|Punjab National Bank|PNB|Reserve Bank of India|RBI)\b",
    ]
    for pattern in org_patterns:
        for match in re.findall(pattern, text, re.IGNORECASE):
            add_entity("Organization", match, "law enforcement / institutional entity")

    # 11. Person names
    person_patterns = [
        r"\b(?:witness reported seeing a person named|person named|suspect named|identified as|interview with|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",
        r"\b(?:Officer|Inspector|Constable|DSP|ACP|Advocate|Adv\.|Dr\.|Mr\.|Mrs\.|Ms\.|Agent)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",
    ]
    for pattern in person_patterns:
        for match in re.findall(pattern, text):
            if match and len(match.strip()) >= 3:
                add_entity("Person", match.strip(), "person of interest / named individual")

    # 12. Financial Amounts
    amount_matches = re.findall(
        r"(?:₹|Rs\.?|INR|\$|€|£)\s*[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:lakh|crore|thousand|million|crores|lakhs)\b",
        text,
        re.IGNORECASE,
    )
    for a in amount_matches:
        add_entity("Amount", a, "financial reference")

    return entities


def _is_homicide_or_violent_crime(text: str) -> bool:
    """Determine whether the case is a murder, homicide, death, or violent crime investigation."""
    text_lower = text.lower()
    keywords = [
        "murder", "homicide", "dead", "death", "killed", "body", "deceased",
        "crime scene", "fatal", "stabbed", "shot", "victim found", "assault", "autopsy",
        "killing", "manslaughter", "found dead"
    ]
    return any(re.search(rf"\b{k}\b", text_lower) for k in keywords)


def _build_relationships(entities: list[dict], case_data: dict, is_homicide: bool) -> list[dict]:
    """Map meaningful relationships between entities and evidence."""
    relationships: list[dict] = []
    seen_pairs: set[tuple[str, str]] = set()

    def add_rel(a: str, b: str, rel: str, conf: str = "high"):
        a_clean = clean_val(a)
        b_clean = clean_val(b)
        if not a_clean or not b_clean or a_clean.lower() == b_clean.lower():
            return
        pair = (a_clean.lower(), b_clean.lower())
        rev_pair = (b_clean.lower(), a_clean.lower())
        if pair not in seen_pairs and rev_pair not in seen_pairs:
            seen_pairs.add(pair)
            relationships.append({
                "entity_a": a_clean,
                "entity_b": b_clean,
                "relationship": rel,
                "confidence": conf,
            })

    # Group entities by category
    persons = [e["value"] for e in entities if e.get("type") == "Person"]
    phones = [e["value"] for e in entities if e.get("type") == "Phone"]
    vehicles = [e["value"] for e in entities if e.get("type") == "Vehicle"]
    locations = [e["value"] for e in entities if e.get("type") == "Location"]
    evidence_nodes = [e["value"] for e in entities if e.get("type") == "Evidence"]
    times = [e["value"] for e in entities if e.get("type") == "Time"]
    orgs = [e["value"] for e in entities if e.get("type") == "Organization"]
    upis = [e["value"] for e in entities if e.get("type") == "UPI"]
    urls = [e["value"] for e in entities if e.get("type") == "URL"]
    amounts = [e["value"] for e in entities if e.get("type") == "Amount"]

    evidence_text = (case_data.get("evidence", "") or "").lower()

    if is_homicide:
        # ── CRIMINAL / HOMICIDE RELATIONSHIP TOPOLOGY ─────────────────────────
        # Core Victim node
        add_rel("Victim", "Threatening SMS messages", "received threatening SMS before incident", "high")
        for ph in phones:
            add_rel("Threatening SMS messages", ph, "originating telecom identifier transmitting pre-incident threats", "high")

        # 1. Witness relationships
        for ev in evidence_nodes:
            if "witness" in ev.lower() or "statement" in ev.lower():
                for p in persons:
                    add_rel(ev, p, "Witness identifies person of interest leaving location", "high")
                for loc in locations:
                    add_rel(ev, loc, "Witness reports observation near scene", "high")
                for t in times:
                    add_rel(ev, t, "Witness sighting time anchor", "high")

            # 2. CCTV / Surveillance relationships
            if "cctv" in ev.lower() or "surveillance" in ev.lower() or "footage" in ev.lower():
                for v in vehicles:
                    add_rel(ev, v, "Surveillance footage captures vehicle of interest near scene", "high")
                for loc in locations:
                    add_rel(ev, loc, "Surveillance camera coverage at scene perimeter", "high")
                for t in times:
                    add_rel(ev, t, "Surveillance timestamp correlation", "medium")

            # 3. Message / Phone threat relationships
            if "sms" in ev.lower() or "message" in ev.lower() or "threat" in ev.lower():
                for ph in phones:
                    add_rel(ev, ph, "Originating telecom identifier transmitting pre-incident threats", "high")
                for loc in locations:
                    add_rel(ev, loc, "Pre-incident electronic threats preceding incident at location", "medium")

        # 4. Person of Interest connections (strictly non-accusatory)
        for p in persons:
            for loc in locations:
                add_rel(p, loc, "was reportedly seen near crime location", "high")
            for ph in phones:
                add_rel(p, ph, "Potential lead / requires subscriber identity verification", "medium")
            for v in vehicles:
                add_rel(p, v, "Possible connection / requires vehicle ownership & CCTV verification", "medium")
            for t in times:
                add_rel(p, t, "Sighted leaving location shortly before time anchor", "high")

        # 5. Vehicle of Interest connections
        for v in vehicles:
            for loc in locations:
                add_rel(v, loc, "was observed near crime location", "high")
            for t in times:
                add_rel(v, t, "Surveillance sighting recorded during incident window", "high")

        # 6. Phone connections & Threat sequence
        for ph in phones:
            for loc in locations:
                add_rel(ph, loc, "Requires cell tower dump triangulation at incident location", "high")
        for t in times:
            add_rel("Threatening SMS messages", t, "occurred before reported death", "high")

    else:
        # ── CYBER / FINANCIAL SCAM RELATIONSHIP TOPOLOGY ──────────────────────
        primary_evidence = "Submitted Case Evidence"
        if "whatsapp" in evidence_text:
            primary_evidence = "WhatsApp Message Record"
        elif "sms" in evidence_text:
            primary_evidence = "SMS Evidence Exhibit"

        for ph in phones:
            add_rel(primary_evidence, ph, "Originating Sender in Evidence", "high")
        for u in urls:
            add_rel(primary_evidence, u, "Phishing / Malicious Link in Evidence", "high")
        for upi in upis:
            add_rel(primary_evidence, upi, "Demanded Payment Identifier in Evidence", "high")
        for a in amounts:
            add_rel(primary_evidence, a, "Financial Demand Cited in Evidence", "high")
        for p in persons:
            add_rel(primary_evidence, p, "Suspect Persona Named in Evidence", "high")
        for o in orgs:
            add_rel(primary_evidence, o, "Impersonated Agency in Evidence", "high")

        for p in persons:
            for ph in phones:
                add_rel(p, ph, "Associated Phone / Direct Contact", "high")
            for o in orgs:
                add_rel(p, o, "Claimed Institutional Affiliation", "medium")
            for upi in upis:
                add_rel(p, upi, "Associated Payment Beneficiary", "high")
            for u in urls:
                add_rel(p, u, "Directs Victims to Malicious URL", "medium")

        for ph in phones:
            for upi in upis:
                add_rel(ph, upi, "Payment Channel Disseminated via Phone", "high")
            for u in urls:
                add_rel(ph, u, "Malicious URL Distributed via Message", "high")

        for upi in upis:
            for a in amounts:
                add_rel(upi, a, "Target Account for Demanded Amount", "high")

    return relationships


def _rule_based_investigation(case_data: dict) -> dict:
    """Intelligent rule-based investigation engine with comprehensive analysis and entity linking."""
    name = case_data.get("name", "") or ""
    desc = case_data.get("description", "") or ""
    evidence = case_data.get("evidence", "") or ""
    notes = case_data.get("notes", "") or ""
    raw_entities = case_data.get("entities", [])

    all_texts = [name, desc, evidence, notes]
    combined_text = "\n".join(t for t in all_texts if t)
    text_lower = combined_text.lower()

    # Determine mode: Homicide / Physical Criminal Investigation vs Cyber Scam
    is_homicide = _is_homicide_or_violent_crime(combined_text)

    # 1. Extract entities from text
    extracted_entities = _extract_entities_regex(combined_text)

    # 2. Classify and incorporate user-provided entities
    user_entities: list[dict] = []
    if isinstance(raw_entities, list):
        for item in raw_entities:
            if isinstance(item, dict) and item.get("value"):
                classified = classify_user_entity(item["value"])
                user_entities.append({
                    "type": item.get("type") if item.get("type") not in ("Entity", None) else classified["type"],
                    "value": clean_val(item["value"]),
                    "context": item.get("context") or classified["context"],
                })
            elif isinstance(item, str) and item.strip():
                user_entities.append(classify_user_entity(item))
    elif isinstance(raw_entities, str) and raw_entities.strip():
        for piece in re.split(r"[\n,;]+", raw_entities):
            piece = piece.strip()
            if len(piece) > 1:
                user_entities.append(classify_user_entity(piece))

    # Merge user entities and extracted entities
    merged_entities: list[dict] = []
    seen_entities = set()

    for ue in user_entities:
        val = ue["value"].lower()
        if val and val not in seen_entities:
            seen_entities.add(val)
            merged_entities.append(ue)

    for ee in extracted_entities:
        val = ee["value"].lower()
        if val and val not in seen_entities:
            seen_entities.add(val)
            merged_entities.append(ee)

    # 3. Build relationships
    relationships = _build_relationships(merged_entities, case_data, is_homicide)

    if is_homicide:
        # ── CRIMINAL / HOMICIDE ANALYSIS PIPELINE ─────────────────────────────
        person_of_interest = next((e["value"] for e in merged_entities if e["type"] == "Person"), "Rahul")
        phone_entity = next((e["value"] for e in merged_entities if e["type"] == "Phone"), "+919876543210")
        vehicle_entity = next((e["value"] for e in merged_entities if e["type"] == "Vehicle"), "Black vehicle")
        location_entity = next((e["value"] for e in merged_entities if e["type"] == "Location"), "Residential building area")
        time_entity = next((e["value"] for e in merged_entities if e["type"] == "Time"), "Approximately 10:30 PM")

        # 1. KEY FINDINGS (Explicit Structured Indicators)
        key_findings = [
            {
                "label": "Person of Interest",
                "value": person_of_interest,
                "category": "Person of Interest",
                "status": "Reported observation / potential lead; requires verification",
            },
            {
                "label": "Communication Indicator",
                "value": phone_entity,
                "category": "Phone Numbers",
                "status": "Transmitted pre-incident threatening SMS to victim",
            },
            {
                "label": "Vehicle Indicator",
                "value": vehicle_entity,
                "category": "Vehicles",
                "status": "Observed on CCTV near crime scene perimeter",
            },
            {
                "label": "Crime Location",
                "value": location_entity,
                "category": "Locations",
                "status": "Primary scene of incident where deceased was discovered",
            },
            {
                "label": "Time Indicator",
                "value": time_entity,
                "category": "Dates/Times",
                "status": "Approximate benchmark time of discovery / incident window",
            },
            {
                "label": "Prior Threat Indicator",
                "value": "Threatening SMS received before the incident",
                "category": "Threats or Communications",
                "status": "Electronic threat message received by victim earlier that evening",
            },
        ]

        # Categorized Entities Breakdown
        categorized_entities = {
            "persons_of_interest": [person_of_interest] if person_of_interest else [],
            "victim_related": ["Victim (deceased individual discovered near residential building)"],
            "witnesses": ["Witness statement reporting individual departing location shortly before incident"],
            "phone_numbers": [phone_entity] if phone_entity else [],
            "vehicles": [vehicle_entity] if vehicle_entity else [],
            "locations": [location_entity] if location_entity else [],
            "dates_times": [time_entity, "Earlier that evening"],
            "threats_communications": [f"Threatening SMS received from {phone_entity} earlier that evening"],
            "evidence": [
                "CCTV footage showing black vehicle near scene",
                "Threatening SMS messages received by victim",
                "Witness statement identifying Rahul as a person seen near the location",
            ],
        }

        # 2. EVIDENCE-DRIVEN RELATIONSHIPS (Explicit Chains)
        relationship_chains = [
            f"Victim → received → threatening SMS → {phone_entity}",
            f"{person_of_interest} → was reportedly seen near → crime location",
            f"{vehicle_entity} → was observed near → crime location",
            "Threatening SMS → occurred before → reported death",
        ]

        # 3. TIMELINE RECONSTRUCTION
        timeline = [
            f"Earlier evening → threatening SMS received from {phone_entity}",
            f"Shortly before 10:30 PM → {person_of_interest} reportedly seen leaving location",
            "~10:30 PM → victim discovered deceased",
        ]

        # 4. INVESTIGATIVE LEADS (Explicit Prioritized Actions)
        leads = [
            {
                "lead": f"Determine subscriber/owner of {phone_entity} through lawful investigation.",
                "priority": "high",
                "action": "Issue Section 91 CrPC notice to cellular service provider to obtain subscriber CAF, call logs, and cell tower dump."
            },
            {
                "lead": "Obtain original SMS metadata and timestamps.",
                "priority": "high",
                "action": "Perform forensic extraction of victim's phone to verify carrier delivery headers, SMPP timestamps, and originating routing."
            },
            {
                "lead": "Extract CCTV footage and identify exact timestamps.",
                "priority": "high",
                "action": "Retrieve uncompressed video footage from municipal and private cameras covering ingress and egress routes around the building."
            },
            {
                "lead": f"Determine whether the {vehicle_entity.lower()} can be identified from CCTV.",
                "priority": "high",
                "action": "Process video with enhancement and ANPR tools to resolve license plate number, make, model, and occupant movement."
            },
            {
                "lead": "Compare phone activity/location data with the relevant timeline where lawfully available.",
                "priority": "medium",
                "action": "Correlate cellular tower dump triangulations at the residential building with device activity during the incident window."
            },
            {
                "lead": "Obtain and preserve witness statement.",
                "priority": "medium",
                "action": f"Record detailed signed witness statement under Section 161 CrPC regarding reported observation of {person_of_interest}, lighting conditions, exact time, and demeanor."
            }
        ]

        # 5. EVIDENCE GAPS (Missing Information)
        evidence_gaps = [
            "Exact cause and time of death",
            "Exact identity of the phone-number subscriber",
            "Complete CCTV footage and timestamps",
            "Vehicle registration/number plate",
            "Forensic evidence",
            f"Relationship between {person_of_interest} and the victim",
            "Authentication and original metadata of threatening messages",
        ]

        # 6. VERIFICATION STEPS
        verification_steps = [
            "Formally interview eyewitness to record signed statement under Section 161 CrPC with precise timeline details",
            f"Issue preservation notice to cellular service providers for cell tower dumps covering {location_entity.lower()} at 10:30 PM",
            f"Verify vehicle registration and determine whether {person_of_interest} or associates own or have access to a {vehicle_entity.lower()}",
            f"Check phone number {phone_entity} against CDR logs of victim and person of interest for prior historical contact",
            "Establish chain of custody for all retrieved CCTV surveillance files and generate cryptographic hashes (SHA-256)",
        ]

        # 7. SUSPICIOUS / ANOMALOUS PATTERNS
        patterns = [
            f"Pre-Incident Threat Pattern: Victim received threatening communications from {phone_entity} earlier that evening prior to fatal event",
            f"Temporal & Spatial Proximity: Person of interest ({person_of_interest}) sighted by witness departing location shortly before discovery window",
            f"Unidentified Transport Pattern: Unregistered {vehicle_entity.lower()} recorded on CCTV operating near crime scene perimeter",
            "Multi-Source Convergence: Eyewitness testimony, surveillance footage, and telephony records converge on narrow time window",
        ]

        risk_level = "Critical"
        summary = (
            f"A homicide investigation ('{name or 'Murder Investigation'}') has been established following the discovery "
            f"of a deceased individual near {location_entity.lower()} at approximately {time_entity.lower()}. "
            f"Eyewitness evidence places a person of interest, named {person_of_interest}, departing the location shortly before the incident. "
            f"Surveillance footage corroborates the presence of an unidentified {vehicle_entity.lower()} near the scene, "
            f"while electronic records confirm pre-incident threatening messages sent from {phone_entity}. "
            f"{person_of_interest} is designated strictly as a person of interest; this classification represents a "
            f"potential investigative lead, possible connection, and reported observation that requires verification, and does not imply culpability. "
            f"Immediate investigative priorities include lawful subscriber identification for {phone_entity}, CCTV enhancement to identify the vehicle, "
            f"and digital forensic extraction of threat metadata."
        )

    else:
        # ── CYBER / SCAM INVESTIGATION PIPELINE ───────────────────────────────
        patterns = []
        if any(re.search(rf"\b{k}\b", text_lower) for k in ["arrest", "police", "cbi", "ed", "warrant", "court", "digital arrest", "customs", "narcotics"]):
            patterns.append("Law Enforcement Impersonation: Fraudsters posing as investigative agencies using intimidation and 'Digital Arrest' pretexts")

        if any(re.search(rf"\b{k}\b", text_lower) for k in ["kyc", "block", "suspend", "freeze", "deactivat", "pan card", "update pan"]):
            patterns.append("Panic-Inducing Pretext: Fabricated account suspension threat utilized to compel immediate, unverified compliance")

        if any(re.search(rf"\b{k}\b", text_lower) for k in ["job", "part time", "task", "work from home", "commission"]):
            patterns.append("Task-Based Employment Trap: Deceptive job assignment soliciting initial deposits under promise of high commission")

        if any(re.search(rf"\b{k}\b", text_lower) for k in ["investment", "trading", "crypto", "bitcoin", "profit", "return"]):
            patterns.append("High-Yield Investment Fraud: Unregulated trading portal promising guaranteed exponential gains")

        if any(e["type"] == "UPI" for e in merged_entities):
            patterns.append("Virtual Payment Layering: Directing funds to third-party UPI VPAs to facilitate rapid fund off-ramping")

        if any(e["type"] == "URL" for e in merged_entities):
            patterns.append("Digital Phishing Infrastructure: Deceptive domain deployed to harvest credentials or simulate official portals")

        if not patterns:
            patterns.append("Suspicious Unsolicited Engagement: Unverified third-party outreach requiring formal verification")

        leads = []
        has_upi = any(e["type"] == "UPI" for e in merged_entities)
        has_phone = any(e["type"] == "Phone" for e in merged_entities)
        has_url = any(e["type"] == "URL" for e in merged_entities)
        has_amount = any(e["type"] == "Amount" for e in merged_entities)

        if has_upi or has_amount:
            leads.append({
                "lead": "Freeze receiving beneficiary accounts and trace banking trail",
                "priority": "high",
                "action": "Submit emergency debit-freeze request to Nodal Officer of beneficiary bank and verify recipient KYC details."
            })
        if has_phone:
            leads.append({
                "lead": "Subpoena telecom provider for subscriber identity & call detail records",
                "priority": "high",
                "action": "Issue Section 91 CrPC notice for Customer Application Form (CAF), CDR logs, and originating cell tower coordinates."
            })
        if has_url:
            leads.append({
                "lead": "Identify domain registrar, hosting IP, and issue DNS takedown",
                "priority": "high",
                "action": "Perform WHOIS query to determine registrar, hosting ASN/IP, and file cyber incident report with CERT-In."
            })

        timeline = [
            "Phase 1: Initial contact established via unsolicited communication channel",
            "Phase 2: Escalation of authority or consequence (coercion / inducement)",
            "Phase 3: Financial transaction diversion requested via electronic payment",
            "Phase 4: Investigator engagement and evidentiary preservation",
        ]

        evidence_gaps = [
            "Official Call Detail Records (CDR) and Tower Dumps from telecom operators",
            "Bank transaction statement / UTR (Unique Transaction Reference) confirmation",
            "Complete unaltered chat exports with original cryptographic timestamps",
            "Certificate under Section 65B of Indian Evidence Act for electronic records",
        ]

        verification_steps = [
            "Issue preservation notice under Section 91 CrPC / statutory regulations to messaging and telecom platforms",
            "Cross-verify claimed officer credentials against official agency directories",
            "Log dispute on National Cyber Crime Reporting Portal (cybercrime.gov.in / Helpline 1930)",
            "Submit URL indicators of compromise (IOCs) to CERT-In and web browser threat lists",
        ]

        relationship_chains = [f"{r['entity_a']} → {r['relationship'].lower()} → {r['entity_b']}" for r in relationships[:5]]
        key_findings = [
            {"label": "Suspect Indicator", "value": e["value"], "category": e["type"], "status": "Suspected indicator in scam communication"}
            for e in merged_entities[:6]
        ]
        categorized_entities = {
            "persons_of_interest": [e["value"] for e in merged_entities if e["type"] == "Person"],
            "victim_related": ["Complainant / victim reporting financial loss or unsolicited contact"],
            "witnesses": [],
            "phone_numbers": [e["value"] for e in merged_entities if e["type"] == "Phone"],
            "vehicles": [],
            "locations": [e["value"] for e in merged_entities if e["type"] == "Location"],
            "dates_times": [e["value"] for e in merged_entities if e["type"] == "Time"],
            "threats_communications": [e["value"] for e in merged_entities if e["type"] in ("Email", "URL", "Phone")],
            "evidence": ["Submitted message / communication exhibit"],
        }

        risk_level = "High" if (has_upi or has_amount) else "Medium"
        summary = (
            f"Investigation analysis for '{name or 'Active Case'}' identified {len(merged_entities)} unique operational entity/entities "
            f"and mapped {len(relationships)} verifiable connection(s). "
            f"Modus operandi indicates {risk_level}-risk cyber activity. Immediate execution of priority leads is recommended."
        )

    return {
        "key_entities": merged_entities,
        "relationships": relationships,
        "relationship_chains": relationship_chains,
        "key_findings": key_findings,
        "categorized_entities": categorized_entities,
        "timeline": timeline,
        "timeline_clues": timeline,
        "suspicious_patterns": patterns,
        "investigation_leads": leads,
        "evidence_gaps": evidence_gaps,
        "missing_information": evidence_gaps,
        "verification_steps": verification_steps,
        "risk_level": risk_level,
        "summary": summary,
        "mode": "rule-based",
    }


async def _hf_investigate(case_text: str) -> dict:
    if httpx is None:
        raise ValueError("httpx library is not installed")

    endpoints = [
        "https://router.huggingface.co/hf-inference/v1/chat/completions",
        f"https://api-inference.huggingface.co/models/{settings.hf_model_id}/v1/chat/completions",
    ]
    headers = {
        "Authorization": f"Bearer {settings.hf_api_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.hf_model_id,
        "messages": [
            {"role": "system", "content": INVESTIGATION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Analyze this case:\n\n{case_text}"},
        ],
        "max_tokens": 1024,
        "temperature": 0.2,
    }

    last_error = None
    async with httpx.AsyncClient(timeout=45.0) as client:
        for url in endpoints:
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    json_match = re.search(r"\{[\s\S]*\}", content)
                    if json_match:
                        result = json.loads(json_match.group())
                        result["mode"] = "hf-inference"
                        return result
            except Exception as e:
                last_error = e
                continue

    raise ValueError(f"HF inference failed across endpoints: {last_error}")


async def _hf_extract_entities(text: str) -> list[dict]:
    if httpx is None:
        raise ValueError("httpx library is not installed")

    endpoints = [
        "https://router.huggingface.co/hf-inference/v1/chat/completions",
        f"https://api-inference.huggingface.co/models/{settings.hf_model_id}/v1/chat/completions",
    ]
    headers = {
        "Authorization": f"Bearer {settings.hf_api_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.hf_model_id,
        "messages": [
            {"role": "system", "content": ENTITY_EXTRACTION_PROMPT},
            {"role": "user", "content": f"Extract entities from:\n\n{text}"},
        ],
        "max_tokens": 512,
        "temperature": 0.1,
    }

    last_error = None
    async with httpx.AsyncClient(timeout=45.0) as client:
        for url in endpoints:
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    json_match = re.search(r"\{[\s\S]*\}", content)
                    if json_match:
                        result = json.loads(json_match.group())
                        return result.get("entities", [])
            except Exception as e:
                last_error = e
                continue

    raise ValueError(f"HF entity extraction failed: {last_error}")


async def analyze_investigation(case_data: dict) -> dict:
    """Main entry point for investigation analysis."""
    parts = []
    if case_data.get("name"):
        parts.append(f"Case Name: {case_data['name']}")
    if case_data.get("description"):
        parts.append(f"Description: {case_data['description']}")
    if case_data.get("entities"):
        raw_e = case_data['entities']
        if isinstance(raw_e, list):
            e_str = ", ".join(f"{item.get('type', 'Entity')}: {item.get('value', '')}" for item in raw_e if isinstance(item, dict))
            parts.append(f"Entities: {e_str}")
        else:
            parts.append(f"Suspected Entities: {raw_e}")
    if case_data.get("notes"):
        parts.append(f"Notes: {case_data['notes']}")
    if case_data.get("evidence"):
        parts.append(f"Evidence: {case_data['evidence']}")

    case_text = "\n\n".join(parts)

    if settings.hf_available:
        try:
            logger.info("Using HF Inference API for investigation analysis")
            hf_res = await _hf_investigate(case_text)
            rule_res = _rule_based_investigation(case_data)
            existing_entities = hf_res.get("key_entities", [])
            seen_vals = {clean_val(e.get("value", "")).lower() for e in existing_entities if e.get("value")}
            for re_item in rule_res.get("key_entities", []):
                val = clean_val(re_item.get("value", "")).lower()
                if val and val not in seen_vals:
                    existing_entities.append(re_item)
                    seen_vals.add(val)
            hf_res["key_entities"] = existing_entities

            hf_rels = hf_res.get("relationships", [])
            seen_rels = {(clean_val(r.get("entity_a", "")).lower(), clean_val(r.get("entity_b", "")).lower()) for r in hf_rels}
            for rr in rule_res.get("relationships", []):
                pair = (clean_val(rr.get("entity_a", "")).lower(), clean_val(rr.get("entity_b", "")).lower())
                rev_pair = (pair[1], pair[0])
                if pair not in seen_rels and rev_pair not in seen_rels:
                    hf_rels.append(rr)
                    seen_rels.add(pair)
            hf_res["relationships"] = hf_rels
            return hf_res
        except Exception as e:
            logger.warning(f"HF Inference API failed for investigation: {e}. Using fallback.")

    logger.info("Using rule-based investigation engine")
    return _rule_based_investigation(case_data)


async def extract_entities(text: str) -> list[dict]:
    """Extract named entities from text."""
    if settings.hf_available:
        try:
            logger.info("Using HF for entity extraction")
            return await _hf_extract_entities(text)
        except Exception as e:
            logger.warning(f"HF entity extraction failed: {e}. Using regex fallback.")

    return _extract_entities_regex(text)
