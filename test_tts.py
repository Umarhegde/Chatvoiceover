#!/usr/bin/env python3
"""Quick smoke-test: load Turbo, generate one English sentence, print speed."""
import sys
import time
from pathlib import Path

# Make chatterbox importable when run outside the venv (fallback)
sys.path.insert(0, str(Path(__file__).parent.parent / "chatterbox-master" / "src"))

import torch
import torchaudio

torch.set_num_threads(4)

if torch.cuda.is_available():
    device = "cuda"
elif torch.backends.mps.is_available():
    device = "mps"
else:
    device = "cpu"

print(f"Device: {device}")
print("Loading ChatterboxTurboTTS (downloads weights on first run) …")

t0 = time.perf_counter()
from chatterbox.tts_turbo import ChatterboxTurboTTS
model = ChatterboxTurboTTS.from_pretrained(device)
load_time = time.perf_counter() - t0
print(f"Model loaded in {load_time:.1f}s")

text = "Hello! This is VoiceForge running on your local machine — no cloud, no fees, fully offline."
print(f"\nGenerating: {text!r}")

t1 = time.perf_counter()
wav = model.generate(text)
gen_time = time.perf_counter() - t1

out_path = Path(__file__).parent / "test_output.wav"
torchaudio.save(str(out_path), wav, model.sr)

duration = wav.shape[-1] / model.sr
print(f"\nGenerated {duration:.1f}s of audio in {gen_time:.1f}s "
      f"({gen_time / duration:.2f}x real-time on {device})")
print(f"Saved to: {out_path}")
