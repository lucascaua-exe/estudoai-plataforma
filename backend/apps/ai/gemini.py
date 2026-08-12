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


DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"


def _endpoint(model: str | None = None) -> str:
    model = model or getattr(settings, "GEMINI_MODEL", DEFAULT_GEMINI_MODEL) or DEFAULT_GEMINI_MODEL
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )


def _extract_text(payload: dict[str, Any]) -> str:
    try:
        parts = payload["candidates"][0]["content"]["parts"]
        texts = [p.get("text", "") for p in parts if isinstance(p, dict)]
        return "\n".join(t for t in texts if t).strip()
    except (KeyError, IndexError, TypeError):
        logger.warning("Gemini response unexpected: %s", str(payload)[:400])
        return ""


def generate_text(
    prompt: str,
    *,
    system: str | None = None,
    temperature: float = 0.3,
    json_mode: bool = False,
    history: list[dict[str, str]] | None = None,
) -> str:
    """
    Chama generateContent do Gemini.
    history: lista opcional de {role: user|model|assistant, content: str}
    Retorna texto da primeira candidata ou string vazia em falha.
    """
    api_key = (getattr(settings, "GEMINI_API_KEY", "") or "").strip()
    if not api_key:
        return ""

    contents: list[dict[str, Any]] = []
    for turn in history or []:
        role = (turn.get("role") or "user").lower()
        gemini_role = "model" if role in ("assistant", "model") else "user"
        text = (turn.get("content") or "").strip()
        if text:
            contents.append({"role": gemini_role, "parts": [{"text": text}]})

    contents.append({"role": "user", "parts": [{"text": prompt.strip()}]})

    body: dict[str, Any] = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "topP": 0.9,
            "maxOutputTokens": 4096,
        },
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system.strip()}]}
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"

    models = [
        getattr(settings, "GEMINI_MODEL", DEFAULT_GEMINI_MODEL) or DEFAULT_GEMINI_MODEL,
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
    ]
    # unique preserve order
    tried: list[str] = []
    for model in models:
        if model in tried:
            continue
        tried.append(model)
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            _endpoint(model),
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
            text = _extract_text(payload)
            if text:
                return text
        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")
            logger.warning("Gemini HTTP %s (%s): %s", exc.code, model, err_body[:500])
            # tenta próximo modelo em 404/404 model
            if exc.code in (404, 429):
                continue
            return ""
        except Exception:
            logger.exception("Gemini request failed (%s)", model)
            continue
    return ""


def generate_json(
    prompt: str,
    *,
    system: str | None = None,
    temperature: float = 0.25,
) -> dict[str, Any]:
    raw = generate_text(prompt, system=system, temperature=temperature, json_mode=True)
    if not raw:
        # Fallback sem json_mode (alguns modelos falham no mime type)
        raw = generate_text(prompt, system=system, temperature=temperature, json_mode=False)
    if not raw:
        return {}
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
        if isinstance(data, list):
            return {"questoes": data}
        return {}
    except json.JSONDecodeError:
        start_obj, end_obj = cleaned.find("{"), cleaned.rfind("}")
        start_arr, end_arr = cleaned.find("["), cleaned.rfind("]")
        # Prefere objeto; se só houver array, encapsula
        if start_obj >= 0 and end_obj > start_obj:
            try:
                data = json.loads(cleaned[start_obj : end_obj + 1])
                if isinstance(data, dict):
                    return data
                if isinstance(data, list):
                    return {"questoes": data}
            except json.JSONDecodeError:
                pass
        if start_arr >= 0 and end_arr > start_arr:
            try:
                data = json.loads(cleaned[start_arr : end_arr + 1])
                if isinstance(data, list):
                    return {"questoes": data}
            except json.JSONDecodeError:
                return {}
        return {}
