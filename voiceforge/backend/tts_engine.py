import gc
import threading

import torch

# Tune for AMD Ryzen 5 3500U (4 cores / 8 threads, CPU-only)
torch.set_num_threads(4)


def _detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


DEVICE = _detect_device()


class ModelManager:
    """Singleton that holds at most one model at a time.

    Switching engines unloads the current model first to avoid
    double-loading on this memory-constrained machine.
    """

    def __init__(self) -> None:
        self._model = None
        self._engine: str | None = None  # "turbo" | "standard" | "vc"
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    def _unload(self) -> None:
        if self._model is not None:
            del self._model
            self._model = None
            self._engine = None
            gc.collect()
            if DEVICE == "cuda":
                torch.cuda.empty_cache()

    # ------------------------------------------------------------------
    def get_tts(self, engine: str):
        """Return a loaded TTS model, loading it if necessary."""
        with self._lock:
            if self._engine == engine and self._model is not None:
                return self._model

            self._unload()

            if engine == "turbo":
                from chatterbox.tts_turbo import ChatterboxTurboTTS
                self._model = ChatterboxTurboTTS.from_pretrained(DEVICE)
            elif engine == "standard":
                from chatterbox.tts import ChatterboxTTS
                self._model = ChatterboxTTS.from_pretrained(DEVICE)
            else:
                raise ValueError(f"Unknown TTS engine: {engine!r}")

            self._engine = engine
            return self._model

    def get_vc(self):
        """Return a loaded VC model, unloading any TTS model first."""
        with self._lock:
            if self._engine == "vc" and self._model is not None:
                return self._model

            self._unload()

            from chatterbox.vc import ChatterboxVC
            self._model = ChatterboxVC.from_pretrained(DEVICE)
            self._engine = "vc"
            return self._model

    # ------------------------------------------------------------------
    @property
    def current_engine(self) -> str | None:
        return self._engine

    @property
    def device(self) -> str:
        return DEVICE


model_manager = ModelManager()
