import asyncio
import json
import os
import re
import secrets
import sqlite3
from collections import defaultdict, deque
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

load_dotenv()
DB = Path('sentinel.db')
TARGET = os.getenv('TARGET_URL', 'http://127.0.0.1:9000/health')
INTERVAL = max(15, int(os.getenv('CHECK_INTERVAL_SECONDS', '60')))
TIMEOUT = max(1, int(os.getenv('REQUEST_TIMEOUT_SECONDS', '5')))
ADMIN_KEY = os.getenv('ADMIN_API_KEY', '')
TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
CHAT = os.getenv('TELEGRAM_CHAT_ID', '')
failures = defaultdict(deque)
last_status = None


def db_init():
    with sqlite3.connect(DB) as db:
        db.execute('CREATE TABLE IF NOT EXISTS incidents (id INTEGER PRIMARY KEY, at TEXT NOT NULL, kind TEXT NOT NULL, severity TEXT NOT NULL, detail TEXT NOT NULL)')


def record(kind, severity, detail):
    with sqlite3.connect(DB) as db:
        db.execute('INSERT INTO incidents(at,kind,severity,detail) VALUES(?,?,?,?)', (datetime.now(timezone.utc).isoformat(), kind, severity, detail[:1500]))


async def telegram(message):
    if not TOKEN or not CHAT:
        print('Telegram not configured:', message)
        return
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            response = await client.post(f'https://api.telegram.org/bot{TOKEN}/sendMessage', json={'chat_id': CHAT, 'text': message[:4000]})
            response.raise_for_status()
        except httpx.HTTPError as exc:
            print('Telegram delivery failed:', type(exc).__name__)


def allowed_target(url):
    parts = urlsplit(url)
    return parts.scheme in ('http', 'https') and parts.hostname in ('localhost', '127.0.0.1', '::1') and parts.username is None and parts.password is None


async def check_once():
    global last_status
    if not allowed_target(TARGET):
        raise RuntimeError('Starter restricts monitoring to localhost targets')
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False, trust_env=False) as client:
            response = await client.get(TARGET)
        status = 'up' if 200 <= response.status_code < 400 else 'down'
        detail = f'{TARGET} returned HTTP {response.status_code}'
    except httpx.RequestError as exc:
        status, detail = 'down', f'{TARGET}: {type(exc).__name__}'
    if status != last_status:
        record('health', 'high' if status == 'down' else 'info', detail)
        await telegram(f'SentinelAI: Website {status.upper()}\n{detail}')
    last_status = status
    return {'status': status, 'detail': detail}


async def monitor():
    while True:
        try:
            await check_once()
        except Exception as exc:
            print('Monitor error:', type(exc).__name__)
        await asyncio.sleep(INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_init()
    task = asyncio.create_task(monitor())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(title='SentinelAI', lifespan=lifespan)


class Event(BaseModel):
    source_ip: str = Field(max_length=64)
    event_type: str = Field(max_length=64)
    path: str = Field(default='/', max_length=512)
    message: str = Field(default='', max_length=1000)


def authorized(key):
    if not ADMIN_KEY or not secrets.compare_digest(key or '', ADMIN_KEY):
        raise HTTPException(401, 'Invalid API key')


def classify(event: Event):
    if event.event_type == 'login_failed':
        now = datetime.now(timezone.utc).timestamp()
        q = failures[event.source_ip]
        q.append(now)
        while q and q[0] < now - 60:
            q.popleft()
        if len(q) >= 5:
            return ('brute_force_suspected', 'high')
    suspicious = r'(?i)(<script|\bunion\s+select\b|\.\./|/\.env\b)'
    if re.search(suspicious, event.path):
        return ('suspicious_request', 'medium')
    return None


@app.get('/health')
def health():
    return {'agent': 'ok', 'target_status': last_status}


@app.post('/events')
async def receive_event(event: Event, x_api_key: str | None = Header(default=None)):
    authorized(x_api_key)
    result = classify(event)
    if result:
        kind, severity = result
        detail = f'{kind} from {event.source_ip} on {event.path}'
        record(kind, severity, detail)
        await telegram(f'SentinelAI security alert [{severity}]\n{detail}')
        return {'alert': kind, 'severity': severity}
    return {'alert': None}


@app.get('/incidents')
def incidents(x_api_key: str | None = Header(default=None)):
    authorized(x_api_key)
    with sqlite3.connect(DB) as db:
        db.row_factory = sqlite3.Row
        return [dict(row) for row in db.execute('SELECT * FROM incidents ORDER BY id DESC LIMIT 100')]
