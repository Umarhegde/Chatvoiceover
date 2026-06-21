# Chat Voice Over

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10–3.13-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Powered by Chatterbox](https://img.shields.io/badge/Powered%20by-Chatterbox%20TTS-orange)](https://github.com/resemble-ai/chatterbox)

**A free, offline, open-source text-to-speech and voice cloning studio — runs 100% on your local machine.**

No API keys. No cloud. No subscriptions. Your voice data never leaves your computer.

![VoiceForge screenshot](https://raw.githubusercontent.com/Umarhegde/Chatvoiceover/main/docs/screenshot.png)

---

## Features

| | |
|---|---|
| **Text-to-speech** | English TTS via Chatterbox Turbo (350M) or Standard (500M) |
| **Voice cloning** | Zero-shot: upload a 5–20s reference clip, generate in that voice |
| **Voice conversion** | Change the speaker in any audio file to a saved voice |
| **Paralinguistic tags** | Turbo engine supports `[laugh]`, `[sigh]`, `[cough]` and more |
| **Offline-first** | Models are cached locally after first download — no internet required |
| **History** | Every generation is saved locally with play/download |
| **Privacy** | No telemetry, no accounts, no outbound traffic after model download |

---

## Quick start

### Requirements

| Tool | Version | Install (Fedora/RHEL) |
|------|---------|----------------------|
| Python | 3.10 – 3.13 | `sudo dnf install python3.12` |
| Node.js | 18+ | auto-installed by `run.sh` via fnm, or `sudo dnf install nodejs` |
| ffmpeg | any | `sudo dnf install ffmpeg-free` — **optional**, enables MP3 downloads |

> Ubuntu/Debian: replace `dnf` with `apt`. macOS: use `brew`.

### Run

```bash
git clone https://github.com/Umarhegde/Chatvoiceover
cd Chatvoiceover/voiceforge
chmod +x run.sh
./run.sh          # production mode → http://localhost:8000
./run.sh --dev    # dev mode: hot-reload frontend on :5173 + API on :8000
```

`run.sh` handles everything automatically:
1. Picks the best available Python (3.12 → 3.13 → 3.11 → 3.10)
2. Creates `.venv/` and installs all Python dependencies
3. Installs Chatterbox TTS from the bundled source
4. Runs `npm install` and builds the React frontend
5. Launches the server

> **First generation:** downloads ~2–3 GB of model weights from HuggingFace (cached after that). Subsequent runs are fully offline.

---

## Engines

| Engine | Params | CPU speed* | Best for |
|--------|--------|-----------|----------|
| **Turbo** (default) | 350M | ~14× real-time | Fast drafts, paralinguistic tags |
| **Standard** | 500M | ~17× real-time | Richer prosody, CFG / exaggeration controls |

\*Measured on AMD Ryzen 5 3500U (4 cores, CPU-only). "14× real-time" means 1s of audio takes ~14s to generate.

**Expected generation times (Ryzen 5 3500U):**

| Text length | Turbo | Standard |
|-------------|-------|---------|
| One sentence | 70–100s | 85–120s |
| One paragraph (5 sentences) | 6–9 min | 7–10 min |
| 500 words | ~45 min | ~55 min |

These times drop significantly on machines with more cores or a GPU.

---

## Usage

### Generate speech
1. Type or paste English text (or upload a `.txt` file)
2. Choose engine (Turbo / Standard) and voice
3. Adjust advanced parameters if needed (temperature, CFG weight, etc.)
4. Click **Generate** or press **Ctrl+Enter**
5. Play the result inline or download WAV / MP3

### Clone a voice
1. Go to **Voices** → drag-and-drop a 5–20s audio clip of the target speaker
2. On the **Generate** page, select "Saved voice" and pick it from the list

### Convert a voice
Go to **Voice Conversion**: upload any speech audio + select a saved target voice → the output preserves speech content in the new voice.

---

## API reference

The backend is a FastAPI app at `http://localhost:8000`. Interactive docs: `http://localhost:8000/api/docs`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/status` | Device, loaded model, free RAM |
| POST | `/api/tts` | Submit TTS job (JSON) |
| GET | `/api/jobs/{id}` | Poll job status |
| GET | `/api/voices` | List saved voices |
| POST | `/api/voices` | Upload voice clip (multipart) |
| PATCH | `/api/voices/{id}` | Rename voice |
| DELETE | `/api/voices/{id}` | Delete voice |
| GET | `/api/voices/{id}/audio` | Stream voice clip |
| POST | `/api/vc` | Submit voice conversion job |
| POST | `/api/upload-text` | Upload `.txt` → returns text |
| GET | `/api/audio/{file}` | Download generated WAV |
| GET | `/api/audio/{file}/mp3` | Download as MP3 (needs ffmpeg) |
| GET | `/api/history` | List generation history |
| DELETE | `/api/history/{id}` | Delete history item |

---

## Project structure

```
voiceforge/
├── backend/
│   ├── main.py          # FastAPI app — all endpoints, middleware, job dispatch
│   ├── tts_engine.py    # Model singleton: lazy load, strict single-model-in-RAM discipline
│   ├── jobs.py          # Single-worker ThreadPoolExecutor job queue
│   ├── db.py            # SQLite — voices + generation history (stdlib only)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/       # Generate · Voices · VoiceConversion · History
│       ├── components/  # Sidebar · AudioPlayer · Toast
│       ├── api.ts       # Typed fetch wrappers
│       └── types.ts     # Shared TypeScript interfaces
├── data/                # Created at runtime (gitignored)
│   ├── voices/          # Uploaded voice clips
│   └── audio/           # Generated WAV files
├── run.sh               # One-command launcher
├── test_tts.py          # CLI smoke-test
├── USER_MANUAL.md       # Detailed usage guide
├── CONTRIBUTING.md      # Contributor guide
└── LICENSE              # MIT
```

---

## Troubleshooting

**Out of memory / process killed**
Close other apps and browser tabs. The Standard model can spike to ~6 GB RAM. Switching engines unloads the previous model first.

**Generation never completes**
A single background worker processes one job at a time. Check the chunk progress counter on the Generate page.

**`ModuleNotFoundError: No module named 'pip'`**
Delete `.venv/` and re-run `./run.sh` — the script will recreate it cleanly.

**ffmpeg not found**
```bash
sudo dnf install ffmpeg-free   # Fedora
sudo apt install ffmpeg        # Ubuntu/Debian
brew install ffmpeg            # macOS
```

**`Cannot import chatterbox`**
Run `./run.sh` (not `python backend/main.py` directly). The venv must be active.

---

## Hardware notes

Optimised for: **AMD Ryzen 5 3500U · 16 GB RAM · CPU-only · Fedora Linux**.
Works on any x86-64 Linux, macOS (Intel or Apple Silicon), and Windows (WSL2).
GPU acceleration (CUDA / MPS) is detected automatically if available.

---

## License

[MIT](LICENSE) © 2025 Umar Hegde

Powered by [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) by Resemble AI (MIT License).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions welcome — bug reports, features, docs, and translations.
