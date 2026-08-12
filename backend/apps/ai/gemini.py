"""Cliente Google Gemini (Generative Language API)."""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)


def gemini_available() -> bool:
    return bool((getattr(settings, "GEMINI_API_KEY", "") or "").strip())


def _endpoint() -> str:
    model = getattr(settings, "GEMINI_MODEL", "gemini-flash-latest") or "gemini-flash-latest"
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )


def generate_text(
    prompt: str,
    *,
    system: str | None = None,
    temperature: float = 0.3,
    json_mode: bool = False,
) -> str:
    """
    Chama generateContent do Gemini.
    Retorna texto da primeira candidata ou string vazia em falha.
    """
    api_key = (getattr(settings, "GEMINI_API_KEY", "") or "").strip()
    if not api_key:
        return ""

    contents: list[dict[str, Any]] = []
    user_text = prompt
    if system:
        user_text = f"{system.strip()}\n\n---\n\n{prompt.strip()}"

    contents.append({"role": "user", "parts": [{"text": user_text}]})

    body: dict[str, Any] = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "topP": 0.9,
            "maxOutputTokens": 4096,
        },
    }
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        _endpoint(),
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-goog-api-key": api_key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        logger.warning("Gemini HTTP %s: %s", exc.code, err_body[:500])
        return ""
    except Exception:
        logger.exception("Gemini request failed")
        return ""

    try:
        parts = payload["candidates"][0]["content"]["parts"]
        texts = [p.get("text", "") for p in parts if isinstance(p, dict)]
        return "\n".join(t for t in texts if t).strip()
    except (KeyError, IndexError, TypeError):
        logger.warning("Gemini response unexpected: %s", str(payload)[:400])
        return ""


def generate_json(
    prompt: str,
    *,
    system: str | None = None,
    temperature: float = 0.25,
) -> dict[str, Any]:
    raw = generate_text(prompt, system=system, temperature=temperature, json_mode=True)
    if not raw:
        return {}
    # Remove fences se vierem
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        # tenta extrair bloco {...}
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start >= 0 and end > start:
            try:
                data = json.loads(cleaned[start : end + 1])
                return data if isinstance(data, dict) else {}
            except json.JSONDecodeError:
                return {}
        return {}
