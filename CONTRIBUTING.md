# Contributing to VoiceForge

Thank you for considering a contribution! VoiceForge is an open-source project and welcomes improvements of all kinds.

## Ways to contribute

- **Bug reports** — open a GitHub issue with steps to reproduce and the output of `./run.sh`
- **Feature requests** — open an issue describing the use-case
- **Code** — see the development workflow below
- **Documentation** — improve README, USER_MANUAL, or add translated docs

## Development setup

```bash
git clone https://github.com/Umarhegde/Chatvoiceover
cd Chatvoiceover/voiceforge
./run.sh --dev   # starts FastAPI on :8000 + Vite dev server on :5173
```

The `--dev` flag runs the React frontend with hot-reload (Vite) alongside the FastAPI backend, so you see changes instantly.

## Project layout

```
voiceforge/
├── backend/
│   ├── main.py          # All API endpoints
│   ├── tts_engine.py    # Model loading / unloading singleton
│   ├── jobs.py          # Single-worker async job queue
│   └── db.py            # SQLite — voices + generation history
└── frontend/
    └── src/
        ├── pages/       # Generate · Voices · VoiceConversion · History
        ├── components/  # Sidebar · AudioPlayer · Toast
        ├── api.ts       # Typed fetch wrappers
        └── types.ts     # Shared TypeScript types
```

## Code guidelines

- **Python**: follow PEP 8; keep functions short; add type hints; no external ORM (stdlib sqlite3 only)
- **TypeScript/React**: functional components; no class components; Tailwind for all styling (use `vf-*` design tokens defined in `tailwind.config.js`)
- **No new dependencies** without discussion — we target a lean install to keep first-run time manageable

## Memory constraints

VoiceForge is built for machines with limited RAM (8–16 GB). The model manager enforces a **single model in memory** at a time. Any PR that loads multiple models simultaneously will be declined unless it adds explicit unloading logic.

## Pull request checklist

- [ ] `./run.sh --dev` starts cleanly
- [ ] Frontend builds with `npm run build` (inside `frontend/`)
- [ ] No Python import errors: `python -c "import main"` from `backend/`
- [ ] Any new API endpoint is added to the API reference table in README.md

## Reporting security issues

Please **do not** open a public issue for security vulnerabilities. Email umarhegdee@gmail.com instead.
