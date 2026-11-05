> Historical implementation record. Current dependency, feature and verification status is maintained in [RELEASE_CHECKS.md](RELEASE_CHECKS.md). Skill Gap Analytics and Activity Logs are now available; older statements below describe their status at that milestone.

# Project repair pass — 2026-10-28

This pass audits and repairs the existing application. It preserves the current UI, authentication architecture, uncommitted work, database schema, and 24 live job listings. It does not certify that every feature in the original admin roadmap is implemented.

## Repairs delivered

- Employer application queries use an outer join so applicants without a student profile are retained. Search accepts applicant names, email addresses, and job titles. Unsupported status filters receive a validation error.
- Job details belonging to an unapproved company are available only to its employer owner and administrators. Public requests receive 404. Authenticated responses are not cached.
- Employer publishing decisions lock the company row, reject approval of inactive accounts, and persist an employer notification in the same transaction. Repeated identical requests do not create duplicate notifications.
- Admin account, employer, and job visibility changes require an accessible native confirmation dialog. Cancel/Escape preserves the record and restores focus to the initiating control.
- Skills cannot be added with a case/whitespace variation of an existing name.
- Notification APIs support unread counts, unread filtering, pagination, and account-scoped mark-all-as-read. The existing list response shape remains compatible.
- Notification pages have working bulk/read controls, busy/error handling, pagination, and mobile wrapping. Employers can open their inbox. Navbar counts refresh on focus, after read actions, and every minute.
- `/admin/dashboard`, `/admin/students`, `/admin/employers`, `/admin/jobs`, `/admin/applications`, `/admin/approvals`, `/admin/skills`, `/admin/ai-matching`, `/admin/reports`, `/admin/notifications`, and `/admin/settings` redirect to their established, protected workspace pages. Search strings and fragments are retained. Unknown views show the existing not-found page.
- Dashboard analytics labels, definitions, confirmation text, and publishing notifications now have Khmer and Chinese translations. Date inputs and controls respect light mode. Local database timestamps are no longer incorrectly given a UTC suffix.
- Shared resource loading uses skeletons and respects reduced-motion preferences. Admin pages load separately so chart code is not part of the initial public-page bundle.
- The calendar aggregate handles the last supported calendar year without overflowing when advancing the month.

## Files changed in this pass

Backend:

- `backend/app/routers/admin.py`
- `backend/app/routers/employers.py`
- `backend/app/routers/jobs.py`
- `backend/app/routers/notifications.py`
- `backend/app/services/admin_dashboard.py`
- Added `backend/tests/test_project_regressions.py` and `backend/tests/test_pdf_resumes.py`.

Frontend:

- `frontend/src/App.jsx`
- Added `frontend/src/components/admin/AdminRouteAlias.jsx` and `ConfirmDialog.jsx`.
- `frontend/src/components/admin/DashboardAnalytics.jsx`
- `frontend/src/components/ResourceState.jsx`
- `frontend/src/components/layout/PublicHeader.jsx`
- `frontend/src/pages/AdminDashboard.jsx` and `Notifications.jsx`
- `frontend/src/services/auth-navigation.js`
- `frontend/src/admin.css` and `index.css`
- `frontend/src/i18n/translations.tsv`, generated `messages.js`, and `notifications.js`
- `frontend/tests/admin-dashboard.test.jsx`, `auth-navigation.test.js`, and new `notifications.test.jsx`
- `frontend/e2e/portal.spec.js`

Database changes: **none**. Production checks were read only. Mutating workflow tests use isolated SQLite databases. Dependencies from the existing `backend/requirements.txt` were installed into the existing virtual environment, including scikit-learn, pandas, and PyMuPDF. No credentials were changed or printed.

## New API capabilities

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/notifications?unread_only=true&page=1&page_size=20` | Filtered, paginated list for the current account |
| GET | `/api/notifications/unread-count` | Current account's unread total |
| POST | `/api/notifications/read-all` | Mark only the current account's notifications read |

Existing job, employer, admin skill, and approval endpoints retain their URLs and gain the validation/privacy fixes above.

## Executed verification

| Check | Result |
| --- | --- |
| Full backend suite with installed ML/PDF dependencies | **55 passed, no skipped tests** |
| Targeted backend regressions after final ownership/search refinement | **4 passed** |
| Frontend Vitest | **25 passed in 7 files** |
| Node API/session/localization/logic tests | **43 passed** |
| Chromium end-to-end suite after dependency/layout changes | **5 passed** |
| Admin fixture-backed rendering | Passed |
| Multilingual server rendering | **39 checks passed** |
| Public/account/Smart Home route rendering | Passed |
| Frontend lint | Passed |
| Vite production build | Passed |
| Python dependency consistency (`pip check`) | No broken requirements |
| Read-only live MySQL/API smoke test | Catalog has **24 jobs**; dashboard and unread-count return **200** |

Browser coverage includes registration, private text resume upload, application submission, role redirects, admin session restoration, 1440/768/360px layouts, mobile menu/focus, admin aliases, confirmation cancellation and notification filters. PDF tests generate synthetic files in memory and verify detection, private download, malformed files and unsupported scan/blank input. Browser tests required execution outside the Windows sandbox for reliable server shutdown; the approved run completed successfully.

The initial JavaScript entry decreased from approximately 992 KB to 616 KB after splitting admin pages/charts. Vite still reports a nonfatal chunk-size warning. Existing Starlette/httpx deprecation and deliberately wrong-algorithm test-key warnings remain; these checks passed and do not expose live credentials.

## Remaining work

The original admin roadmap still includes unfinished features: detailed student/company administration, document verification and job approval states, approval/audit history, skill categories/aliases/merging, authorized student matching history, aggregate skill gaps, full report previews/PDF exports, and persistent platform settings/administrator roles. Skill Gap Analytics and Activity Logs remain explicitly unavailable in navigation. No placeholders are represented as completed workflows.

Live SMTP and real Google/Facebook provider sign-in require deployment configuration; mocked security/workflow tests passed. Native-speaker localization review, human-labeled recommendation evaluation, screenshot parity, and public deployment are not certified by automated tests.

Normal verification commands:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -q
.\venv\Scripts\python.exe -m pip check
cd ..\frontend
npm test
npm run test:ui
npm run lint
npm run build
$env:E2E_PYTHON = (Resolve-Path ..\backend\venv\Scripts\python.exe).Path
npm run test:e2e -- --reporter=line
```

This workspace also has Node 22 under `.local-run/tooling/node-v22.23.4-win-x64` and Chromium under `.local-run/ms-playwright`; add the former to PATH and set `PLAYWRIGHT_BROWSERS_PATH` to the latter when using those local installations.
