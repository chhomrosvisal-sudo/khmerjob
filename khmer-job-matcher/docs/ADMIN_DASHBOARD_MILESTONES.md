# Admin dashboard audit and milestones

Latest repair status: [PROJECT_FIXES.md](PROJECT_FIXES.md) supersedes earlier test/dependency/browser limits below. It adds admin route aliases, confirmation dialogs, localized analytics, notification counts/filtering/bulk-read and ownership/approval fixes. Matching-history, job-approval and audit models remain unimplemented.

## Scope and source instructions

`AGENT_INSTRUCTIONS.md` was read completely before this implementation. It defines Milestones 1–7 for the original whole application; it does not contain a Milestone 0 or an admin-specific milestone sequence. The user's latest instructions add a repository audit as Milestone 0 and apply the responsive frontend requirements to the existing admin workspace. This document tracks that adaptation without changing the original instruction file.

The requested scope for this delivery is Milestones 0 and 1. Subsequent admin work is listed explicitly below. Existing uncommitted website, navigation, session, and dashboard work must be retained. No database reset, reseeding, credential changes, or replacement frontend is required.

No reference screenshot is attached to this conversation or present among the repository's image assets. Therefore exact screenshot parity cannot be claimed. Preserve the checked-in sidebar, navbar, statistic-card structure, spacing, and responsive layout; use the existing navy sidebar and blue accents in `frontend/src/index.css` as the design reference, rather than inventing a redesign.

## Milestone 0 — repository audit (completed)

### Existing architecture

- React JavaScript, Vite, Tailwind v4, React Router, Lucide icons, shared native-fetch API client.
- FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, configured MySQL database.
- Password/JWT authentication, current-database-role enforcement, account/session revocation. Browser session restoration validates `/api/auth/me` before rendering private content.
- Admin UI: `App.jsx` workspace shell, grouped `AdminNavigation`, `AdminDashboard`, `admin.css`, shared loading/error component, notification inbox, and model training panel.
- Existing admin API: counts/status summary, paginated/searchable accounts/companies/jobs, activation, employer approval/suspension, job moderation, skill creation, CSV report, ML status/training.
- Existing data tables cover profiles, skills, employers, jobs, applications, resumes, notifications, authentication, and recovery. No activity-log table exists.

### Feature inventory

| Feature | Audit result |
|---|---|
| Dashboard | Database counts and application-status summary exist; overview response is untyped and has no student-specific count. |
| Students | Uses the users endpoint with `role=student`; enable/disable already exists. |
| Employers | Company directory and approval/suspension exist. |
| Job Listings | Listing search, pagination, archive/restore exist. |
| Applications | Model and student/employer workflows exist; admin list and sidebar route are missing. |
| Approvals | Pending-employer filtering and approve action exist. |
| Skills Management | Catalog search and skill creation exist; edit/delete are not implemented. |
| AI Job Matching | Model status and training exist; no admin candidate-comparison workflow. |
| Skill Gap Analytics | Sidebar placeholder; no aggregate analytics endpoint/page. |
| Reports | Current totals and CSV summary exist; no historical trend report. |
| Notifications | Signed-in user's inbox and mark-read exist; no platform-wide admin event feed. |
| Activity Logs | Sidebar placeholder; no persistent audit model, migration, endpoint, or UI. |
| Settings | Account information, language, theme, connected social accounts exist; no platform settings store. |

### Baseline checks executed

- Backend: `backend/venv/Scripts/python.exe -m pytest -q`: **37 passed, 1 skipped**. The skipped check requires optional scikit-learn. Existing test-library/key warnings were observed.
- Frontend native Node tests: **43 passed**.
- Admin fixture-backed server rendering: passed.
- Vite production build: passed; existing large-bundle warning remains.
- Read-only MySQL inspection: dialect `mysql`, migration `0005`; 1 user, 0 student profiles, 4 employers, 4 jobs, 0 applications, 9 skills. These are observations, not dashboard constants.
- Node/npm are absent from PATH. Existing checks run through VS Code's embedded Node runtime. Vitest, Testing Library/jsdom, and Playwright are declared but not installed. Browser validation has not yet passed.

## Milestone 1 — admin shell, live overview, and application navigation

Implement without replacing existing controls:

- Preserve grouped sidebar, navbar, four overview cards, application pipeline, quick actions, employer queue, and desktop/mobile layout. Match the existing navy/blue design reference.
- Keep admin-only routing and persistent sign-in; unknown dashboard paths show an explicit not-found page.
- Add a typed, backwards-compatible database-backed overview with student count and useful job/skill totals; prevent caching of private summary data.
- Add a paginated, searchable admin applications endpoint and page using existing database tables. Support status filtering and read-only review; keep employer-owned status changes and private resume permissions unchanged.
- Connect the Applications sidebar entry and statistic card. Preserve student role filtering and approval filtering.
- Check authorization, actual aggregate counts, application filtering/pagination, empty/error states, and existing regressions.
- Record commands/results and browser verification limits after implementation.

## Remaining admin milestones

1. Student/employer detail views, complete skill editing rules, and richer job moderation with server validation.
2. Admin matching inspection and aggregate skill-gap analytics from real student skills and public job requirements; document the denominator and privacy limits.
3. Persistent activity logs using an additive Alembic migration, transaction-aware admin action recording, searchable read-only audit view, and admin event notifications.
4. Extended reports/settings only where backed by defined database models and permissions; localization review, real browser/accessibility testing, and deployment checks.

Disabled features must stay visibly unavailable until their real workflows are implemented. Synthetic fixtures belong only in isolated tests; they must never become dashboard fallback data.

## Dashboard analytics implementation — 2026-10-28

Milestone 0 was rechecked against the current source and a read-only live MySQL inspection. The live tables match the existing ORM; jobs have `is_active` but no approval status or expiration date. Authentication continues to use current database roles and token versions. Existing uncommitted work was preserved.

Milestone 1 is **partially implemented**, not accepted as complete.

Files added: `backend/app/services/admin_dashboard.py`, `backend/tests/test_dashboard_analytics.py`, `frontend/src/components/admin/DashboardAnalytics.jsx`.

Files extended: `backend/app/routers/admin.py`, `backend/app/schemas/admin.py`, `frontend/src/pages/AdminDashboard.jsx`, `frontend/tests/admin-dashboard.test.jsx`, `frontend/tests/admin-ssr.mjs`, and this report.

Endpoints: admin-only `GET /api/admin/dashboard` and `GET /api/admin/dashboard/export`, both accepting `start` and `end` dates. Responses are private and noncacheable. Existing overview/report endpoints remain compatible.

Features: period registration/application/active-job counts; current company approval totals; monthly registrations and postings; application status and top required-skill Recharts panels; recent record creation; date filtering/reset/refresh; CSV export with metric definitions and spreadsheet-formula escaping; loading/error/retry/empty states. Existing all-time overview cards, pipeline, quick actions, and review queue remain available. The new analytics section uses the established panel/card styles.

Database changes: none. No production writes, resets, seeds, or migrations were performed. Current employer publishing approval is not document verification; the UI calls these approved companies. AI match count and pending-job count are explicitly unavailable rather than fabricated zeroes. Real audit history still requires a persistent model.

Checks executed:

- Full backend pytest: **47 passed, 1 skipped** (optional scikit-learn check); existing Starlette and test JWT warnings.
- After adding response schemas: targeted analytics tests **2 passed**.
- Vitest: **6 files, 22 tests passed**.
- Admin server-rendering smoke check: passed, including analytics headings and empty/unavailable metrics.
- Vite production build: passed; large bundle warning remains.
- Live MySQL schema inspection: passed, read only. Automated API aggregate tests use isolated SQLite, not production data.
- Frontend commands used VS Code's embedded Node via `ELECTRON_RUN_AS_NODE=1`; this runtime emits a Crashpad message but the commands exited successfully.

Remaining Milestone 1 work: persistent matching history, job moderation states and approvals, document verification semantics, genuine administrative audit activity, Khmer translations for new analytics strings, loading skeletons, requested `/admin/*` URL aliases, and browser/mobile visual validation. No screenshot was supplied, so screenshot parity is unverified. Dashboard export is CSV; PDF belongs to the later reports milestone. Milestones 2–7 remain open.

## Milestone 1 result — implemented and checked

### Completed

- Retained the existing grouped navigation, navbar, four statistic cards, application pipeline, quick actions, and approval queue. The original navy/blue sidebar styles are used. Public-site layout was not replaced.
- Overview statistics come from MySQL via a typed `/api/admin/overview` response, now including students, open public jobs, and catalog skills. Existing response keys and CSV output remain compatible. The Students card counts student-role accounts, rather than all users.
- Applications now links to a real admin page and `GET /api/admin/applications`. Server-side search covers applicant name/email, job, and company; status filtering and pagination are validated. Closed-job applications and applicants without profiles remain visible. This admin view is read-only and exposes no resume content or password hashes.
- Existing role checks, account controls, employer approvals, job moderation, private resume permissions, and session restoration remain in place.
- Unknown dashboard URLs show Page not found. Mobile navigation identifies its controlled sidebar, moves focus into it, traps Tab while open, and returns focus after closing.
- Installed the declared frontend test libraries and refreshed `package-lock.json`. The first npm resolver attempt crashed; installation succeeded with the legacy resolver, after which ordinary `npm install --offline --no-audit --no-fund` also succeeded with the repaired lockfile. No package version ranges were changed.
- Fixed two previously unexecuted test assumptions: a login test must identify the specific login alert, and Playwright workers must reuse the runner's temporary admin password.
- Restarted the existing local API helper to load the new routes; port 8000 OpenAPI includes the admin applications endpoint, and the frontend proxy health check returns `ok`.

### Validation

| Check | Result |
|---|---|
| Backend suite after implementation | 47 passed, 1 optional scikit-learn test skipped |
| New backend dashboard coverage | 8 passed: real aggregates, role enforcement, inactive accounts, application search/status/pagination, parameter bounds |
| React/Vitest interactive suite | 22 passed, including 8 new admin UI tests |
| Production build and lint | Passed; large-bundle warning remains |
| Route rendering and admin fixture rendering | Passed |
| Multilingual rendering | 39 checks passed |
| Real Chromium browser suite | 4 passed against an isolated migrated SQLite database |
| Browser layout/session checks | 1440px, 768px, 360px; no horizontal page overflow; mobile Escape/focus, applications navigation, refresh persistence, logout |
| Real MySQL/FastAPI integration | Overview and applications returned 200 through the real app/database session; guest application access returned 401 |
| Existing MySQL rows | Preserved: 1 user, 0 student profiles, 4 employers, 4 jobs, 0 applications, 9 skills; migration remains `0005` |

Actual browser screenshots were captured in ignored `frontend/test-results/portal-admin-dashboard-kee-102ab-ablet-and-mobile-navigation/` as `admin-overview-1440.png`, `admin-overview-768.png`, and `admin-overview-360.png`. They show the isolated browser-test database, not production figures. Desktop and mobile captures were visually inspected. Exact parity with the user's reference screenshot remains unverified because that reference was not available.

### Main files changed in this milestone

- `backend/app/routers/admin.py`, `backend/app/schemas/admin.py`, `backend/tests/test_admin_dashboard.py`.
- `frontend/src/App.jsx`, `frontend/src/admin.css`, `frontend/src/pages/AdminDashboard.jsx`, `frontend/src/components/admin/AdminApplications.jsx`, `frontend/src/services/admin-navigation.js`.
- `frontend/tests/admin-dashboard.test.jsx`, existing rendering tests, `frontend/tests/workflows.test.jsx`, `frontend/e2e/portal.spec.js`, `frontend/playwright.config.js`, `frontend/package-lock.json`.

### Commands to reproduce

With Node/npm on PATH, use the standard project commands. This checkout also has a checksum-verified, ignored portable runtime; it does not change the system installation:

```powershell
# From the project root; optional when Node/npm are already installed:
$nodeDirectory = (Get-ChildItem .local-run/tooling -Directory -Filter 'node-v22*-win-x64' | Select-Object -First 1).FullName
$env:Path = "$nodeDirectory;$env:Path"

.\backend\venv\Scripts\python.exe -m pytest -q
cd frontend
npm test
npm run test:ui
npm run test:admin
npm run test:routes
npm run test:i18n
npm run lint
npm run build
$env:E2E_PYTHON = (Resolve-Path ../backend/venv/Scripts/python.exe).Path
$env:PLAYWRIGHT_BROWSERS_PATH = (Resolve-Path ../.local-run).Path + '/ms-playwright'
npm run test:e2e
```

For normal local use, start MySQL in XAMPP and use the README's FastAPI/Vite startup commands. No new migration is needed for this milestone. The browser tests use their own temporary database and ports 5175/8011, never the configured MySQL database.

### Still remaining

Skill Gap Analytics and Activity Logs remain clearly disabled. Other future milestones include full skill editing, detailed student/employer views, admin matching inspection, richer historical reports, and a platform-level notification/settings model. The original screenshot is needed to verify pixel-level fidelity. SMTP/social-provider setup and optional ML/PDF dependencies are separate from this admin milestone.

### Combined-workspace verification

Additional date-range dashboard analytics arrived in the shared workspace during final checks and were preserved. The combined implementation includes `/api/admin/dashboard` and its CSV export, monthly student/job counts, application status distribution, top required skills, and recent record creation. Counts use SQL aggregates; unrecorded AI-match/job-approval metrics are explicitly unavailable. These are platform statistics, not a persistent administrator activity log or student skill-gap analysis. The existing four overview cards remain alongside the range-specific analytics.

The combined backend suite passed **47 tests with 1 optional skip**, and the interactive suite passed **22 tests**. Read-only MySQL checks of the date-range JSON/CSV endpoints passed. A tablet-width overflow in the new date controls was caught by the browser suite and fixed using wrapping date filters. Related source files are `backend/app/services/admin_dashboard.py`, the extended admin schemas/router, `frontend/src/components/admin/DashboardAnalytics.jsx`, and `backend/tests/test_dashboard_analytics.py`. The local API was refreshed to serve both Applications and Dashboard Analytics.
