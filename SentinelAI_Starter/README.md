# SentinelAI — Local Security Monitoring Starter

This is a **local development MVP**, not a production intrusion detection system. It checks one localhost website, accepts authenticated security events, records incidents in SQLite, and sends Telegram alerts. It does **not** scan arbitrary hosts, block attackers, edit code, or deploy fixes.

## Setup (Windows PowerShell)

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env`: set a long random `ADMIN_API_KEY`, optionally Telegram credentials, and set `TARGET_URL` to an HTTP service on **localhost** that you own. If PowerShell blocks activation, run `.venv\Scripts\python.exe` instead of `python` in the commands.

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/docs. If nothing is running on port 9000, the initial website DOWN alert is expected. To create a sample healthy target, run this in a second terminal:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 9000
```

This uses the agent's `/health` as a dummy target; in a real setup, monitor your actual application's health endpoint.

## Telegram

Create a bot using Telegram's verified `@BotFather`. Send a message to your new bot. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a private browser session to find your numeric `chat.id`. Store token and ID only in `.env`, never commit them. The bot must be allowed to message your chat. Telegram alert errors print locally.

## Test events

In PowerShell, with your API key in `.env`:

```powershell
$headers = @{ 'X-API-Key' = 'YOUR_ADMIN_API_KEY' }
1..5 | ForEach-Object {
  Invoke-RestMethod -Uri http://127.0.0.1:8000/events -Method Post -Headers $headers -ContentType 'application/json' -Body '{"source_ip":"203.0.113.5","event_type":"login_failed","path":"/login"}'
}
Invoke-RestMethod -Uri http://127.0.0.1:8000/incidents -Headers $headers
python -m pytest -q
```

`/events` requires your website to forward structured security events; the agent does not magically see traffic. This sample detector uses a naive in-memory threshold (5 failures per minute) and simple path signatures. It can generate false positives, resets on restart, and must not be trusted as a sole defense.

## Safe AI repair extension

1. Read-only investigation: capture sanitized stack traces and commit hashes; keep secrets out of prompts.
2. AI proposes a patch in a separate Git worktree, without production credentials or shell/network access.
3. Run formatters, static checks, unit tests and integration tests in an isolated container.
4. Open a pull request with diff, tests and rollback notes; notify Telegram.
5. Require explicit human approval before merge/deploy. Never automatically edit production code or databases.

For real hosting, place the API behind authentication/TLS, use a durable event queue, rate-limit ingestion, harden secrets, and integrate WAF and application logs. Keep `/incidents` private.
