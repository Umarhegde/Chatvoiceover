# VoiceForge — User Manual

**Version 1.0 · Offline TTS + Voice Cloning Studio**

---

## Table of Contents

1. [What is VoiceForge?](#1-what-is-voiceforge)
2. [System Requirements](#2-system-requirements)
3. [Installation & First Launch](#3-installation--first-launch)
4. [Understanding the Interface](#4-understanding-the-interface)
5. [Generate Page](#5-generate-page)
   - 5.1 [Choosing an Engine](#51-choosing-an-engine)
   - 5.2 [Writing & Editing Text](#52-writing--editing-text)
   - 5.3 [Paralinguistic Tags (Turbo only)](#53-paralinguistic-tags-turbo-only)
   - 5.4 [Voice Source](#54-voice-source)
   - 5.5 [Advanced Controls Reference](#55-advanced-controls-reference)
   - 5.6 [Generating Audio](#56-generating-audio)
   - 5.7 [Playing & Downloading Results](#57-playing--downloading-results)
6. [Voices Page](#6-voices-page)
   - 6.1 [Uploading a Voice](#61-uploading-a-voice)
   - 6.2 [Recording Tips for Best Cloning](#62-recording-tips-for-best-cloning)
   - 6.3 [Managing Voices](#63-managing-voices)
7. [Voice Conversion Page](#7-voice-conversion-page)
8. [History Page](#8-history-page)
9. [Performance on This Hardware](#9-performance-on-this-hardware)
10. [Tips & Tricks](#10-tips--tricks)
11. [Troubleshooting](#11-troubleshooting)
12. [API Reference](#12-api-reference)
13. [Glossary](#13-glossary)

---

## 1. What is VoiceForge?

VoiceForge is a **free, fully offline, English-only** text-to-speech and voice cloning studio that runs entirely on your local machine. There is no subscription, no API key, no cloud inference, and no data ever leaves your computer.

It is built on top of **Chatterbox TTS** by Resemble AI — a family of open-source, state-of-the-art neural text-to-speech models.

### What you can do

| Feature | Description |
|---------|-------------|
| **Text-to-Speech** | Convert English text into natural speech using the Turbo or Standard engine |
| **Voice Cloning** | Supply a 5–20 second reference clip to make the model speak in that voice (zero-shot) |
| **Paralinguistic tags** | Insert expressive sound events like `[laugh]`, `[cough]`, `[sigh]` into Turbo output |
| **Voice Conversion** | Convert the voice in any existing audio file to match a saved target voice |
| **History** | Browse, replay, and re-download every generation you have made |
| **WAV + MP3 download** | Export audio in WAV (always) or MP3 (when ffmpeg is installed) |

### What VoiceForge does NOT do

- It does not support languages other than English
- It does not use any paid API or cloud service
- It does not require a GPU (but GPU would speed it up considerably)

---

## 2. System Requirements

| Component | Minimum | Notes |
|-----------|---------|-------|
| **OS** | Fedora Linux 38+ / any modern Linux | Tested on Fedora 44 / GNOME Wayland |
| **CPU** | Any x86-64 CPU | Tuned for AMD Ryzen 5 3500U (4 cores / 8 threads) |
| **RAM** | 8 GB free | Standard engine can spike to ~6 GB; 8 GB free is comfortable |
| **Disk** | ~5 GB free | ~2–3 GB model weights + audio output |
| **Python** | 3.10 – 3.13 | Python 3.11 or 3.12 recommended |
| **Node.js** | 18+ | For building the frontend; auto-installed by `run.sh` via fnm if missing |
| **ffmpeg** | Optional | Only needed for MP3 downloads |
| **Internet** | First run only | Model weights download from HuggingFace on first use (~2–3 GB, one-time) |

### Optional but recommended

```bash
# Install ffmpeg for MP3 export
sudo dnf install ffmpeg-free
```

---

## 3. Installation & First Launch

### Step 1 — Open a terminal in the voiceforge folder

```bash
cd "/run/media/umar/Drive 2/Git clone /Chatvoiceover/voiceforge"
```

### Step 2 — Launch the app

```bash
./run.sh
```

`run.sh` will automatically:

1. Check for Python 3 (must already be installed)
2. Check for Node.js — if missing, installs it silently via `fnm` (no `sudo` needed)
3. Create a Python virtual environment at `.venv/`
4. Install `chatterbox-tts` from the local `../chatterbox-master` folder (editable install)
5. Install FastAPI and Uvicorn into the venv
6. Install all frontend npm packages
7. Build the React frontend into `frontend/dist/`
8. Start the server at **http://localhost:8000**

> **First run can take 5–15 minutes** because it builds the full Python environment and downloads PyTorch. Subsequent launches take under 30 seconds.

Open **http://localhost:8000** in Firefox or Chrome.

### Development mode

```bash
./run.sh --dev
```

Runs the Vite dev server (port 5173) and the FastAPI backend (port 8000) in parallel with hot-reload. Open **http://localhost:5173** during development.

### CLI smoke-test (optional)

Before launching the full app you can verify your setup with a quick command-line test:

```bash
source .venv/bin/activate
python test_tts.py
```

This loads the Turbo model (downloading weights on first run), generates one short sentence, saves it as `test_output.wav`, and prints the real-time factor so you know exactly how fast your CPU is.

---

## 4. Understanding the Interface

```
┌─────────────────┬──────────────────────────────────────────────────┐
│  ⚡ VoiceForge  │                                                  │
│  Offline TTS    │                                                  │
│  Studio         │                   Main content area              │
│─────────────────│                                                  │
│  🎤 Generate    │                                                  │
│  👥 Voices      │                                                  │
│  🔄 Voice Conv. │                                                  │
│  📜 History     │                                                  │
│─────────────────│                                                  │
│ Powered by      │                                                  │
│ Chatterbox      │                                                  │
└─────────────────┴──────────────────────────────────────────────────┘
```

The **left sidebar** contains navigation links. The **main content area** changes based on which section you select.

---

## 5. Generate Page

The Generate page is where you convert text to speech. Navigate to it by clicking **Generate** in the sidebar.

### 5.1 Choosing an Engine

Two engines are available. Select one by clicking its card:

#### Turbo (default — recommended for most use)

| Property | Value |
|----------|-------|
| Model size | 350M parameters |
| Speed on CPU | ~4–8× faster than Standard |
| Special feature | Paralinguistic tags (`[laugh]`, `[cough]`, etc.) |
| Controls | Temperature, Repetition Penalty, Top P |

Use Turbo when you want quick results, are doing voice agents or narration, or want to use expressive sound events.

#### Standard

| Property | Value |
|----------|-------|
| Model size | 500M parameters |
| Speed on CPU | Slower (1–4 min per sentence on Ryzen 3500U) |
| Special feature | Exaggeration + CFG weight for fine-grained expressiveness |
| Controls | All Turbo controls + Exaggeration, CFG Weight, Min P |

Use Standard when audio quality and voice similarity are the priority and you have time to wait.

> **Memory note:** switching engines unloads the previous model before loading the new one, so you never hold 2 models in memory simultaneously.

---

### 5.2 Writing & Editing Text

The large text area accepts plain English text up to **8,000 characters**.

#### Upload a .txt file

Click the **Upload .txt** button (top-right corner of the text area) to load a text file directly into the editor. Files longer than 8,000 characters are truncated and you will see a warning notification.

#### Character and word count

A live counter above the text area shows `N words · M/8000 chars`.

#### Long text handling

VoiceForge automatically splits your text into **1–2 sentence chunks** before sending each chunk to the model. The chunks are concatenated with a 300 ms silence between them. This means:

- You can paste an entire article or script — no need to break it up yourself
- The progress bar during generation shows `chunk X / total chunks`
- Peak RAM is bounded because only one chunk is in memory at a time

The sentence splitter looks for `.`, `!`, or `?` followed by whitespace.

---

### 5.3 Paralinguistic Tags (Turbo only)

When the **Turbo** engine is selected, a row of tag buttons appears below the text area. Clicking a tag inserts it at the current cursor position (or at the end).

| Tag | Sound |
|-----|-------|
| `[laugh]` | Natural laugh |
| `[chuckle]` | Short, quiet laugh |
| `[sigh]` | Audible exhale / sigh |
| `[cough]` | Single cough |
| `[gasp]` | Sharp intake of breath |
| `[clear throat]` | Throat-clearing |
| `[groan]` | Low groan |
| `[sniff]` | Sniff |
| `[shush]` | "Shh" sound |

**Example usage:**

```
Oh, that's incredible! [chuckle] I had no idea. [sigh] Anyway, let me get
back to the main point — we have three agenda items today.
```

Tags are **only recognised by the Turbo engine**. They are silently ignored if you accidentally leave them in text passed to the Standard engine.

---

### 5.4 Voice Source

Three voice source modes are available:

#### Default voice

No reference clip is provided. The model uses its built-in default voice. This is the fastest option and the best starting point.

#### Saved voice

Select a voice you have previously uploaded on the **Voices page**. The model performs zero-shot voice cloning: it reads your text but tries to match the speaker identity, tone, and accent of the reference clip.

Steps:
1. First upload a voice on the Voices page (see Section 6)
2. Return to Generate, choose **Saved voice**
3. Pick the voice from the dropdown

#### Upload reference (one-off)

Upload a reference clip on-the-fly without saving it permanently. Good for a quick test before committing to saving a voice.

- Choose **Upload reference**
- Click the file picker and select a WAV or MP3 file
- The clip is used for this generation only and is automatically deleted afterwards

---

### 5.5 Advanced Controls Reference

Click **Advanced controls** to expand the panel. These controls are only worth adjusting if the default output sounds wrong for your use case.

#### Temperature `[0.05 – 5.0]` · default `0.8`

Controls the randomness of the model's token sampling.

- **Lower (0.2–0.6):** More consistent, predictable, sometimes flat or robotic
- **Default (0.8):** Natural, varied speech
- **Higher (1.2–2.0):** More expressive and varied but can become unstable or hallucinate words

> Start here when output sounds wrong before touching any other parameter.

#### Repetition Penalty `[1.0 – 2.0]` · default `1.2`

Penalises the model for repeating the same tokens.

- **1.0:** No penalty (can repeat words/phrases)
- **1.2 (default):** Mild penalty — recommended
- **1.5–2.0:** Strong penalty — can reduce naturalness if too high

Increase this if the model repeats a word or phrase multiple times unexpectedly.

#### Top P `[0.0 – 1.0]` · default `1.0`

Nucleus sampling — only considers the smallest set of tokens whose cumulative probability exceeds P.

- **1.0 (default):** All tokens eligible — effectively disabled
- **0.8–0.95:** Focuses on more likely continuations — more predictable speech
- **0.5:** Very focused — can sound stiff

Leave at 1.0 unless you want to reduce unexpected word choices.

#### Exaggeration `[0.25 – 2.0]` · default `0.5` — **Standard engine only**

Controls emotional intensity and expressiveness.

- **0.25–0.4:** Neutral, calm, flat delivery
- **0.5 (default):** Natural balance
- **0.7–1.0:** More expressive, dramatic
- **1.2+:** Highly exaggerated — useful for character voices; can become unstable

> Higher exaggeration tends to speed up the speech rate. Compensate by lowering CFG Weight.

#### CFG Weight / Pace `[0.0 – 1.0]` · default `0.5` — **Standard engine only**

Classifier-Free Guidance weight. Controls how strongly the model adheres to the reference voice and pacing.

- **0.0:** Model ignores the reference clip's pacing — may speak faster or more freely
- **0.5 (default):** Balanced
- **1.0:** Strongly follows the reference pacing — can sound rigid

Lower this to `0.3` if:
- The reference speaker has a fast speaking style and the output sounds rushed
- You want slower, more deliberate speech when using high Exaggeration

#### Min P `[0.0 – 1.0]` · default `0.05` — **Standard engine only**

An alternative sampler to Top P. Tokens are only sampled if their probability exceeds `min_p × (probability of the top token)`.

- **0.0:** Disabled
- **0.02–0.1:** Recommended active range — handles higher temperatures better than Top P
- **0.05 (default):** Good starting point

Use Min P instead of (or alongside) Top P when you increase Temperature. Set Top P to 1.0 and tune Min P instead.

#### Seed (optional)

Enter any integer to make generation reproducible. The same seed + same text + same settings will produce the same audio every time.

Leave blank for a random result each time. Useful for:
- Sharing exact settings with someone else so they can reproduce your output
- Iterating on text changes while keeping the voice/style fixed

---

### 5.6 Generating Audio

Click the **Generate** button. What happens:

1. The text is sent to the backend
2. A job is queued in the single-worker queue (one job at a time)
3. The backend splits the text into chunks and generates each one sequentially
4. The progress counter `(X/N chunks)` updates every ~600 ms
5. When complete, the audio player appears below the button

**The Generate button is disabled** while a job is running. If you submit text and it appears stuck, check the progress counter — it updates when each chunk finishes. On CPU, a single short sentence takes 30–120 seconds for Turbo and 1–4 minutes for Standard.

---

### 5.7 Playing & Downloading Results

Once generation completes, an audio player appears:

```
  [▶]  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  0:03 / 0:12
        [Download WAV]   [Download MP3]
```

- **Waveform** — click anywhere on the waveform to seek
- **Play/Pause** — the circular button on the left
- **Download WAV** — always available; lossless
- **Download MP3** — available only if `ffmpeg` is installed (192 kbps)

If MP3 download shows "install ffmpeg-free for MP3 downloads":
```bash
sudo dnf install ffmpeg-free
# Then reload the page
```

---

## 6. Voices Page

Navigate here by clicking **Voices** in the sidebar.

This page lets you save, preview, rename, and delete reference voice clips used for zero-shot voice cloning.

### 6.1 Uploading a Voice

**Method 1 — Drag and drop:**
Drag any audio file directly onto the drop zone. The zone glows when a file is hovering over it.

**Method 2 — Click to browse:**
Click the drop zone to open a file picker.

**Supported formats:** WAV, MP3, FLAC, OGG, M4A

Non-WAV files are automatically converted to WAV internally (Chatterbox requires WAV format). The original file is not modified.

The voice name is automatically derived from the filename (with hyphens/underscores replaced by spaces). You can rename it immediately after upload.

### 6.2 Recording Tips for Best Cloning

The quality of voice cloning depends heavily on the reference clip. Follow these guidelines:

| What to do | Why |
|------------|-----|
| Use 10–20 seconds of speech | Too short = poor speaker capture; too long = redundant |
| Use clean audio with no background noise | Noise confuses the speaker encoder |
| Use natural, conversational speech | Avoid shouting, whispering, or singing unless that's the target style |
| Use the target language (English) | Accent and language are captured from the reference |
| Use a single speaker only | Multiple voices in one clip degrade cloning |
| Use 16 kHz or higher sample rate | Lower sample rates lose voice detail |
| Avoid music, echo, reverb | Room acoustics transfer to output |

**Ideal clip:** 15 seconds of someone reading a paragraph of natural English text in a quiet room, recorded on a decent microphone or modern smartphone.

### 6.3 Managing Voices

Each saved voice appears as a card with:

| Control | Action |
|---------|--------|
| **Play button** | Previews the reference clip using the browser's built-in audio |
| **Pencil icon** | Opens an inline rename field; press Enter to save or Escape to cancel |
| **Trash icon** | Permanently deletes the voice and its audio file (confirmation required) |

Voices are listed in reverse chronological order (newest first).

---

## 7. Voice Conversion Page

Navigate here by clicking **Voice Conversion** in the sidebar.

Voice conversion (VC) is different from TTS: instead of synthesising speech from text, it **transforms an existing audio recording** so it sounds like a different speaker.

- **Source audio:** any speech recording — the content (words, timing, emotion) of this clip is preserved
- **Target voice:** a saved voice from your Voices page — the speaker identity is transferred

This is language-agnostic: the source audio does not need to be English.

### How to use it

1. Click **Choose source audio…** and select a WAV/MP3 file (the audio to be transformed)
2. Select a **Target voice** from the dropdown (must be a previously saved voice)
3. Click **Convert Voice**
4. Wait for the job to complete (VC is typically faster than TTS since there is no text synthesis)
5. The audio player appears with the converted audio

**Use cases:**
- Record yourself reading something, then convert to a celebrity/character voice
- Convert a podcast clip's voice to another speaker for demos
- Anonymise someone's voice while preserving what they said

---

## 8. History Page

Navigate here by clicking **History** in the sidebar.

Every TTS generation is saved to history automatically. Voice conversions do not currently appear in history.

Each history entry shows:

| Element | Description |
|---------|-------------|
| **Engine badge** | `turbo` (amber) or `standard` (purple) |
| **Text snippet** | First ~200 characters of the text that was synthesised |
| **Date/time** | When the generation was completed |
| **Play button** | Plays back the audio using the browser's built-in player |
| **Download WAV** | Re-downloads the original WAV file |
| **MP3 link** | Available if ffmpeg is installed |
| **Trash icon** | Deletes the history entry (the audio file on disk is NOT deleted) |

History entries persist across server restarts (stored in SQLite).

> **Storage note:** Generated audio files in `data/audio/` are never auto-deleted. If disk space becomes an issue, delete old history entries here or manually remove files from `voiceforge/data/audio/`.

---

## 9. Performance on This Hardware

This section is specific to the Ryzen 5 3500U / Vega 8 setup.

### Why is it so slow?

Neural TTS models are computationally intense. The Chatterbox models were designed for GPU inference (NVIDIA CUDA). On a CPU, each token must be generated sequentially using only the processor. The Vega 8 integrated GPU is not supported by PyTorch's ROCm backend for this generation of hardware.

VoiceForge sets `torch.set_num_threads(4)` to use all four physical cores of the Ryzen 3500U.

### Expected generation times (measured on this machine)

Benchmark: `test_tts.py` — 15-word sentence → 6.4s audio in **91s** = **14.1× real-time** (Turbo, CPU).

| Text length | Engine | Approximate time |
|-------------|--------|-----------------|
| One short sentence (~15 words, ~5s audio) | Turbo | ~70–100s |
| One short sentence (~15 words) | Standard | ~3–6 min |
| One paragraph (~5 sentences, ~25s audio) | Turbo | ~6–8 min |
| One paragraph (~5 sentences) | Standard | ~15–30 min |
| Full page (~300 words, ~120s audio) | Turbo | ~28–35 min |
| Full page (~300 words) | Standard | ~70–120 min |

Rule of thumb: **~14 seconds of compute per second of output audio** on the Ryzen 5 3500U (Turbo engine).
Run `python test_tts.py` after activating the venv to re-measure at any time.

### Memory usage

| Engine | Peak RAM during generation |
|--------|---------------------------|
| Turbo | ~3–4 GB |
| Standard | ~5–6 GB |
| VC | ~4–5 GB |

VoiceForge never loads more than one model at a time. Switching from Standard to Turbo will unload the Standard model before loading Turbo, freeing ~2 GB.

**If your system runs out of memory** (the generation hangs or the process is killed):
- Close other applications
- Use Turbo instead of Standard
- Break very long texts into multiple shorter requests

---

## 10. Tips & Tricks

### Getting better quality speech

**Punctuation matters.** The model uses punctuation to determine pacing. Commas create brief pauses; periods create longer pauses. If output sounds rushed, add more commas.

```
# Less natural
This is a story about a man who lived alone in a house and had no friends.

# More natural  
This is a story about a man who lived alone in a house, and had no friends.
```

**Sentence length.** Very long sentences (30+ words) can cause the model to rush or stumble. Break them up.

**All-caps words.** The model may spell out words it reads as abbreviations. Use spaces: `NASA` → `N A S A`, or write it phonetically: `nay-sah`.

**Numbers and symbols.** Spell them out: `100%` → `one hundred percent`, `$50` → `fifty dollars`, `2024` → `twenty twenty-four`.

### Getting better voice cloning

- Use the same recording environment for your reference clip and your intended use
- If the cloned voice sounds wrong, try a different reference clip — even a few seconds of variation can help
- Lower `CFG Weight` (Standard only) if the output sounds unnatural in pacing
- The model preserves accent from the reference clip — if you want a neutral accent, use a neutral accent reference

### Reproducible output

Set a **Seed** in Advanced Controls. Write it down along with your settings. You can regenerate the same audio later even after closing the app.

### Using paralinguistic tags for podcasts / narration

Tags can be combined with natural speech:

```
Welcome back to the show. [chuckle] Today we have a very special guest.
[clear throat] Let me just say upfront — this is one of the most fascinating
conversations I've had all year. [gasp] And that's saying something!
```

Tags only work with the **Turbo** engine. Standard ignores them.

### Long-form content workflow

For a full article or script:
1. Split the content manually at chapter/section boundaries
2. Generate each section separately (keep a consistent voice/seed for continuity)
3. Download all WAV files
4. Concatenate them with a tool like Audacity or `ffmpeg`:
   ```bash
   ffmpeg -i "concat:part1.wav|part2.wav|part3.wav" -c copy output.wav
   ```

### Dev mode for faster iteration

Use `./run.sh --dev` during development. Changes to the frontend are reflected instantly without rebuilding. Backend changes require a server restart (Ctrl+C, then `./run.sh --dev` again) — but the model stays cached in `~/.cache/huggingface` so reloads only take a few seconds.

---

## 11. Troubleshooting

### The server won't start

**"python3 not found"**
```bash
sudo dnf install python3
```

**"Node.js not found" after run.sh tries fnm**
```bash
sudo dnf install nodejs npm
```

**"pip install failed" / torch build errors**
Make sure you have at least 5 GB of free disk space. Try:
```bash
rm -rf .venv
./run.sh
```

---

### The first generation never finishes

**It's downloading model weights.** The first call to `ChatterboxTurboTTS.from_pretrained()` downloads ~1.5 GB from HuggingFace. Check your internet connection. If the download stalls:
```bash
# Activate venv, then run test script with verbose output
source .venv/bin/activate
python -c "from chatterbox.tts_turbo import ChatterboxTurboTTS; ChatterboxTurboTTS.from_pretrained('cpu')"
```

**HuggingFace is blocked on your network.** Try:
```bash
export HF_ENDPOINT=https://hf-mirror.com
./run.sh
```

---

### Generation is running but produces silence or garbage

- Try a shorter, simpler sentence to isolate the problem
- Increase **Repetition Penalty** slightly (e.g., 1.3–1.5)
- Try with **Default voice** (no reference clip) — a bad reference clip can degrade output
- Set a fixed **Seed** and try a few times; some seeds produce better output than others
- Try the other engine (Standard vs Turbo)

---

### Voice cloning sounds like the wrong person

- The reference clip may be too short (under 5 seconds) — use 10–20 seconds
- The reference clip has background noise — use a cleaner recording
- Lower **CFG Weight** (Standard) to give the model more freedom
- The effect is strongest with Standard engine; Turbo cloning is more subtle

---

### "Voice file missing on disk" error

The audio file for a saved voice has been moved or deleted from disk but the database entry still exists. Delete the voice entry from the Voices page and re-upload the audio file.

---

### Out of memory / process killed

```
Killed
```

Linux's OOM killer terminated the process. Close other applications and try:
1. Switch to the **Turbo** engine (uses ~2 GB less RAM than Standard)
2. Use shorter text (fewer chunks generated at once)
3. Check free RAM before generating: the status endpoint shows it:
   ```bash
   curl http://localhost:8000/api/status
   ```

---

### MP3 download button not showing

ffmpeg is not installed:
```bash
sudo dnf install ffmpeg-free
# Reload the page — the button appears automatically
```

---

### Frontend shows blank page or 404

The frontend build may have failed. Rebuild it:
```bash
cd frontend
npm run build
# Then restart the server
```

---

### Port 8000 already in use

```bash
# Find what's using port 8000
ss -tlnp | grep 8000
# Kill it (replace PID with the actual PID)
kill PID
# Then relaunch
./run.sh
```

---

## 12. API Reference

VoiceForge exposes a REST API that you can use directly for scripting or integration. All endpoints are available at `http://localhost:8000`.

### GET /api/status

Returns current server state.

```bash
curl http://localhost:8000/api/status
```

```json
{
  "device": "cpu",
  "current_engine": "turbo",
  "free_ram_gb": 7.2,
  "ffmpeg_available": true,
  "slow_cpu_warning": true
}
```

---

### POST /api/tts

Submit a text-to-speech job. Returns a `job_id` to poll.

```bash
curl -X POST http://localhost:8000/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "engine": "turbo",
    "text": "Hello from VoiceForge!",
    "temperature": 0.8,
    "repetition_penalty": 1.2,
    "top_p": 1.0,
    "top_k": 1000
  }'
```

**Request body fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `engine` | string | `"turbo"` | `"turbo"` or `"standard"` |
| `text` | string | required | English text (max 8000 chars) |
| `voice_id` | string | null | ID of a saved voice |
| `temperature` | float | `0.8` | Sampling temperature |
| `repetition_penalty` | float | `1.2` | Repetition penalty |
| `top_p` | float | `1.0` | Nucleus sampling p |
| `top_k` | int | `1000` | Top-K sampling (Turbo) |
| `exaggeration` | float | `0.5` | Expressiveness (Standard only) |
| `cfg_weight` | float | `0.5` | CFG guidance (Standard only) |
| `min_p` | float | `0.05` | Min-P sampler (Standard only) |
| `seed` | int | null | Random seed for reproducibility |

```json
{ "job_id": "3f2a1c4d-..." }
```

---

### GET /api/jobs/{job_id}

Poll a job for its current status.

```bash
curl http://localhost:8000/api/jobs/3f2a1c4d-...
```

```json
{
  "id": "3f2a1c4d-...",
  "status": "running",
  "progress": 2,
  "total": 5,
  "result_url": null,
  "error": null
}
```

`status` values: `queued` → `running` → `done` | `error`

When `status` is `done`, `result_url` contains the path to the generated WAV (e.g., `/api/audio/abc123.wav`).

---

### POST /api/voices

Upload a voice reference clip.

```bash
curl -X POST http://localhost:8000/api/voices \
  -F "file=@my_voice.wav" \
  -F "name=My Voice"
```

```json
{
  "id": "a1b2c3d4-...",
  "name": "My Voice",
  "path": "/path/to/voiceforge/data/voices/a1b2c3d4-.../voice.wav"
}
```

---

### GET /api/voices

List all saved voices.

```bash
curl http://localhost:8000/api/voices
```

---

### DELETE /api/voices/{id}

Delete a saved voice and its audio file.

```bash
curl -X DELETE http://localhost:8000/api/voices/a1b2c3d4-...
```

---

### POST /api/vc

Submit a voice conversion job.

```bash
curl -X POST http://localhost:8000/api/vc \
  -F "source=@input.wav" \
  -F "target_voice_id=a1b2c3d4-..."
```

Returns `{ "job_id": "..." }`. Poll with `GET /api/jobs/{job_id}`.

---

### GET /api/audio/{filename}

Download a generated audio file (WAV).

```bash
curl -O http://localhost:8000/api/audio/abc123.wav
```

---

### GET /api/audio/{filename}/mp3

Download as MP3 (requires ffmpeg on the server).

```bash
curl -O "http://localhost:8000/api/audio/abc123.wav/mp3"
```

---

### GET /api/history

Get all past TTS generations.

```bash
curl http://localhost:8000/api/history
```

---

### DELETE /api/history/{id}

Remove a history entry (audio file on disk is preserved).

```bash
curl -X DELETE http://localhost:8000/api/history/h1i2j3k4-...
```

---

### POST /api/upload-text

Upload a `.txt` file; returns its content as a string.

```bash
curl -X POST http://localhost:8000/api/upload-text \
  -F "file=@my_script.txt"
```

```json
{ "text": "...", "truncated": false }
```

---

### Scripting example — generate audio from a text file

```bash
#!/bin/bash
# generate_audio.sh — generates a WAV from a text file using VoiceForge API

TEXT=$(cat "$1")
JOB=$(curl -s -X POST http://localhost:8000/api/tts \
  -H "Content-Type: application/json" \
  -d "{\"engine\":\"turbo\",\"text\":$(echo "$TEXT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}")

JOB_ID=$(echo "$JOB" | python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["job_id"])')
echo "Job: $JOB_ID"

while true; do
  STATUS=$(curl -s "http://localhost:8000/api/jobs/$JOB_ID")
  S=$(echo "$STATUS" | python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d["status"])')
  P=$(echo "$STATUS" | python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(f"{d[\"progress\"]}/{d[\"total\"]}")')
  echo "Status: $S ($P)"
  if [ "$S" = "done" ]; then
    URL=$(echo "$STATUS" | python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["result_url"])')
    curl -s -o output.wav "http://localhost:8000$URL"
    echo "Saved to output.wav"
    break
  elif [ "$S" = "error" ]; then
    echo "Error!"
    break
  fi
  sleep 2
done
```

Usage: `./generate_audio.sh my_script.txt`

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **TTS** | Text-to-Speech — converting written text into spoken audio |
| **Voice cloning** | Making a model speak in a specific person's voice using a short reference clip; also called zero-shot voice cloning because no fine-tuning is needed |
| **Audio prompt** | The reference clip passed to the TTS model to guide speaker identity |
| **Voice conversion (VC)** | Transforming the speaker identity in an existing audio recording to match a target voice, while preserving the original words and timing |
| **Zero-shot** | The model handles a new speaker at inference time without any additional training |
| **Temperature** | A parameter controlling how random the model's token choices are |
| **Nucleus sampling (Top P)** | A technique that restricts sampling to the smallest set of tokens whose combined probability exceeds P |
| **Min P** | An alternative to Top P — a token is only eligible if its probability exceeds `min_p` times the probability of the most likely token |
| **Repetition penalty** | A score multiplied onto already-seen tokens to reduce repetition |
| **CFG / Classifier-Free Guidance** | A technique from diffusion models adapted here to control how strongly generation is guided by the reference voice |
| **Exaggeration** | Controls the emotional intensity of the Standard model's output |
| **Paralinguistic tags** | In-text tokens like `[laugh]` that the Turbo model converts into expressive sound events |
| **Chunk** | A 1–2 sentence piece of the input text processed as a single model call to bound memory usage |
| **WAV** | Uncompressed audio format; always available |
| **MP3** | Compressed audio format; requires ffmpeg on the server |
| **ffmpeg** | A free command-line multimedia tool used by VoiceForge for MP3 conversion |
| **HuggingFace cache** | The local directory (`~/.cache/huggingface/`) where model weights are stored after the first download |
| **Venv** | Python virtual environment — an isolated Python installation in `.venv/` containing only VoiceForge's dependencies |
| **fnm** | Fast Node Manager — a tool for installing Node.js without administrator privileges |
| **Job queue** | VoiceForge processes one generation at a time. Submissions are queued and executed in order |

---

*VoiceForge user manual — generated 2026-06-19*
