# TraceShield

> **AI-Powered Investigation & Scam Detection Platform**
> Hackathon-ready · FastAPI + React · Qwen2.5 AI · Tavily + NewsAPI

[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)

---

## Project Overview

TraceShield combines two major AI capabilities into one professional investigation platform:

1. **AI Scam / Fraud Detection** — Analyze suspicious SMS, WhatsApp, email, job offers, and bank alerts
2. **AI Crime Investigation Assistance** — Build cases, extract entities, map relationships, and gather public-source intelligence

---

## Features

### Scam Detection
- Paste any suspicious message → AI verdict: SCAM / LEGITIMATE
- Risk score (0–100)
- Category classification (12+ categories: Bank/KYC, Job Scam, Digital Arrest, Investment, Lottery, etc.)
- Suspicious indicator detection (Urgency, Threats, Payment Requests, OTP, etc.)
- AI natural language explanation
- Example messages for demo

### Investigation Workspace
- Create and manage investigation cases
- AI-powered entity extraction (Person, Phone, Email, Organization, Location, URL)
- Relationship mapping between entities
- Timeline reconstruction
- AI investigation analysis with leads and verification steps
- Web intelligence search (Tavily)
- News intelligence search (NewsAPI)
- Case activity timeline

### AI Model Layer
- **Primary**: Hugging Face Inference API → Qwen2.5-1.5B-Instruct
- **Future**: Your trained QLoRA adapter (modular plug-in architecture)
- **Fallback**: Rule-based analysis (always works without any API key)

---

## Architecture

```
TraceShield/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings (env vars via pydantic-settings)
│   ├── requirements.txt
│   ├── .env.example         # Environment variable template
│   ├── api/
│   │   ├── scam.py          # POST /api/scam/analyze
│   │   ├── investigation.py # POST /api/investigation/*  GET /api/investigation/*
│   │   └── search.py        # POST /api/search  POST /api/intelligence
│   ├── ai/
│   │   ├── scam_detector.py # HF API + rule-based fallback for scam detection
│   │   └── investigator.py  # HF API + fallback for investigation analysis
│   ├── services/
│   │   ├── search.py        # Tavily Search API client
│   │   └── intelligence.py  # NewsAPI client
│   ├── models/
│   │   └── case_store.py    # In-memory case persistence
│   └── utils/
└── frontend/
    ├── src/
    │   ├── App.jsx          # Root component + routing
    │   ├── index.css        # Global design system
    │   ├── api/
    │   │   └── client.js    # Axios API client
    │   ├── components/
    │   │   └── UI.jsx       # Shared components (Navbar, RiskMeter, etc.)
    │   └── pages/
    │       ├── HomePage.jsx
    │       ├── ScamDetectorPage.jsx
    │       ├── InvestigationPage.jsx
    │       └── AboutPage.jsx
    ├── .env                 # VITE_API_URL=http://localhost:8000
    └── package.json
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Lucide React, Vanilla CSS |
| Backend | Python 3.12, FastAPI, Pydantic v2, uvicorn |
| HTTP | httpx (async), axios |
| AI Model | Qwen2.5-1.5B-Instruct via HF Inference API |
| Fine-tuning | QLoRA (4-bit BnB + LoRA adapters) — future |
| Search | Tavily Search API |
| Intelligence | NewsAPI.org |
| Entity Extraction | Regex + AI (modular) |

---

## AI Model

### Current Mode
TraceShield uses the **Hugging Face Inference API** with `Qwen/Qwen2.5-1.5B-Instruct` for:
- Scam classification (SCAM / LEGITIMATE)
- Risk scoring and category assignment
- Investigation analysis and lead generation
- Entity extraction

When `HF_API_TOKEN` is not set, the system falls back to **rule-based analysis** — always functional for demos.

### QLoRA Fine-tuning (Your Trained Model)

The AI layer is designed so you can plug in your trained QLoRA adapter without changing any frontend or API code.

**Dataset format** (Qwen chat):
```json
{
  "system": "You are a scam detection expert...",
  "user": "<suspicious message>",
  "assistant": "SCAM"
}
```

**Training setup** (when adapter is ready):
```python
# requirements: transformers peft bitsandbytes accelerate
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel
import torch

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.float16,
)
base_model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-1.5B-Instruct",
    quantization_config=bnb_config,
    device_map="auto",
)
model = PeftModel.from_pretrained(base_model, "./adapters/scam_detector_v1")
```

**To activate** your adapter:
1. Set `QLORA_ADAPTER_PATH=./adapters/scam_detector_v1` in `backend/.env`
2. Uncomment the QLoRA block in `backend/ai/scam_detector.py`
3. Install: `pip install transformers peft bitsandbytes accelerate`

---

## API Configuration

Copy `backend/.env.example` to `backend/.env` and fill in keys:

```env
# AI Model (free at huggingface.co/settings/tokens)
HF_API_TOKEN=hf_your_token_here
HF_MODEL_ID=Qwen/Qwen2.5-1.5B-Instruct

# Web Search (free tier at app.tavily.com)
TAVILY_API_KEY=tvly-your_key_here

# News Intelligence (free tier at newsapi.org/register)
NEWS_API_KEY=your_news_api_key_here
```

The platform **works without any API keys** — it uses rule-based fallback for AI and clearly indicates when external services are unavailable.

---

## Installation

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your API keys (optional but recommended)
```

### Frontend

```bash
cd frontend
npm install
```

---

## Running Locally

### Start Backend

```bash
cd backend
python main.py
# OR
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API Docs: http://localhost:8000/docs  
Health: http://localhost:8000/api/health

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: http://localhost:5173

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service status + capability info |
| POST | `/api/scam/analyze` | Analyze a message for scam |
| POST | `/api/investigation/create` | Create investigation case |
| POST | `/api/investigation/analyze` | Run AI analysis on case |
| GET | `/api/investigation/list` | List all cases |
| GET | `/api/investigation/{id}` | Get specific case |
| POST | `/api/entities/extract` | Extract entities from text |
| POST | `/api/search` | Web search via Tavily |
| POST | `/api/intelligence` | News search via NewsAPI |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HF_API_TOKEN` | Recommended | HF Inference API key |
| `HF_MODEL_ID` | Optional | Override model ID |
| `QLORA_ADAPTER_PATH` | Optional | Path to trained adapter |
| `TAVILY_API_KEY` | Optional | Tavily search key |
| `NEWS_API_KEY` | Optional | NewsAPI.org key |
| `BACKEND_PORT` | Optional | Server port (default: 8000) |
| `CORS_ORIGINS` | Optional | Allowed frontend origins |

---

## Ethical Principles

TraceShield is built with responsible AI in mind:

- **Never claims certainty** — uses "potential", "possible", "requires verification"
- **No fabricated responses** — API failures are shown clearly to users  
- **Clear mode indication** — users always know if they're in demo/fallback mode
- **Public source labeling** — all web data is labeled as public-source intelligence
- **Independent verification required** — clearly stated throughout the UI

---

## Future Improvements

1. **QLoRA Integration** — Plug in your trained adapter (architecture ready)
2. **Persistent Database** — Replace in-memory store with PostgreSQL/MongoDB
3. **Graph Visualization** — D3.js/Sigma.js relationship network graph
4. **PDF Report Export** — Generate case summary PDFs
5. **Multi-language Support** — Hindi, Tamil, Bengali scam detection
6. **OCR** — Screenshot analysis for scam detection
7. **Phone Intelligence** — TRAI/telecom public lookup integration
8. **Batch Analysis** — Process multiple messages at once

---

## License

MIT — Built for hackathon demonstration. Not for production law enforcement use without professional legal review.
