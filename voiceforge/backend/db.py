import json
import sqlite3
import time
from pathlib import Path
from typing import Dict, List, Optional

DB_PATH = Path(__file__).parent.parent / "data" / "voiceforge.db"


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    return c


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _conn() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS voices (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                path        TEXT NOT NULL,
                created_at  REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS history (
                id          TEXT PRIMARY KEY,
                text        TEXT NOT NULL,
                engine      TEXT NOT NULL,
                file_path   TEXT NOT NULL,
                created_at  REAL NOT NULL,
                params      TEXT
            );
        """)


# ── voices ────────────────────────────────────────────────────────────

def add_voice(voice_id: str, name: str, path: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO voices (id, name, path, created_at) VALUES (?,?,?,?)",
            (voice_id, name, path, time.time()),
        )


def get_voices() -> List[Dict]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM voices ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def get_voice(voice_id: str) -> Optional[Dict]:
    with _conn() as c:
        row = c.execute("SELECT * FROM voices WHERE id=?", (voice_id,)).fetchone()
    return dict(row) if row else None


def delete_voice(voice_id: str) -> None:
    with _conn() as c:
        c.execute("DELETE FROM voices WHERE id=?", (voice_id,))


def update_voice_name(voice_id: str, name: str) -> None:
    with _conn() as c:
        c.execute("UPDATE voices SET name=? WHERE id=?", (name, voice_id))


# ── history ───────────────────────────────────────────────────────────

def add_history(
    history_id: str,
    text: str,
    engine: str,
    file_path: str,
    params: Optional[Dict] = None,
) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO history (id, text, engine, file_path, created_at, params)"
            " VALUES (?,?,?,?,?,?)",
            (
                history_id,
                text[:500],
                engine,
                file_path,
                time.time(),
                json.dumps(params) if params else None,
            ),
        )


def get_history() -> List[Dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM history ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_history_item(history_id: str) -> Optional[Dict]:
    with _conn() as c:
        row = c.execute(
            "SELECT * FROM history WHERE id=?", (history_id,)
        ).fetchone()
    return dict(row) if row else None


def delete_history(history_id: str) -> None:
    with _conn() as c:
        c.execute("DELETE FROM history WHERE id=?", (history_id,))
