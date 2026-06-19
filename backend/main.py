"""VoiceForge backend — FastAPI + CPU-only Chatterbox TTS."""
from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import List, Optional

import numpy as np
import random
import torch
import torchaudio
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

import db
from jobs import job_queue, JobStatus
from tts_engine import DEVICE, model_manager

# ── logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("voiceforge")

# ── constants ─────────────────────────────────────────────────────────
MAX_TEXT_CHARS = 8000
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
DATA_DIR = Path(__file__).parent.parent / "data"
VOICES_DIR = DATA_DIR / "voices"
AUDIO_DIR = DATA_DIR / "audio"

for _d in [VOICES_DIR, AUDIO_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

db.init_db()

# ── app ───────────────────────────────────────────────────────────────
app = FastAPI(title="VoiceForge", version="1.0.0", docs_url="/api/docs", redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ── helpers ───────────────────────────────────────────────────────────

def _set_seed(seed: int) -> None:
    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    random.seed(seed)
    np.random.seed(seed)


def _split_chunks(text: str) -> List[str]:
    """Split into ~1-2 sentence chunks to bound peak RAM on CPU."""
    # Split on sentence-ending punctuation followed by whitespace
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: List[str] = []
    i = 0
    while i < len(sentences):
        if i + 1 < len(sentences):
            chunks.append(sentences[i].strip() + " " + sentences[i + 1].strip())
            i += 2
        else:
            chunks.append(sentences[i].strip())
            i += 1
    return [c for c in chunks if c]


def _ffmpeg_available() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def _wav_to_mp3(wav_path: Path) -> Optional[Path]:
    mp3_path = wav_path.with_suffix(".mp3")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(wav_path), "-b:a", "192k", str(mp3_path)],
            capture_output=True,
            check=True,
        )
        return mp3_path
    except Exception:
        return None


def _free_ram_gb() -> float:
    try:
        with open("/proc/meminfo") as fh:
            for line in fh:
                if line.startswith("MemAvailable"):
                    kb = int(line.split()[1])
                    return round(kb / 1024 / 1024, 1)
    except Exception:
        pass
    return 0.0


def _safe_filename(name: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9_\-\.]+$", name))


# ── /health ───────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ── request logging ───────────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.monotonic()
    response = await call_next(request)
    elapsed = (time.monotonic() - start) * 1000
    log.info("%s %s %d %.0fms", request.method, request.url.path, response.status_code, elapsed)
    return response


# ── /api/status ───────────────────────────────────────────────────────

@app.get("/api/status")
def api_status():
    return {
        "device": DEVICE,
        "current_engine": model_manager.current_engine,
        "free_ram_gb": _free_ram_gb(),
        "ffmpeg_available": _ffmpeg_available(),
        "slow_cpu_warning": DEVICE == "cpu",
    }


# ── /api/tts ──────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    engine: str = "turbo"
    text: str
    voice_id: Optional[str] = None
    # Standard-only (ignored for turbo, but accepted so frontend can always send them)
    exaggeration: float = Field(0.5, ge=0.0, le=2.0)
    cfg_weight: float = Field(0.5, ge=0.0, le=1.0)
    min_p: float = Field(0.05, ge=0.0, le=1.0)
    # Common
    temperature: float = Field(0.8, ge=0.05, le=5.0)
    repetition_penalty: float = Field(1.2, ge=1.0, le=2.0)
    top_p: float = Field(1.0, ge=0.0, le=1.0)
    top_k: int = Field(1000, ge=0, le=1000)
    seed: Optional[int] = None


@app.post("/api/tts")
def api_tts(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(400, "text is empty")
    if len(req.text) > MAX_TEXT_CHARS:
        raise HTTPException(400, f"Text exceeds {MAX_TEXT_CHARS} chars. Please split into smaller requests.")
    if req.engine not in ("turbo", "standard"):
        raise HTTPException(400, "engine must be 'turbo' or 'standard'")

    voice_path: Optional[str] = None
    if req.voice_id:
        voice = db.get_voice(req.voice_id)
        if not voice:
            raise HTTPException(404, "Voice not found")
        voice_path = voice["path"]

    job_id = job_queue.create_job()
    job_queue.submit(job_id, _run_tts, req, voice_path)
    return {"job_id": job_id}


def _run_tts(job, req: TTSRequest, voice_path: Optional[str]) -> None:
    chunks = _split_chunks(req.text)
    job.total = max(len(chunks), 1)
    job.progress = 0

    if req.seed is not None:
        _set_seed(req.seed)

    model = model_manager.get_tts(req.engine)
    sr = model.sr

    wav_chunks: list = []
    silence = torch.zeros(1, int(sr * 0.3))  # 300 ms pause between chunks

    for i, chunk in enumerate(chunks):
        if req.engine == "turbo":
            wav = model.generate(
                chunk,
                audio_prompt_path=voice_path,
                temperature=req.temperature,
                repetition_penalty=req.repetition_penalty,
                top_p=req.top_p,
                top_k=req.top_k,
                min_p=req.min_p,
                norm_loudness=True,
            )
        else:
            wav = model.generate(
                chunk,
                audio_prompt_path=voice_path,
                exaggeration=req.exaggeration,
                cfg_weight=req.cfg_weight,
                temperature=req.temperature,
                repetition_penalty=req.repetition_penalty,
                min_p=req.min_p,
                top_p=req.top_p,
            )

        wav_chunks.append(wav)
        if i < len(chunks) - 1:
            wav_chunks.append(silence)
        job.progress = i + 1

    combined = torch.cat(wav_chunks, dim=-1)

    file_id = str(uuid.uuid4())
    out_path = AUDIO_DIR / f"{file_id}.wav"
    torchaudio.save(str(out_path), combined, sr)

    job.result_file = f"{file_id}.wav"

    history_id = str(uuid.uuid4())
    db.add_history(
        history_id,
        req.text,
        req.engine,
        str(out_path),
        {
            "engine": req.engine,
            "temperature": req.temperature,
            "exaggeration": req.exaggeration,
            "cfg_weight": req.cfg_weight,
        },
    )


# ── /api/jobs ─────────────────────────────────────────────────────────

@app.get("/api/jobs/{job_id}")
def api_job_status(job_id: str):
    job = job_queue.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "id": job.id,
        "status": job.status,
        "progress": job.progress,
        "total": job.total,
        "result_url": f"/api/audio/{job.result_file}" if job.result_file else None,
        "error": job.error,
    }


# ── /api/voices ───────────────────────────────────────────────────────

ALLOWED_AUDIO_SUFFIXES = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}


@app.post("/api/voices")
async def api_upload_voice(
    file: UploadFile = File(...),
    name: str = Form(...),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(400, f"Unsupported format {suffix}. Allowed: {', '.join(ALLOWED_AUDIO_SUFFIXES)}")

    voice_id = str(uuid.uuid4())
    voice_dir = VOICES_DIR / voice_id
    voice_dir.mkdir()

    raw_path = voice_dir / f"original{suffix}"
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        shutil.rmtree(voice_dir, ignore_errors=True)
        raise HTTPException(413, f"File too large (max {MAX_UPLOAD_BYTES // 1024 // 1024} MB)")
    raw_path.write_bytes(data)

    # Convert to WAV for chatterbox compatibility
    if suffix != ".wav":
        wav_path = voice_dir / "voice.wav"
        try:
            waveform, sr = torchaudio.load(str(raw_path))
            torchaudio.save(str(wav_path), waveform, sr)
            final_path = wav_path
        except Exception as exc:
            shutil.rmtree(voice_dir, ignore_errors=True)
            raise HTTPException(400, f"Could not decode audio: {exc}") from exc
    else:
        final_path = raw_path

    db.add_voice(voice_id, name.strip() or "Unnamed", str(final_path))
    return {"id": voice_id, "name": name, "path": str(final_path)}


@app.get("/api/voices")
def api_list_voices():
    return db.get_voices()


@app.get("/api/voices/{voice_id}/audio")
def api_voice_audio(voice_id: str):
    voice = db.get_voice(voice_id)
    if not voice:
        raise HTTPException(404, "Voice not found")
    path = Path(voice["path"])
    if not path.exists():
        raise HTTPException(404, "Voice file missing on disk")
    return FileResponse(str(path), media_type="audio/wav")


@app.patch("/api/voices/{voice_id}")
async def api_rename_voice(voice_id: str, body: dict):
    voice = db.get_voice(voice_id)
    if not voice:
        raise HTTPException(404, "Voice not found")
    name = str(body.get("name", "")).strip()
    if not name:
        raise HTTPException(400, "name is required")
    db.update_voice_name(voice_id, name)
    return {"ok": True}


@app.delete("/api/voices/{voice_id}")
def api_delete_voice(voice_id: str):
    voice = db.get_voice(voice_id)
    if not voice:
        raise HTTPException(404, "Voice not found")
    voice_dir = VOICES_DIR / voice_id
    shutil.rmtree(str(voice_dir), ignore_errors=True)
    db.delete_voice(voice_id)
    return {"ok": True}


# ── /api/vc ───────────────────────────────────────────────────────────

@app.post("/api/vc")
async def api_voice_conversion(
    source: UploadFile = File(...),
    target_voice_id: str = Form(...),
):
    voice = db.get_voice(target_voice_id)
    if not voice:
        raise HTTPException(404, "Target voice not found")

    suffix = Path(source.filename or "").suffix.lower()
    if suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(400, f"Unsupported source format {suffix}")

    data = await source.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File too large (max {MAX_UPLOAD_BYTES // 1024 // 1024} MB)")
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        os.write(tmp_fd, data)
    finally:
        os.close(tmp_fd)

    job_id = job_queue.create_job()
    job_queue.submit(job_id, _run_vc, tmp_path, voice["path"])
    return {"job_id": job_id}


def _run_vc(job, source_path: str, target_path: str) -> None:
    try:
        model = model_manager.get_vc()
        job.total = 1
        wav = model.generate(audio=source_path, target_voice_path=target_path)
        file_id = str(uuid.uuid4())
        out_path = AUDIO_DIR / f"{file_id}.wav"
        torchaudio.save(str(out_path), wav, model.sr)
        job.result_file = f"{file_id}.wav"
        job.progress = 1
    finally:
        try:
            os.unlink(source_path)
        except OSError:
            pass


# ── /api/upload-text ─────────────────────────────────────────────────

@app.post("/api/upload-text")
async def api_upload_text(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".txt"):
        raise HTTPException(400, "Only .txt files supported")
    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    truncated = len(text) > MAX_TEXT_CHARS
    return {"text": text[:MAX_TEXT_CHARS], "truncated": truncated}


# ── /api/audio ────────────────────────────────────────────────────────

@app.get("/api/audio/{filename}")
def api_audio(filename: str):
    if not _safe_filename(filename):
        raise HTTPException(400, "Invalid filename")
    path = AUDIO_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Audio file not found")
    media_type = "audio/mpeg" if filename.endswith(".mp3") else "audio/wav"
    return FileResponse(str(path), media_type=media_type)


@app.get("/api/audio/{filename}/mp3")
def api_audio_mp3(filename: str):
    if not _safe_filename(filename):
        raise HTTPException(400, "Invalid filename")
    wav_path = AUDIO_DIR / filename
    if not wav_path.exists():
        raise HTTPException(404, "Audio file not found")
    if not _ffmpeg_available():
        raise HTTPException(
            503,
            "ffmpeg not found. Install with: sudo dnf install ffmpeg-free",
        )
    mp3 = _wav_to_mp3(wav_path)
    if not mp3:
        raise HTTPException(500, "MP3 conversion failed")
    return FileResponse(str(mp3), media_type="audio/mpeg")


# ── /api/history ──────────────────────────────────────────────────────

@app.get("/api/history")
def api_history():
    return db.get_history()


@app.delete("/api/history/{history_id}")
def api_delete_history(history_id: str):
    item = db.get_history_item(history_id)
    if not item:
        raise HTTPException(404, "History item not found")
    db.delete_history(history_id)
    return {"ok": True}


# ── static frontend (production build) ───────────────────────────────

_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="static")


# ── entry point ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
