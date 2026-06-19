# VoiceForge

A free, offline, English-only text-to-speech + voice cloning studio running entirely on your local machine.
Powered by [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) by Resemble AI.

## Hardware target

These defaults are tuned for: **AMD Ryzen 5 3500U · Radeon Vega 8 (no GPU acceleration) · 16 GB RAM · Fedora Linux**.
Generation runs on **CPU only** and takes **tens of seconds to several minutes per sentence** — this is normal.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.10 – 3.13 | `sudo dnf install python3` |
| Node.js | 18+ | `sudo dnf install nodejs npm` (or let `run.sh` install via fnm) |
| ffmpeg (optional) | any | `sudo dnf install ffmpeg-free` — enables MP3 downloads |

> **First run only:** the backend downloads ~2–3 GB of Chatterbox model weights from HuggingFace
> (cached in `~/.cache/huggingface`). Subsequent runs are fully offline.

## Quick start

```bash
cd voiceforge
./run.sh           # builds frontend, opens http://localhost:8000
./run.sh --dev     # dev mode: Vite (port 5173) + FastAPI (port 8000) with hot-reload
```

The script will:
1. Create a Python venv in `.venv/`
2. Install `chatterbox-tts` from `../chatterbox-master` in editable mode (pulls torch, etc.)
3. Install FastAPI / Uvicorn
4. Install frontend npm packages and build the React app
5. Launch the server

## Engines

| Engine | Params | Speed on CPU | Features |
|--------|--------|--------------|----------|
| **Turbo** (default) | 350M | Faster | Paralinguistic tags `[laugh]`, `[cough]`, etc. |
| **Standard** | 500M | Slower | CFG weight, exaggeration, Min-P controls |

## Voice cloning

1. Go to **Voices** → drop/upload a 5–20s clean speech clip (WAV or MP3).
2. On the **Generate** page, select "Saved voice" and pick your uploaded voice.
3. The clip is passed as an audio prompt (zero-shot voice cloning).

## Voice conversion

Upload any speech audio (in any voice) and a saved target voice → the output
has the target speaker's voice while preserving the content.

## Text chunking

Long texts are automatically split into 1–2 sentence chunks and concatenated.
This keeps peak RAM bounded. Individual chunks of complex prose can still
take 1–4 minutes each on the Ryzen 3500U.

## Troubleshooting

**"Out of memory" / process killed**
- The 3500U has ~7–8 GB free. The Standard model can spike to ~6 GB.
  Close other browser tabs and apps before generating with Standard engine.
- Switching engines explicitly unloads the previous model before loading the next.

**Generation never completes / hangs**
- The job queue has a single worker. If one job is running, others queue behind it.
  Check the progress counter on the Generate page.

**ffmpeg not found**
```bash
sudo dnf install ffmpeg-free
```

**Node.js not found**
```bash
sudo dnf install nodejs npm
```
or let `run.sh` auto-install via fnm (no sudo required).

**Cannot import chatterbox**
The chatterbox package is installed editable from `../chatterbox-master`.
Make sure you run `./run.sh` (which activates the venv) rather than running
`python backend/main.py` directly from a system Python.

## Project structure

```
voiceforge/
├── backend/
│   ├── main.py          # FastAPI app + all endpoints
│   ├── tts_engine.py    # Model singleton (lazy load, memory discipline)
│   ├── jobs.py          # In-process job queue
│   ├── db.py            # SQLite (voices + history)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/       # Generate, Voices, VoiceConversion, History
│       └── components/  # Sidebar, Toast, AudioPlayer
├── data/                # Created at runtime (gitignored)
│   ├── voices/
│   └── audio/
├── test_tts.py          # CLI smoke-test: loads Turbo, generates one sentence
└── run.sh
```

## API reference (brief)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Device, loaded model, free RAM |
| POST | `/api/tts` | Submit TTS job (JSON body) |
| GET | `/api/jobs/{id}` | Poll job status |
| GET | `/api/voices` | List saved voices |
| POST | `/api/voices` | Upload voice clip |
| DELETE | `/api/voices/{id}` | Delete voice |
| POST | `/api/vc` | Submit voice conversion job |
| POST | `/api/upload-text` | Upload .txt file → returns text string |
| GET | `/api/audio/{file}` | Serve generated WAV |
| GET | `/api/audio/{file}/mp3` | Serve as MP3 (needs ffmpeg) |
| GET | `/api/history` | List history |
| DELETE | `/api/history/{id}` | Delete history item |
