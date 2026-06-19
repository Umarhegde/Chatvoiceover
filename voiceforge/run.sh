#!/usr/bin/env bash
# VoiceForge launcher — Fedora / Linux
# Usage:  ./run.sh          (production: builds frontend, serves everything from FastAPI)
#         ./run.sh --dev    (dev: Vite dev server + FastAPI in parallel, hot-reload)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHATTERBOX_DIR="$(realpath "$SCRIPT_DIR/../chatterbox-master")"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
VENV_DIR="$SCRIPT_DIR/.venv"
DATA_DIR="$SCRIPT_DIR/data"

DEV_MODE=false
[[ "${1:-}" == "--dev" ]] && DEV_MODE=true

# ── colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[voiceforge]${NC} $*"; }
ok()    { echo -e "${GREEN}[voiceforge]${NC} $*"; }
warn()  { echo -e "${YELLOW}[voiceforge]${NC} $*"; }
die()   { echo -e "${RED}[voiceforge] ERROR:${NC} $*" >&2; exit 1; }

# ── 1. Python — prefer 3.12 or 3.13; avoid 3.14 (limited wheel availability) ─
info "Checking Python…"
PYTHON=""
PY_VER=""
# Try specific stable versions first, fall back to generic python3
for candidate in python3.12 python3.13 python3.11 python3.10 python3; do
    if command -v "$candidate" &>/dev/null; then
        _ver=$("$candidate" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "")
        _maj="${_ver%%.*}"
        _min="${_ver##*.}"
        # Accept 3.10–3.13; accept 3.14 only as last resort
        if [[ "$_maj" == "3" && "$_min" -ge 10 && "$_min" -le 13 ]]; then
            PYTHON="$candidate"
            PY_VER="$_ver"
            break
        fi
        # Save 3.14 as fallback in case nothing else found
        if [[ "$_maj" == "3" && "$_min" -eq 14 && -z "$PYTHON" ]]; then
            PYTHON="$candidate"
            PY_VER="$_ver"
        fi
    fi
done

[[ -z "$PYTHON" ]] && die "Python 3.10–3.14 not found.
Install with:  sudo dnf install python3.12   # recommended
               sudo dnf install python3       # or system default"

info "Python $PY_VER found at $(command -v "$PYTHON")"

if [[ "$PY_VER" == "3.14" ]]; then
    warn "Python 3.14 is very new; some packages may lack pre-built wheels."
    warn "If this install fails, run:  sudo dnf install python3.12  then retry."
fi

# ── 2. Node.js check / install ───────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    warn "Node.js not found. Attempting to install via fnm (no sudo required)…"

    FNM_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/fnm"
    export PATH="$FNM_DIR:$PATH"

    if ! command -v fnm &>/dev/null; then
        info "Downloading fnm (Fast Node Manager)…"
        curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir "$FNM_DIR" --skip-shell
    fi

    eval "$(fnm env --use-on-cd 2>/dev/null || true)"
    export PATH="$FNM_DIR:$PATH"

    if ! command -v node &>/dev/null; then
        info "Installing Node.js 20 LTS via fnm…"
        fnm install 20
        fnm use 20
        eval "$(fnm env)"
    fi
fi

if ! command -v node &>/dev/null; then
    die "Node.js still not found.
Install with:  sudo dnf install nodejs npm
Or visit:      https://nodejs.org"
fi
info "Node $(node --version) found"

# ── 3. Python venv — validate health, recreate if stale or broken ────────────
PYTHON_VENV="$VENV_DIR/bin/python"

if [[ -d "$VENV_DIR" ]]; then
    # Detect version mismatch or broken pip
    VENV_VER=$("$PYTHON_VENV" -c \
        "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" \
        2>/dev/null || echo "broken")

    if [[ "$VENV_VER" != "$PY_VER" ]]; then
        warn "Venv was built with Python $VENV_VER but we need $PY_VER — recreating…"
        rm -rf "$VENV_DIR"
    elif ! "$PYTHON_VENV" -m pip --version &>/dev/null; then
        warn "Venv pip is broken — recreating…"
        rm -rf "$VENV_DIR"
    fi
fi

if [[ ! -d "$VENV_DIR" ]]; then
    info "Creating Python $PY_VER virtual environment at $VENV_DIR …"
    "$PYTHON" -m venv "$VENV_DIR"
    # Bootstrap pip if the distro venv didn't include it
    if ! "$PYTHON_VENV" -m pip --version &>/dev/null; then
        info "Bootstrapping pip via ensurepip…"
        "$PYTHON_VENV" -m ensurepip --upgrade
    fi
fi

# Use "python -m pip" — always works, unlike the pip wrapper script
info "Upgrading pip…"
"$PYTHON_VENV" -m pip install --quiet --upgrade pip

# ── 4. Install chatterbox editable ──────────────────────────────────────────
if ! "$PYTHON_VENV" -c "import chatterbox" 2>/dev/null; then
    info "Installing chatterbox-tts in editable mode (downloads torch + deps — be patient)…"
    "$PYTHON_VENV" -m pip install -e "$CHATTERBOX_DIR"
fi

# ── 5. Install backend deps ──────────────────────────────────────────────────
info "Installing backend dependencies…"
"$PYTHON_VENV" -m pip install --quiet -r "$BACKEND_DIR/requirements.txt"

# ── 6. Data directories ──────────────────────────────────────────────────────
mkdir -p "$DATA_DIR/voices" "$DATA_DIR/audio"

# ── 7. Frontend ──────────────────────────────────────────────────────────────
cd "$FRONTEND_DIR"

if [[ ! -d "node_modules" ]]; then
    info "Installing frontend npm packages…"
    npm install
fi

if [[ "$DEV_MODE" == "true" ]]; then
    ok "Starting in DEV mode…"
    ok "  Backend API:      http://localhost:8000"
    ok "  Frontend (Vite):  http://localhost:5173  ← open this"
    echo ""

    (cd "$BACKEND_DIR" && "$PYTHON_VENV" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &
    BACKEND_PID=$!

    (cd "$FRONTEND_DIR" && npm run dev) &
    VITE_PID=$!

    trap "kill $BACKEND_PID $VITE_PID 2>/dev/null; exit" INT TERM
    wait
else
    info "Building frontend…"
    npm run build

    ok "Starting VoiceForge…"
    ok "  Open: http://localhost:8000"
    echo ""
    echo -e "${YELLOW}Note: First generation downloads model weights (~2-3 GB) and is slow on CPU.${NC}"
    echo ""

    cd "$BACKEND_DIR"
    exec "$PYTHON_VENV" -m uvicorn main:app --host 0.0.0.0 --port 8000
fi
