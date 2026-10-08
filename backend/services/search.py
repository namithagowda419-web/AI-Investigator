"""
TraceShield – Tavily Web Search Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wraps the Tavily Search API for public-source intelligence gathering.
Falls back gracefully when TAVILY_API_KEY is not set.
"""

import logging
from typing import Any

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

TAVILY_URL = "https://api.tavily.com/search"


async def search_web(query: str, max_results: int = 8) -> dict[str, Any]:
    """
    Search for publicly available information using Tavily.
    Returns structured results with source, title, summary, url, relevance.
    Falls back to intelligent local OSINT simulation when TAVILY_API_KEY is not configured.
    """
    if not settings.tavily_available:
        return _mock_search_web(query, max_results)

    payload = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "search_depth": "advanced",
        "max_results": max_results,
        "include_answer": True,
        "include_raw_content": False,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(TAVILY_URL, json=payload)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("results", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "summary": item.get("content", "")[:400],
                "source": _extract_domain(item.get("url", "")),
                "relevance_score": round(item.get("score", 0) * 100),
                "published_date": item.get("published_date", ""),
            })

        return {
            "available": True,
            "query": query,
            "answer": data.get("answer", ""),
            "results": results,
            "result_count": len(results),
            "disclaimer": "Public-source intelligence only. Information should be independently verified.",
        }

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            return {
                "available": False,
                "error": "Invalid Tavily API key. Check your TAVILY_API_KEY.",
                "results": [],
                "query": query,
            }
        logger.error(f"Tavily HTTP error: {e}")
        return {
            "available": False,
            "error": f"Search service returned error: {e.response.status_code}",
            "results": [],
            "query": query,
        }
    except Exception as e:
        logger.error(f"Tavily search error: {e}")
        return {
            "available": False,
            "error": f"Search service temporarily unavailable: {str(e)}",
            "results": [],
            "query": query,
        }


def _extract_domain(url: str) -> str:
    """Extract clean domain from URL."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc.replace("www.", "")
    except Exception:
        return url


def _mock_search_web(query: str, max_results: int = 8) -> dict[str, Any]:
    """Generates context-aware local intelligence results when Tavily API key is absent."""
    clean_q = query.strip()
    results = [
        {
            "title": f"OSINT Public Registry Record: {clean_q}",
            "url": f"https://cybercrime.gov.in/public/reports?q={clean_q.replace(' ', '+')}",
            "summary": f"Public fraud advisory records and citizen alerts mentioning '{clean_q}'. Cross-referenced against known phishing databases, spam repositories, and telecommunication indicators.",
            "source": "cybercrime.gov.in",
            "relevance_score": 92,
            "published_date": "2025-01-15",
        },
        {
            "title": f"Domain & Identifier Reputation Analysis: {clean_q}",
            "url": f"https://whois.domaintools.com/{clean_q.replace(' ', '-').lower()}",
            "summary": f"WHOIS registration parameters, autonomous system number (ASN), and SSL certificate telemetry for entities related to '{clean_q}'. Domain age and privacy proxy protection status noted.",
            "source": "whois.domaintools.com",
            "relevance_score": 86,
            "published_date": "2025-02-01",
        },
        {
            "title": f"Regulatory Advisory Bulletin: Pretexts involving '{clean_q}'",
            "url": f"https://rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?q={clean_q.replace(' ', '+')}",
            "summary": f"Central banking and financial oversight bulletin warning consumers against unauthorized payment requests, impersonation tactics, and fake KYC notices involving '{clean_q}'.",
            "source": "rbi.org.in",
            "relevance_score": 81,
            "published_date": "2025-03-10",
        },
    ]

    return {
        "available": True,
        "mode": "local-simulation",
        "query": query,
        "answer": f"Local OSINT intelligence compiled for '{clean_q}'. 3 matching public record categories found. (Demo Mode: Configure TAVILY_API_KEY in backend/.env for live web queries).",
        "results": results[:max_results],
        "result_count": len(results[:max_results]),
        "disclaimer": "Local simulation mode. Set TAVILY_API_KEY in .env for live internet search. All intelligence requires independent verification.",
    }
