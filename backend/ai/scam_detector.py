"""
TraceShield – AI Scam Detector
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This module provides a modular AI inference layer for scam detection.

Current modes (in priority order):
  1. QLoRA adapter   – loaded if QLORA_ADAPTER_PATH is set (future)
  2. HF Inference API – uses Qwen/Qwen2.5-1.5B-Instruct if HF_API_TOKEN is set
  3. Rule-based fallback – always available, used when no AI key is configured

To integrate your trained QLoRA adapter, set QLORA_ADAPTER_PATH in .env
and uncomment the transformers/peft block below.
"""

import re
import json
import logging
from typing import Optional

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)


# ─── Scam categories ──────────────────────────────────────────────────────────
SCAM_CATEGORIES = [
    "Bank/KYC Fraud",
    "Police/Digital Arrest Threat",
    "Job Scam",
    "Investment/Trading Scam",
    "Lottery/Prize Scam",
    "Shopping/Delivery Scam",
    "Aadhaar/Identity Fraud",
    "Relative/Emergency Scam",
    "Blackmail/Threat",
    "Phishing",
    "Romance Scam",
    "Other",
]

SUSPICIOUS_INDICATOR_PATTERNS = {
    "Bank/KYC Request": [
        r"\bkyc\b", r"\bpan\s*card\b", r"\baadhaar\b",
        r"\baccount.*(?:block|suspend|hold|deactivat|freeze)",
        r"\b(?:block|suspend|hold|deactivat|freeze).*account",
        r"\b(?:update|verify|confirm|validate).*(?:account|kyc|pan|details|document)",
        r"\bnet\s?banking\b", r"\bdebit\s?card\b", r"\bcredit\s?card\b",
        r"\bsbi-kyc\b", r"\bkyc-verify\b",
    ],
    "Urgency": [
        r"\burgent\b", r"\bimmediately\b", r"\bright now\b", r"\bexpires?\b",
        r"\bdeadline\b", r"\blast chance\b", r"\bhurry\b", r"\bact now\b",
        r"\bwithin \d+ hour", r"\bwithin \d+ minute", r"\b24 hours?\b",
        r"\bfinal warning\b",
    ],
    "Threatening Language": [
        r"\barrest\b", r"\bjail\b", r"\bpolice\b", r"\bcyber crime\b",
        r"\blegal action\b", r"\bwarrant\b", r"\bcourt\b", r"\bfir\b",
        r"\bblockchain\b.*\bfrozen\b", r"\baccount.*block", r"\bsuspend",
        r"\bmoney laundering\b", r"\bdigital arrest\b",
    ],
    "Payment Request": [
        r"\bpay\b", r"\bpayment\b", r"\btransfer\b", r"\bwire\b",
        r"\bsend money\b", r"\bgift card\b", r"\bcryptocurrency\b",
        r"\bbitcoin\b", r"\bupi\b", r"\brtgs\b", r"\bneft\b",
        r"\bwallets?\b", r"\bpaytm\b", r"\bphonem?pe\b", r"\bgoogle pay\b",
        r"\bprocessing fee\b", r"\bregistration fee\b",
    ],
    "Impersonation": [
        r"\bRBI\b", r"\bReserve Bank of India\b", r"\bSEBI\b", r"\bCBI\b", r"\bED\b",
        r"\bNarcotics\b", r"\bNCB\b", r"\bIncome Tax\b", r"\bCustoms\b", r"\bTRAI\b",
        r"\bMicrosoft\b", r"\bAmazon\b", r"\bGoogle\b", r"\bApple\b", r"\bSBI\b",
        r"\bState Bank of India\b", r"\bHDFC\b", r"\bICICI\b", r"\bAxis Bank\b",
        r"\bPNB\b", r"\bPunjab National Bank\b", r"\bBank of Baroda\b",
        r"\bbank official\b", r"\bgovernment officer\b", r"\bfederal\b",
        r"\binterpol\b", r"\bpolice officer\b", r"\bcbi officer\b",
    ],
    "Suspicious Link": [
        r"http[s]?://\S+", r"\bclick here\b", r"\bvisit\b.*\blink\b",
        r"\bdownload\b.*\bapp\b", r"\bverify\b.*\blink\b",
        r"bit\.ly|tinyurl|t\.me|wa\.me|\.tk/|\.ml/|\.ga/|\.cf/",
    ],
    "OTP/PIN Request": [
        r"\botp\b", r"\bone.?time.?password\b", r"\bpin\b",
        r"\bcvv\b", r"\bpassword\b", r"\bcredentials\b",
        r"\bverification code\b", r"\bsecurity code\b",
    ],
    "Unrealistic Reward": [
        r"\bwon\b", r"\bwinner\b", r"\blottery\b", r"\bprize\b",
        r"\bcashback\b", r"\brefund\b", r"\blakh\b", r"\bcrore\b",
        r"\bmillion\b", r"\bfree\b.*\biphone\b", r"\bfree\b.*\bphone\b",
        r"\bselected\b", r"\bcongratulation", r"\blucky draw\b",
    ],
    "Fake Employment": [
        r"\bjob offer\b", r"\bwork from home\b", r"\bpart.?time\b",
        r"\bearning\b.*\bday\b", r"\b₹\s*\d+.*(?:per|a|each) (?:day|hour|task|week)",
        r"\bregist(?:er|ration) fee\b", r"\btraining fee\b", r"\bdeposit\b.*\bjob\b",
        r"\bdata entry\b",
    ],
}

INDICATOR_WEIGHTS = {
    "Bank/KYC Request": 25,
    "Threatening Language": 25,
    "Payment Request": 25,
    "OTP/PIN Request": 30,
    "Impersonation": 20,
    "Urgency": 15,
    "Suspicious Link": 20,
    "Unrealistic Reward": 25,
    "Fake Employment": 25,
}

SYSTEM_PROMPT = """You are TraceShield's AI scam detection engine. Your task is to analyze suspicious messages and determine whether they are SCAM or LEGITIMATE.

Respond ONLY with a valid JSON object in this exact format:
{
  "verdict": "SCAM" or "LEGITIMATE",
  "risk_score": <integer 0-100>,
  "category": "<one of the scam categories or 'Not Applicable'>",
  "indicators": ["<indicator1>", "<indicator2>"],
  "explanation": "<2-3 sentence explanation of your reasoning>"
}

Scam categories: Bank/KYC Fraud, Police/Digital Arrest Threat, Job Scam, Investment/Trading Scam, Lottery/Prize Scam, Shopping/Delivery Scam, Aadhaar/Identity Fraud, Relative/Emergency Scam, Blackmail/Threat, Phishing, Romance Scam, Other, Not Applicable.

Be conservative: only mark as SCAM if there are clear indicators. Use language like "potential", "indicators detected". Never state certainty about guilt."""


# ─── Rule-based fallback ───────────────────────────────────────────────────────
def _rule_based_analysis(message: str) -> dict:
    """
    Lightweight rule-based scam detector used when AI is unavailable.
    Scores based on regex pattern matching across scam indicator groups.
    """
    if message is None:
        raise ValueError("Message is required")
    message = str(message).strip()
    if not message:
        return {
            "verdict": "LEGITIMATE",
            "risk_score": 0,
            "category": "Not Applicable",
            "indicators": [],
            "explanation": "No message content provided for evaluation.",
            "mode": "rule-based",
        }
    text_lower = message.lower()
    detected_indicators = []
    total_weight = 0

    for indicator_name, patterns in SUSPICIOUS_INDICATOR_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                if indicator_name not in detected_indicators:
                    detected_indicators.append(indicator_name)
                    total_weight += INDICATOR_WEIGHTS.get(indicator_name, 15)
                break

    # Category classification
    cat_map = {
        "Bank/KYC Fraud": ["bank", "kyc", "account block", "blocked", "suspended", "sbi", "hdfc", "icici", "pan card", "rbi"],
        "Police/Digital Arrest Threat": ["arrest", "police", "cyber crime", "cbi", "ed", "warrant", "court", "digital arrest"],
        "Job Scam": ["job offer", "work from home", "registration fee", "training fee", "data entry", "per week", "per day"],
        "Investment/Trading Scam": ["invest", "trading", "profit", "returns", "crypto", "bitcoin", "stocks"],
        "Lottery/Prize Scam": ["lottery", "won", "winner", "prize", "selected", "lucky draw", "kbc", "crore"],
        "Shopping/Delivery Scam": ["package", "delivery", "redelivery", "shipping", "courier", "tracking", "postal service", "parcel"],
        "Relative/Emergency Scam": ["lost my phone", "temporary number", "please send me", "emergency", "clinic visit", "mom", "dad", "urgent transfer", "need help"],
        "Blackmail/Threat": ["send this video", "nude", "explicit", "blackmail", "recording", "your footage", "I have your"],
        "OTP/PIN Request": ["otp", "pin", "cvv", "password", "verification code"],
        "Phishing": ["http", "click here", "verify", "bit.ly", "tinyurl", "update details"],
    }
    best_cat = "Other"
    best_score = 0
    for cat, keywords in cat_map.items():
        score = sum(1 for kw in keywords if kw.lower() in text_lower)
        if score > best_score:
            best_score = score
            best_cat = cat

    # Multiple indicators compound risk
    bonus = 10 if len(detected_indicators) >= 2 else 0
    risk_score = min(total_weight + bonus, 98)
    if not detected_indicators:
        risk_score = 12

    verdict = "SCAM" if risk_score >= 35 else "LEGITIMATE"

    if verdict == "SCAM":
        explanation = (
            f"Analysis detected {len(detected_indicators)} high-risk indicator(s): {', '.join(detected_indicators)}. "
            f"Modus operandi aligns with {best_cat}. "
            f"Contains coercive or deceptive patterns typically observed in financial/cyber fraud campaigns."
        )
    else:
        explanation = (
            f"No critical scam indicators detected (risk score {risk_score}/100). "
            f"Message appears low-risk based on standard heuristics. "
            f"Always verify unsolicited communications through official channels."
        )

    return {
        "verdict": verdict,
        "risk_score": risk_score,
        "category": best_cat if verdict == "SCAM" else "Not Applicable",
        "indicators": detected_indicators,
        "explanation": explanation,
        "mode": "rule-based",
    }


# ─── HF Inference API ─────────────────────────────────────────────────────────
async def _hf_inference_analysis(message: str) -> dict:
    """
    Calls Hugging Face Inference API with Qwen2.5-1.5B-Instruct.
    Parses the JSON response from the model.
    """
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
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Analyze this message:\n\n{message}"},
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
                        result["mode"] = "hf-inference"
                        result.setdefault("verdict", "UNKNOWN")
                        result.setdefault("risk_score", 50)
                        result.setdefault("category", "Other")
                        result.setdefault("indicators", [])
                        result.setdefault("explanation", "No explanation provided.")
                        return result
            except Exception as e:
                last_error = e
                continue

    raise ValueError(f"HF inference failed across endpoints: {last_error}")


# ─── QLoRA adapter placeholder ────────────────────────────────────────────────
# To integrate your trained QLoRA adapter:
#
# 1. Install: pip install transformers peft bitsandbytes accelerate
# 2. Set QLORA_ADAPTER_PATH in .env
# 3. Uncomment and adapt the block below:
#
# from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
# from peft import PeftModel
# import torch
#
# _qlora_model = None
# _qlora_tokenizer = None
#
# def _load_qlora():
#     global _qlora_model, _qlora_tokenizer
#     bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
#                                      bnb_4bit_use_double_quant=True,
#                                      bnb_4bit_compute_dtype=torch.float16)
#     base = "Qwen/Qwen2.5-1.5B-Instruct"
#     _qlora_tokenizer = AutoTokenizer.from_pretrained(base)
#     base_model = AutoModelForCausalLM.from_pretrained(base, quantization_config=bnb_config, device_map="auto")
#     _qlora_model = PeftModel.from_pretrained(base_model, settings.qlora_adapter_path)
#
# async def _qlora_inference(message: str) -> dict:
#     if _qlora_model is None:
#         _load_qlora()
#     # ... tokenize, generate, parse ...
#     pass


# ─── Public interface ─────────────────────────────────────────────────────────
async def analyze_scam(message: str) -> dict:
    """
    Main entry point for scam analysis.
    Tries QLoRA → HF Inference API → Rule-based fallback.
    """
    if message is None:
        raise ValueError("Message is required")
    message = str(message).strip()
    if not message:
        return {
            "verdict": "LEGITIMATE",
            "risk_score": 0,
            "category": "Not Applicable",
            "indicators": [],
            "explanation": "No text content was provided for analysis.",
            "mode": "rule-based",
        }
    # Future: QLoRA adapter
    # if settings.qlora_adapter_path:
    #     return await _qlora_inference(message)

    if settings.hf_available:
        try:
            logger.info("Using HF Inference API for scam analysis")
            result = await _hf_inference_analysis(message)
            return result
        except Exception as e:
            logger.warning(f"HF Inference API failed: {e}. Falling back to rule-based.")

    logger.info("Using rule-based fallback for scam analysis")
    return _rule_based_analysis(message)
