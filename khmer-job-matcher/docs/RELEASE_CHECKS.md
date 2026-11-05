# Current release checks

This is the current verification record, updated 2026-11-04. Earlier implementation and admin milestone documents are historical snapshots, not current dependency or feature status.

## Executed checks

| Check | Result |
|---|---|
| Backend API, permissions, migrations and workflows | 60 tests passed, no warnings or skips |
| Python dependency consistency | `pip check` passed |
| Frontend logic | 43 tests passed |
| Interactive UI | 27 tests passed |
| Chromium browser workflows | 6 passed, including persistent audit history and responsive layouts |
| Admin and public route rendering | Passed |
| Multilingual rendering | 39 checks passed |
| Lint | Passed |
| Production build | Passed; main entry approximately 278 KB; every chunk below 500 KB |
| Real MySQL migration | Applied additive migration `0006` for administrator activity |
| Live application | Website, API health, jobs and companies returned HTTP 200 through port 5173 |
| Live protected endpoints | Skill gaps, activity logs and dashboard returned 200 for an existing admin; guest requests returned 401 |
| Existing catalog | 24 jobs preserved; live checks made no account or job changes |

React and form dependencies now have separate cacheable chunks. This reduces the largest entry file, not the total bytes of all initial dependencies. No performance benchmark is claimed.

Skill Gap Analytics is available at `/dashboard/skill-gaps`. It compares required skills on open jobs from approved employers with skills on active student profiles. Demo jobs are excluded unless selected. Counts represent recorded skills, not validated competence, hiring probability, or applicant interest. With no eligible profiles coverage is unavailable, not zero percent.

Activity Logs is available at `/dashboard/activity-logs`, with action filtering and pagination. It records administrator account access, company approval, job moderation, skill creation and explicit model training. Database mutations and their audit entries commit together. Logs contain actor/target IDs and limited change metadata, without emails, passwords or resume content. It begins at migration `0006`; earlier actions are not reconstructed. The application exposes no audit edit/delete endpoint; database operators still control storage. Model files are external to database transactions.

The test-client deprecation was resolved by installing and declaring `httpx2`; `httpx` remains required by provider integrations. The wrong-algorithm JWT fixture uses a sufficiently long test key. Neither warning is suppressed.

## Remaining limitations

- SMTP and Google/Facebook provider credentials still require operator configuration; no real mail or provider sign-in is certified.
- Human review of Khmer/Chinese translations and recommendation quality remains required before public launch. Scanned PDF OCR is unsupported.
- Detailed student/company administration, document verification, job approval states, skill merging, matching history, PDF report exports and platform settings remain future work.
- Production hosting, HTTPS, backups/retention, production database credentials and deployment are separate from this local delivery.

## Reproduce

From `backend`, run `venv/Scripts/python.exe -m pytest -q` and `venv/Scripts/python.exe -m pip check`.
From `frontend`, run `npm.cmd test`, `npm.cmd run test:ui`, `npm.cmd run test:admin`, `npm.cmd run test:routes`, `npm.cmd run test:i18n`, `npm.cmd run lint`, and `npm.cmd run build`.
For Playwright set `E2E_PYTHON` to the backend virtual environment Python and `PLAYWRIGHT_BROWSERS_PATH` to `.local-run/ms-playwright`, then run `npm.cmd run test:e2e`. It uses disposable SQLite and ports 5175/8011, not the normal MySQL database.

Windows PowerShell may block `npm.ps1`; use `npm.cmd`. Node is also available in `.local-run/tooling/node-v22.23.4-win-x64`. The normal project is served at http://localhost:5173 with FastAPI on http://127.0.0.1:8000. Start MySQL first. Apply migrations before starting the API. Never reset an existing database.
