"""
RADIANT API — Gemini tutor brain + Gemini Flash TTS.

GEMINI_TUTOR is the tutor brain. TTS uses Railway var
PyTrayPadPlus-Jacob-PC (also accepts PyTrapPadPlus-Jacob-PC).
Never expose keys to the Vite bundle.
"""

from __future__ import annotations

import base64
import io
import json
import os
import re
import wave
from typing import Any, Iterator, Literal, Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from guardrails import (
    IDENTITY_IDS,
    SYSTEM_INSTRUCTIONS,
    THINKING_LEVEL,
    WAVE_FNS,
    parse_data_url,
    prune_sessions,
    sanitize_tool_call,
    validate_tutor_request,
)

load_dotenv()

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover
    genai = None
    types = None

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")
TUTOR_MODELS = [
    GEMINI_MODEL,
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3-flash-preview",
]
# unique, keep order
_seen = set()
TUTOR_MODELS = [m for m in TUTOR_MODELS if m and not (m in _seen or _seen.add(m))]

TTS_MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview")
TTS_MODEL_FALLBACK = os.environ.get(
    "GEMINI_TTS_MODEL_FALLBACK", "gemini-3.1-flash-tts-preview"
)
IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")

DEFAULT_TTS_VOICE = "Charon"
ALLOWED_TTS_VOICES = {
    "Charon",
    "Kore",
    "Puck",
    "Zephyr",
    "Aoede",
    "Fenrir",
    "Leda",
    "Orus",
    "Callirrhoe",
    "Autonoe",
    "Enceladus",
    "Sadaltager",
    "Sulafat",
    "Achird",
    "Vindemiatrix",
    "Rasalgethi",
    "Schedar",
}
MAX_TTS_CHARS = 1400
PCM_RATE = 24000

Effort = Literal["low", "medium", "high", "xhigh"]

app = FastAPI(title="Radiant API", version="0.4.0-beta", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# session_id -> { contents, pending: {call_id: name}, model_parts }
SESSIONS: dict[str, dict[str, Any]] = {}


TUTOR_KEY_NAMES = ("GEMINI_TUTOR", "GEMINI_API_KEY", "GOOGLE_API_KEY")
TTS_KEY_NAMES = (
    "PyTrayPadPlus-Jacob-PC",
    "PyTrapPadPlus-Jacob-PC",
    "GEMINI_TTS",
    "GEMINI_TTS_KEY",
)


def _first_env(names: tuple[str, ...]) -> Optional[str]:
    for name in names:
        val = (os.environ.get(name) or "").strip()
        if val:
            return val
    return None


def tutor_key() -> Optional[str]:
    return _first_env(TUTOR_KEY_NAMES)


def tts_key() -> Optional[str]:
    return _first_env(TTS_KEY_NAMES)


def require_sdk() -> None:
    if genai is None:
        raise HTTPException(
            status_code=500,
            detail="google-genai is not installed. Run: pip install google-genai",
        )


def require_tutor_key() -> str:
    require_sdk()
    key = tutor_key()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Tutor key missing. Set GEMINI_TUTOR on the Railway backend.",
        )
    return key


def require_tts_key() -> str:
    require_sdk()
    key = tts_key()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="TTS key missing. Set PyTrayPadPlus-Jacob-PC on the Railway backend.",
        )
    return key


_TUTOR_CLIENT = None
_TTS_CLIENT = None


def _make_client(api_key: str):
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "false"
    return genai.Client(api_key=api_key, vertexai=False)


def tutor_client():
    global _TUTOR_CLIENT
    if _TUTOR_CLIENT is None:
        _TUTOR_CLIENT = _make_client(require_tutor_key())
    return _TUTOR_CLIENT


def tts_client():
    global _TTS_CLIENT
    if _TTS_CLIENT is None:
        _TTS_CLIENT = _make_client(require_tts_key())
    return _TTS_CLIENT


# Studio catalogs + SYSTEM_INSTRUCTIONS live in guardrails.py (Gemini 3.x prompt shape).

CLIENT_TOOLS: list[dict[str, Any]] = [
    {
        "name": "navigate",
        "description": (
            "Open a studio page. Invoke only when the student needs a different "
            "route than Current studio state.route."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "enum": [
                        "/",
                        "/waves",
                        "/pendulums",
                        "/physics",
                        "/helix",
                        "/history",
                        "/cheat-sheet",
                    ],
                }
            },
            "required": ["path"],
        },
    },
    {
        "name": "set_angle",
        "description": (
            "Set the unit-circle or waves angle. degrees is a finite number in "
            "degrees (not radians). The studio wraps to [0, 360). "
            "Invoke when the student names an angle or a worksheet gives θ."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "degrees": {
                    "type": "number",
                    "description": "Angle in degrees. Finite. Wraps to [0, 360).",
                },
                "animate": {"type": "boolean"},
            },
            "required": ["degrees"],
        },
    },
    {
        "name": "set_overlays",
        "description": "Toggle unit-circle overlays and label modes.",
        "parameters": {
            "type": "object",
            "properties": {
                "showSin": {"type": "boolean"},
                "showCos": {"type": "boolean"},
                "showTan": {"type": "boolean"},
                "showSohcahtoa": {"type": "boolean"},
                "showLabels": {"type": "boolean"},
                "labelsInRadians": {"type": "boolean"},
                "showCoords": {"type": "boolean"},
                "coordsInRadians": {"type": "boolean"},
            },
        },
    },
    {
        "name": "set_waves",
        "description": "Control the trig-functions page: visible curves, playback, music, angle.",
        "parameters": {
            "type": "object",
            "properties": {
                "functions": {
                    "type": "array",
                    "items": {"type": "string", "enum": WAVE_FNS},
                },
                "replace": {"type": "boolean"},
                "playing": {"type": "boolean"},
                "musicOn": {"type": "boolean"},
                "degrees": {"type": "number"},
            },
        },
    },
    {
        "name": "set_pendulum",
        "description": "Configure the pendulum simulation.",
        "parameters": {
            "type": "object",
            "properties": {
                "nLinks": {"type": "integer", "minimum": 1, "maximum": 3},
                "g": {
                    "type": "number",
                    "minimum": 0.1,
                    "maximum": 30,
                    "description": "Gravity m/s². Safe range 0.1–30.",
                },
                "damping": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 2,
                    "description": "Linear damping. Safe range 0–2.",
                },
                "playing": {"type": "boolean"},
                "trailOn": {"type": "boolean"},
                "reset": {"type": "boolean"},
            },
        },
    },
    {
        "name": "set_physics",
        "description": "Build or update the free-body / incline / Atwood problem.",
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "enum": ["single", "hang", "atwood"]},
                "thetaDeg": {
                    "type": "number",
                    "minimum": 0.5,
                    "maximum": 89.5,
                    "description": "Ramp angle in degrees. Not 0 or 90 (those break the FBD).",
                },
                "m1": {
                    "type": "number",
                    "minimum": 0.05,
                    "maximum": 100,
                    "description": "Mass kg. Must be > 0.",
                },
                "m2": {
                    "type": "number",
                    "minimum": 0.05,
                    "maximum": 100,
                    "description": "Second mass kg. Must be > 0.",
                },
                "muS": {"type": "number", "minimum": 0, "maximum": 2},
                "muK": {"type": "number", "minimum": 0, "maximum": 2},
                "Fapp": {"type": "number", "minimum": -200, "maximum": 200},
                "g": {
                    "type": "number",
                    "minimum": 0.1,
                    "maximum": 30,
                    "description": "Gravity m/s². Safe range 0.1–30.",
                },
                "frictionOn": {"type": "boolean"},
                "showComponents": {"type": "boolean"},
                "showNet": {"type": "boolean"},
                "playing": {"type": "boolean"},
            },
        },
    },
    {
        "name": "set_helix",
        "description": "Set helix parameter t and display flags.",
        "parameters": {
            "type": "object",
            "properties": {
                "t": {"type": "number"},
                "showTangent": {"type": "boolean"},
                "showDerivative": {"type": "boolean"},
                "autoSpin": {"type": "boolean"},
            },
        },
    },
    {
        "name": "highlight_identity",
        "description": (
            "Open the cheat sheet and flash one identity card. "
            "Invoke only with an id from the Identity card ids list. "
            "Do not invent ids."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "enum": IDENTITY_IDS,
                    "description": "Exact cheat-sheet card id.",
                }
            },
            "required": ["id"],
        },
    },
    {
        "name": "set_history_era",
        "description": (
            "Open /history and jump to a timeline era. "
            "Pass figure as a last name or slug: thales, pythagoras, euclid, "
            "eratosthenes, archimedes, kepler, descartes, fermat, barrow, newton, "
            "leibniz, bernoulli, euler, cauchy, lebesgue. "
            "Do not use highlight_identity for people."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "index": {"type": "integer", "minimum": 0, "maximum": 15},
                "figure": {
                    "type": "string",
                    "description": "Last name or slug (e.g. Archimedes, barrow, cauchy).",
                },
            },
        },
    },
    {
        "name": "generate_portrait",
        "description": "Generate a painted portrait of a historical figure for the timeline.",
        "parameters": {
            "type": "object",
            "properties": {
                "figure": {"type": "string"},
                "style": {"type": "string"},
            },
            "required": ["figure"],
        },
    },
]


def gemini_tools():
    decls = [
        types.FunctionDeclaration(
            name=t["name"],
            description=t["description"],
            parameters=t.get("parameters"),
        )
        for t in CLIENT_TOOLS
    ]
    return [types.Tool(function_declarations=decls)]


def infer_effort(text: str, requested: Optional[str]) -> Effort:
    if requested in ("low", "medium", "high", "xhigh"):
        return requested  # type: ignore[return-value]
    t = (text or "").lower()
    hard = (
        "lagrangian",
        "from first principles",
        "prove that",
        "derive the",
        "n-link",
        "why does e^{i",
    )
    if any(k in t for k in hard):
        return "xhigh"
    if any(k in t for k in ("prove", "derive", "identity", "why is", "walk me", "explain why")):
        return "high"
    compact = re.sub(r"\s+", " ", t).strip()
    if len(compact) < 90 and any(
        k in compact
        for k in (
            "set ",
            "go to",
            "show ",
            "turn on",
            "turn off",
            "navigate",
            "open ",
            "90",
            "45",
            "30",
            "60",
            "pi/",
            "π",
        )
    ):
        return "low"
    return "high"


# Gemini 3.x: use thinking_level, not numeric thinking_budget.
# Numeric budget + temperature < 1.0 both degrade math/reasoning on 3.5 Flash.


class TutorRequest(BaseModel):
    session_id: str = Field(..., min_length=4, max_length=80)
    previous_response_id: Optional[str] = None
    message: Optional[str] = None
    tool_outputs: Optional[list[dict[str, Any]]] = None
    state: Optional[dict[str, Any]] = None
    effort: Optional[str] = "auto"
    image: Optional[str] = None
    intent: Optional[str] = None


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_TTS_CHARS * 2)
    voice: str = Field(default=DEFAULT_TTS_VOICE)


class ImagineRequest(BaseModel):
    prompt: str = Field(..., min_length=4, max_length=2500)
    aspect_ratio: str = "3:4"
    figure: Optional[str] = None


class VideoStartRequest(BaseModel):
    prompt: str = Field(..., min_length=4, max_length=2500)
    duration: int = Field(default=6, ge=4, le=10)
    image: Optional[str] = None
    aspect_ratio: str = "16:9"


@app.get("/")
def root():
    return {"message": "Radiant API", "docs": "/docs", "model": GEMINI_MODEL}


@app.get("/api/hello")
def hello():
    return {"message": "Hello from the API!"}


@app.get("/api/status")
def status():
    return {
        "configured": bool(tutor_key()) and genai is not None,
        "tts_configured": bool(tts_key()) and genai is not None,
        "model": GEMINI_MODEL,
        "tts_model": TTS_MODEL,
        "image_model": IMAGE_MODEL,
        "tts_default_voice": DEFAULT_TTS_VOICE,
        "tts_voices": sorted(ALLOWED_TTS_VOICES),
        "sdk": genai is not None,
        "provider": "gemini",
        "beta": True,
        "thinking_levels": THINKING_LEVEL,
        "guardrails": True,
    }


def _sse(obj: dict[str, Any]) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def session_bucket(session_id: str) -> dict[str, Any]:
    bucket = SESSIONS.get(session_id)
    if not bucket:
        bucket = {"contents": [], "pending": {}, "model_parts": []}
        SESSIONS[session_id] = bucket
    return bucket


def user_parts(req: TutorRequest) -> list[Any]:
    # Gemini 3: large context first, the actual question last, then anchor.
    parts: list[str] = []
    if req.state:
        parts.append(
            "Current studio state (JSON):\n"
            + json.dumps(req.state, ensure_ascii=False)[:4000]
        )
    if req.intent == "explain_frame":
        parts.append(
            "The attached image is a capture of the live visualization. "
            "Explain what is on screen. Drive tools only if a better angle or overlay would help."
        )
    elif req.intent == "photo":
        parts.append(
            "The attached image is a student worksheet or textbook problem. "
            "If you can read it, reconstruct it with studio tools then tutor through it. "
            "If you cannot read it, say so — do not invent the given values."
        )
    elif req.intent == "history_era":
        parts.append(
            "The studio already jumped to the history era the student named. "
            "Call set_history_era only if Current studio state.figure is still the wrong person. "
            "Explain the live timeline card. Do not use highlight_identity for people. "
            "Do not invent a different figure or a story."
        )
    if req.message:
        parts.append(
            "Based on the studio state above, respond to the student.\n\n"
            "Student: " + req.message.strip()
        )
    text = "\n\n".join(parts) or "Continue from the last tool results."

    out = [types.Part.from_text(text=text)]
    if req.image and req.image.startswith("data:image"):
        try:
            mime, raw = parse_data_url(req.image)
            if raw:
                out.insert(0, types.Part.from_bytes(data=raw, mime_type=mime))
        except Exception:
            pass
    return out


def thinking_config(effort: Effort):
    """Gemini 3.5 Flash: thinking_level enum. Fall back to budget on older SDKs."""
    level = THINKING_LEVEL.get(effort, "medium")
    enum_cls = getattr(types, "ThinkingLevel", None)
    level_val: Any = level
    if enum_cls is not None:
        level_val = getattr(enum_cls, level.upper(), level)
    try:
        return types.ThinkingConfig(include_thoughts=True, thinking_level=level_val)
    except (TypeError, AttributeError, ValueError):
        pass
    budget = {"minimal": 0, "low": 1024, "medium": 8192, "high": 24576}.get(level, 8192)
    try:
        return types.ThinkingConfig(include_thoughts=True, thinking_budget=budget)
    except TypeError:
        try:
            return types.ThinkingConfig(include_thoughts=True)
        except Exception:
            return None


def generate_config(effort: Effort):
    # Gemini 3.x: do not set temperature / top_p / top_k — default 1.0 is required
    # for stable math reasoning. Lower values can loop or degrade proofs.
    kwargs: dict[str, Any] = {
        "system_instruction": SYSTEM_INSTRUCTIONS,
        "tools": gemini_tools(),
    }
    think = thinking_config(effort)
    if think is not None:
        kwargs["thinking_config"] = think
    return types.GenerateContentConfig(**kwargs)


def iter_tutor(req: TutorRequest) -> Iterator[str]:
    decision = validate_tutor_request(
        session_id=req.session_id,
        message=req.message,
        image=req.image,
        intent=req.intent,
        effort=req.effort,
        tool_outputs=req.tool_outputs,
    )
    if not decision.ok:
        if decision.as_assistant:
            yield _sse({"type": "text", "text": decision.message})
        else:
            yield _sse({"type": "error", "message": decision.message})
        yield _sse({"type": "done", "response_id": req.session_id, "blocked": True, "code": decision.code})
        return

    req.message = decision.message_text
    req.image = decision.image
    req.intent = decision.intent
    req.effort = decision.effort
    req.tool_outputs = decision.tool_outputs

    effort = infer_effort(req.message or "", req.effort if req.effort != "auto" else None)
    active_model = GEMINI_MODEL
    yield _sse({"type": "meta", "effort": effort, "model": active_model, "thinking_level": THINKING_LEVEL.get(effort, "medium")})

    prune_sessions(SESSIONS)
    bucket = session_bucket(req.session_id)
    contents: list[Any] = bucket["contents"]

    if req.tool_outputs:
        fn_parts = []
        for item in req.tool_outputs:
            call_id = item.get("call_id") or ""
            name = bucket["pending"].get(call_id) or call_id.split(":", 1)[0]
            raw = item.get("output")
            if isinstance(raw, str):
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    parsed = {"result": raw}
            elif isinstance(raw, dict):
                parsed = raw
            else:
                parsed = {"ok": True}
            fn_parts.append(types.Part.from_function_response(name=name, response=parsed))
        if bucket.get("model_parts"):
            contents.append(types.Content(role="model", parts=bucket["model_parts"]))
            bucket["model_parts"] = []
        contents.append(types.Content(role="user", parts=fn_parts))
        bucket["pending"] = {}
    else:
        contents.append(types.Content(role="user", parts=user_parts(req)))

    # Keep sessions bounded
    if len(contents) > 40:
        bucket["contents"] = contents[-40:]
        contents = bucket["contents"]

    model_parts: list[Any] = []
    pending: dict[str, str] = {}
    emitted_calls: set[str] = set()

    try:
        cli = tutor_client()
        try:
            cfg = generate_config(effort)
        except Exception:
            cfg = types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTIONS,
                tools=gemini_tools(),
            )
        stream = None
        chunks_head: list[Any] = []
        last_model_err: Optional[Exception] = None
        simple_cfg = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTIONS,
            tools=gemini_tools(),
        )
        for model_id in TUTOR_MODELS:
            try:
                stream = cli.models.generate_content_stream(
                    model=model_id,
                    contents=contents,
                    config=cfg,
                )
                # Touch the iterator so a 404 surfaces here, not mid-yield
                stream = iter(stream)
                first = next(stream, None)
                active_model = model_id
                yield _sse({"type": "meta", "effort": effort, "model": active_model})
                if first is not None:
                    chunks_head = [first]
                else:
                    chunks_head = []
                break
            except Exception as exc:
                last_model_err = exc
                msg = str(exc).lower()
                if "404" in msg or "not_found" in msg or "no longer available" in msg:
                    try:
                        stream = cli.models.generate_content_stream(
                            model=model_id,
                            contents=contents,
                            config=simple_cfg,
                        )
                        stream = iter(stream)
                        first = next(stream, None)
                        active_model = model_id
                        yield _sse({"type": "meta", "effort": effort, "model": active_model})
                        chunks_head = [first] if first is not None else []
                        break
                    except Exception as exc2:
                        last_model_err = exc2
                        continue
                raise
        else:
            raise last_model_err or RuntimeError("No Gemini tutor model available")

        def _walk_chunks():
            for ch in chunks_head:
                yield ch
            for ch in stream:
                yield ch

        for chunk in _walk_chunks():
            cands = getattr(chunk, "candidates", None) or []
            if not cands:
                continue
            parts = getattr(cands[0].content, "parts", None) or []
            for part in parts:
                model_parts.append(part)
                thought = bool(getattr(part, "thought", False))
                text = getattr(part, "text", None)
                if text:
                    yield _sse({"type": "reasoning" if thought else "text", "text": text})
                fc = getattr(part, "function_call", None)
                if fc and getattr(fc, "name", None):
                    cleaned = sanitize_tool_call(fc.name, dict(getattr(fc, "args", None) or {}))
                    if not cleaned.ok or not cleaned.name:
                        yield _sse(
                            {
                                "type": "status",
                                "message": cleaned.error or f"Dropped invalid tool {fc.name}",
                            }
                        )
                        continue
                    call_id = f"{cleaned.name}:{uuid4().hex[:8]}"
                    args = cleaned.arguments
                    key = f"{cleaned.name}:{json.dumps(args, sort_keys=True)}"
                    if key in emitted_calls:
                        continue
                    emitted_calls.add(key)
                    pending[call_id] = cleaned.name
                    payload: dict[str, Any] = {
                        "type": "tool_call",
                        "call_id": call_id,
                        "name": cleaned.name,
                        "arguments": args,
                    }
                    if cleaned.notes:
                        payload["notes"] = cleaned.notes
                    yield _sse(payload)
    except Exception as exc:
        yield _sse({"type": "error", "message": f"Gemini tutor failed: {exc}"[:800]})
        return

    bucket["pending"] = pending
    bucket["model_parts"] = model_parts if pending else []
    if not pending and model_parts:
        contents.append(types.Content(role="model", parts=model_parts))

    yield _sse({"type": "done", "response_id": req.session_id})


@app.post("/api/tutor")
def tutor(req: TutorRequest):
    require_tutor_key()
    return StreamingResponse(
        iter_tutor(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Tutor-Model": GEMINI_MODEL,
        },
    )


def pcm_to_wav(pcm: bytes, rate: int = PCM_RATE) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(pcm)
    return buf.getvalue()


def tutor_prompt(text: str) -> str:
    return (
        "Calm, clear math tutor. Natural pace. "
        "Pronounce θ as 'theta', π as 'pi', ° as 'degrees'. "
        "Emphasize numbers and exact values slightly. "
        "Do not add extra commentary beyond the transcript.\n\n"
        f"Speak the following transcript exactly:\n\n{text.strip()}"
    )


@app.post("/api/tts")
def tts(req: TtsRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if len(text) > MAX_TTS_CHARS:
        text = text[: MAX_TTS_CHARS - 1].rsplit(" ", 1)[0] + "…"

    voice = req.voice if req.voice in ALLOWED_TTS_VOICES else DEFAULT_TTS_VOICE
    cli = tts_client()
    prompt = tutor_prompt(text)
    last_err: Optional[Exception] = None

    for model in (TTS_MODEL, TTS_MODEL_FALLBACK):
        try:
            resp = cli.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=voice
                            )
                        )
                    ),
                ),
            )
            part = resp.candidates[0].content.parts[0]
            inline = part.inline_data
            if not inline or not inline.data:
                raise RuntimeError("Empty audio payload from Gemini")
            raw = inline.data
            pcm = base64.b64decode(raw) if isinstance(raw, str) else bytes(raw)
            mime = (inline.mime_type or "").lower()
            if "wav" in mime:
                audio_bytes, media = pcm, "audio/wav"
            else:
                audio_bytes, media = pcm_to_wav(pcm), "audio/wav"
            return Response(
                content=audio_bytes,
                media_type=media,
                headers={
                    "X-TTS-Model": model,
                    "X-TTS-Voice": voice,
                    "Cache-Control": "no-store",
                },
            )
        except HTTPException:
            raise
        except Exception as exc:
            last_err = exc
            continue

    msg = str(last_err) if last_err else "TTS failed"
    status_code = 502
    low = msg.lower()
    if "401" in msg or "unauth" in low or "api key" in low or "credential" in low:
        status_code = 401
    raise HTTPException(status_code=status_code, detail=f"Gemini TTS failed: {msg}")


@app.post("/api/imagine")
def imagine(req: ImagineRequest):
    figure = (req.figure or "").strip()
    style = (req.prompt or "").strip()
    prompt = style
    if figure and figure.lower() not in style.lower():
        prompt = (
            f"Museum-quality painted portrait of {figure}, historically grounded likeness, "
            f"oil on linen, soft north light, restrained academic palette, no text, no watermark. {style}"
        )
    try:
        resp = tutor_client().models.generate_content(
            model=IMAGE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini image failed: {exc}") from exc

    for cand in resp.candidates or []:
        for part in cand.content.parts or []:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                raw = inline.data
                data = raw if isinstance(raw, str) else base64.b64encode(bytes(raw)).decode("ascii")
                return {"url": None, "b64_json": data, "model": IMAGE_MODEL, "figure": figure or None}
    raise HTTPException(status_code=502, detail="Gemini image returned no pixels")


@app.post("/api/video")
def video_start(_req: VideoStartRequest):
    raise HTTPException(
        status_code=501,
        detail="Explainer video needs a dedicated video model. Portrait restyle works via Gemini.",
    )


@app.get("/api/video/{request_id}")
def video_poll(_request_id: str):
    raise HTTPException(status_code=501, detail="Video polling is not available on Gemini.")
