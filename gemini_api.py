"""Gemini API client for E Nagrik.

Primary feature:
  1. analyze_image() -> waste classification of an uploaded photo

Configuration (env vars win over the defaults below):
  GEMINI_API_KEY  -> your Google AI Studio key
  GEMINI_MODEL    -> model id, default "gemini-3.1-flash-lite"

Everything here raises GeminiError on failure so callers can fall back to the
on-device model when cloud analysis is unavailable.
"""

import base64
import json
import os
import random
import ssl
import sys
import time
import urllib.error
import urllib.request

import certifi
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
# if the configured model id is not available for this key, try these in order
MODEL_FALLBACKS = [MODEL, "gemini-3.1-flash-lite", "gemini-flash-lite-latest",
                   "gemini-3.5-flash-lite", "gemini-3-flash-lite"]
BASE = "https://generativelanguage.googleapis.com/v1beta/models"
TIMEOUT_IMAGE = 20
TIMEOUT_QUIZ = 20
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

CATEGORIES = ["Wet / Biodegradable", "Dry / Recyclable", "Hazardous Waste",
              "E-Waste", "Sanitary Waste", "Glass", "Mixed / Uncertain"]

# kept in sync with ai_waste.py so both engines return the same shape
LOW_CONFIDENCE = 50
LOW_CONFIDENCE_NOTE = "AI confidence is low. Please verify the waste type manually."
SUGGESTED_COMPLAINT = {
    "Wet / Biodegradable": "Improper Segregation", "Dry / Recyclable": "Improper Segregation",
    "Glass": "Improper Segregation", "Sanitary Waste": "Improper Segregation",
    "Hazardous Waste": "Illegal Dumping", "E-Waste": "Illegal Dumping", "Mixed / Uncertain": "Other",
}


class GeminiError(RuntimeError):
    pass


# ------------------------------------------------------------- transport
def _post(model, payload, timeout):
    url = f"{BASE}/{model}:generateContent"
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": API_KEY},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CONTEXT) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode("utf-8", "replace")
        except Exception:
            detail = ""
        err = GeminiError(f"HTTP {e.code} {model}: {detail[:300]}")
        print(f"[gemini] {err}", file=sys.stderr, flush=True)
        raise err
    except GeminiError:
        raise
    except Exception as e:  # network/timeout/DNS
        err = GeminiError(f"{type(e).__name__}: {e}")
        print(f"[gemini] {err}", file=sys.stderr, flush=True)
        raise err


def _generate(payload, timeout=TIMEOUT_IMAGE):
    last = None
    for model in dict.fromkeys(MODEL_FALLBACKS):  # ordered, de-duplicated
        try:
            return _post(model, payload, timeout)
        except GeminiError as e:
            last = e
            msg = str(e)
            # model id unavailable for this key -> try the next one
            if "HTTP 404" in msg or "is not found" in msg:
                continue
            raise  # auth / quota / bad request: other model ids fail the same way
    raise last or GeminiError("no model available")


def _text(resp):
    try:
        parts = resp["candidates"][0]["content"]["parts"]
        text = "".join(p.get("text", "") for p in parts).strip()
    except (KeyError, IndexError, TypeError):
        text = ""
    if not text:
        raise GeminiError("empty response from Gemini")
    return text


def _parse_json(text):
    t = text.strip()
    if t.startswith("```"):
        t = t.split("```")[1]
        if t.startswith("json"):
            t = t[4:]
    t = t.strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        start = min([i for i in (t.find("{"), t.find("[")) if i >= 0], default=-1)
        if start >= 0:
            try:
                return json.loads(t[start:])
            except json.JSONDecodeError:
                pass
    raise GeminiError("Gemini did not return valid JSON")


# ------------------------------------------------------------ 1. image AI
_IMAGE_PROMPT = """You are a waste-classification assistant inside a municipal waste-management app.
Examine the image and classify its main waste item.

Return ONLY valid JSON, no markdown, with exactly these keys:
{
  "detected_item": "<short item name, max 40 chars>",
  "category": one of ["Wet / Biodegradable", "Dry / Recyclable", "Hazardous Waste", "E-Waste", "Sanitary Waste", "Glass", "Mixed / Uncertain"],
  "confidence": <integer 0-100>,
  "disposal_guidance": "<one imperative sentence, max 160 chars, how to dispose of it>",
  "title": "<short issue title, max 60 chars, based on the actual garbage shown>",
  "description": "<short issue description, max 180 chars, clearly explaining what kind of waste is shown and why it needs action>"
}

Rules:
- If the image shows no waste, several waste types mixed together, or you are unsure, use "Mixed / Uncertain" and confidence <= 40.
- Never return confidence above 96.
- title and description must describe the actual waste in the image, not generic app text.
- Batteries/chemicals -> Hazardous Waste; phones/chargers/appliances -> E-Waste; diapers/sanitary products -> Sanitary Waste; glass bottles/containers -> Glass; food/organic -> Wet / Biodegradable; plastic/paper/metal packaging -> Dry / Recyclable."""


def analyze_image(image_bytes, mime_type="image/jpeg"):
    """Classify a waste photo -> {"detected_item", "category", "confidence", "disposal_guidance", "title", "description"}."""
    if not API_KEY:
        raise GeminiError("no API key configured")
    payload = {
        "contents": [{"parts": [
            {"text": _IMAGE_PROMPT},
            {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode("ascii")}},
        ]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 600},
    }
    data = _parse_json(_text(_generate(payload, TIMEOUT_IMAGE)))
    if not isinstance(data, dict):
        raise GeminiError("unexpected image response")

    item = str(data.get("detected_item") or "").strip()[:60] or "Unknown"
    category = str(data.get("category") or "").strip()
    if category not in CATEGORIES:
        category = "Mixed / Uncertain"
    try:
        confidence = max(0, min(100, int(round(float(data.get("confidence", 0))))))
    except (TypeError, ValueError):
        confidence = 0
    guidance = str(data.get("disposal_guidance") or "").strip()[:200]
    title = str(data.get("title") or "").strip()[:60] or f"{item} waste issue"
    description = str(data.get("description") or "").strip()[:180] or f"Detected {item.lower()} waste in the image. Action is needed for proper segregation and disposal."
    low = confidence <= LOW_CONFIDENCE
    return {
        "success": True,
        "detected_item": item,
        "category": category,
        "confidence": confidence,
        "disposal_guidance": guidance,
        "title": title,
        "description": description,
        "low_confidence": low,
        "low_confidence_note": LOW_CONFIDENCE_NOTE if low else "",
        "suggested_category": SUGGESTED_COMPLAINT.get(category, "Other"),
        "source": "gemini",
    }


_REPORT_VALIDATION_PROMPT = """You moderate submissions for a municipal waste-reporting app.
Decide whether the submission is a genuine, relevant waste issue that should be sent to city staff.

Return ONLY valid JSON with exactly:
{"valid": true or false, "reason": "short reason, max 160 chars"}

Accept submissions about visible or described waste problems such as overflowing bins, litter on roads,
missed collection, illegal dumping, or improper segregation. The location may be an ordinary place name.
Reject jokes, random text, advertisements, test data, abusive content, unrelated topics, and images that
do not show waste. If an image is attached, it must be relevant to the described waste issue.
"""


def validate_report(category, title, description, location, image_bytes=None, mime_type="image/jpeg"):
    """Validate a complaint before it is persisted."""
    if not API_KEY:
        raise GeminiError("no API key configured")
    details = (
        f"Category: {category}\n"
        f"Title: {title}\n"
        f"Description: {description}\n"
        f"Location: {location}"
    )
    parts = [{"text": _REPORT_VALIDATION_PROMPT + "\n\nSubmission:\n" + details}]
    if image_bytes:
        parts.append({"inline_data": {
            "mime_type": mime_type,
            "data": base64.b64encode(image_bytes).decode("ascii"),
        }})
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 220},
    }
    data = _parse_json(_text(_generate(payload, TIMEOUT_IMAGE)))
    if not isinstance(data, dict) or not isinstance(data.get("valid"), bool):
        raise GeminiError("invalid report validation response")
    return {"valid": data["valid"], "reason": str(data.get("reason") or "").strip()[:160]}


# -------------------------------------------------------------- 2. quiz AI
_TOPIC_POOLS = [
    ["wet vs dry segregation at home", "which bin each item belongs in"],
    ["e-waste: phones, chargers, batteries", "where to hand over old electronics"],
    ["hazardous waste: paint, chemicals, medicines", "safe disposal of toxic items"],
    ["bin colours and what each one is for", "kerbside collection rules"],
    ["recycling: what can and cannot be recycled", "why cleaning packaging matters"],
    ["sanitary and medical waste", "handling bandages, needles, diapers"],
    ["composting and food waste", "reduce / reuse / refill habits"],
    ["plastic, single-use items and alternatives", "paper, glass and metal recycling"],
]

_QUIZ_PROMPT = """You write multiple-choice questions for a "waste segregation" quiz in a civic app (India).

Return ONLY valid JSON, no markdown, with exactly this shape:
{{"questions": [{{"q": "<question, max 110 chars>", "options": ["<max 50 chars>", "<max 50 chars>", "<max 50 chars>", "<max 50 chars>"], "answer": <0-3>}}, ... {count} items]}}

Rules:
- Exactly {count} questions, each with exactly 4 distinct options and exactly one correct answer.
- Focus this round on: {topics}.
- Clear, factual, everyday language (Hinglish-English is fine); no trick questions.
- Never put the correct answer in the same position every time.
{avoid_block}"""


def generate_quiz(count=5, avoid=None):
    """Generate quiz questions -> [{"q", "options": [4], "answer": int}] (validated)."""
    if not API_KEY:
        raise GeminiError("no API key configured")
    topics = random.choice(_TOPIC_POOLS)
    request_nonce = f"{time.time_ns()}-{random.randint(1000, 9999)}"
    avoid_block = ""
    seen_prev = [" ".join(str(a).split()) for a in (avoid or []) if a][:25]
    previous_questions = {q.lower() for q in seen_prev}
    if seen_prev:
        avoid_block = ("\n- Do NOT repeat, paraphrase or lightly reword any of these "
                       "questions that were already shown:\n" +
                       "\n".join(f'  * "{a}"' for a in seen_prev))
    prompt = _QUIZ_PROMPT.format(count=count, topics=", ".join(topics), avoid_block=avoid_block)
    prompt += f"\nThis is a fresh quiz request ({request_nonce}). Create a genuinely different set from any previous set."
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.95, "maxOutputTokens": 1600},
    }
    data = _parse_json(_text(_generate(payload, TIMEOUT_QUIZ)))
    raw = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(raw, list):
        raise GeminiError("quiz response missing questions")

    questions = []
    seen = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        q = " ".join(str(item.get("q") or "").split())[:120]
        opts = item.get("options")
        if not q or not isinstance(opts, (list, tuple)) or len(opts) != 4:
            continue
        options = [" ".join(str(o).split())[:50] for o in opts]
        if any(not o for o in options) or len({o.lower() for o in options}) != 4:
            continue
        try:
            answer = int(item.get("answer"))
        except (TypeError, ValueError):
            continue
        if answer not in (0, 1, 2, 3) or q.lower() in seen or q.lower() in previous_questions:
            continue
        seen.add(q.lower())
        questions.append({"q": q, "options": options, "answer": answer})
        if len(questions) == count:
            break
    if len(questions) < count:
        raise GeminiError(f"only {len(questions)} valid questions returned")
    return questions
