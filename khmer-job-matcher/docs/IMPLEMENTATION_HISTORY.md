# Khmer Job & Skills Matcher

React frontend with FastAPI authentication, MySQL-backed student profiles and saved jobs, job browsing, and employer job management. Fictional seeded jobs are explicitly labeled. Only navigation language is saved in browser storage; access tokens stay in memory.

## Run on Windows PowerShell

Install Node.js LTS with npm and open a new terminal:

```powershell
cd D:\Project_Python_y4s2\khmer-job-matcher\frontend
npm install
# Copy only if frontend/.env does not already exist:
Copy-Item .env.example .env
npm run dev
```

Open the local URL printed by Vite. Build and static analysis:

```powershell
npm run build
npm run lint
npm run preview
```

For unified local development, set `VITE_API_BASE_URL=/` in `frontend/.env` and restart Vite after changing it. Vite proxies `/api` to FastAPI at `http://127.0.0.1:8000`. An absolute API URL is also supported. Start the backend using the instructions below. The frontend uses React, React Router, Tailwind CSS v4, and Lucide icons. Routes include signup/login, Dashboard, Find Jobs, job details, Skill Matcher, My Profile, Settings, and employer job creation/editing. Search by title/company, filter by exact location/type, or select saved jobs only. Students select catalog skills in My Profile.

Coverage = matching required skill IDs / total required skill IDs × 100. Optional skills do not affect scores, and no requirements gives zero coverage. This is not a hiring probability or the planned ML baseline.

## Validation and limitations

Frontend production build, lint, and eight API-client/coverage tests passed using the Node runtime bundled with VS Code. Regular Node/npm are not on this implementation terminal's PATH. `npm install` must install the newly declared UI test dependencies and refresh the package lock. Backend runtime, MySQL migration, UI tests, and browser interactions remain unverified; see the Milestone 4 checks below.

Manually verify all routes, saved state after refreshing, profile validation, search/filter empty results, keyboard navigation, and the mobile menu at 360px, tablet, and desktop widths. Check the browser console and confirm no horizontal overflow.

Khmer navigation is provided; full translation and live notifications are pending. Requests show loading, empty, and retryable error states and never silently replace API failures with local demo data. Refreshing requires a fresh login; account data is retrieved from the backend after signing in again.

## Milestone 2: backend foundation

Implemented in `backend/app/`: configured FastAPI, separated catalog routes and response schemas, SQLAlchemy models, explicit Alembic migrations, and a repeatable fictional seed. `backend/main.py` remains a compatible startup entry point.

### MySQL setup

Use Python 3.11+ and MySQL 8.x. In a MySQL administrator session, create a new database and local application user (choose your own password):

```sql
CREATE DATABASE khmer_job_matcher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'khmer_app'@'127.0.0.1' IDENTIFIED BY 'choose_a_local_password';
GRANT ALL PRIVILEGES ON khmer_job_matcher.* TO 'khmer_app'@'127.0.0.1';
```

If the database or user already exists, use that existing setup; do not drop it. The grants above are scoped to this database and allow migrations in local development.

From the project root in PowerShell:

```powershell
cd backend
# Create a virtual environment only if venv does not already exist:
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Copy `.env.example` only if you do not already have `.env`. Edit `.env` to set your MySQL password, database name, and frontend origin. Generate and configure `JWT_SECRET` as described in Milestone 3 before running migrations or starting the server. URL-encode special characters in the password inside `DATABASE_URL`. The frontend origin must match the browser address exactly, including `localhost` versus `127.0.0.1`.

```powershell
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m app.seed
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Migrations create tables; startup never silently creates or resets them. The seed adds four fictional listings and nine skills, skips its existing jobs by unique demo keys, creates no login accounts, and deletes nothing. Run seed as a single process. Fictional seeded employers have no login owner.

Open `http://127.0.0.1:8000/docs` to explore the API, or in another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod 'http://127.0.0.1:8000/api/jobs?page=1&page_size=2'
Invoke-RestMethod 'http://127.0.0.1:8000/api/jobs?q=React&job_type=Internship'
```

| Method | Endpoint | Behavior |
|---|---|---|
| GET | `/api/health` | Liveness only; does not check database connectivity |
| GET | `/api/jobs` | `{items,total,page,page_size}`; optional `q`, `location`, `job_type` filters |
| GET | `/api/jobs/{job_id}` | Job, employer, and skill requirements; 404 if absent |
| GET | `/api/skills` | Skill catalog with optional Khmer name |

Pagination starts at 1 and page size is limited to 100. Search matches title or employer and treats `%`/`_` as literal characters. MySQL collation controls search case sensitivity. Listings and employers expose `is_demo`. HTTP and validation errors use an `error` envelope; database failures return 503 without exposing connection details.

### Backend checks

```powershell
cd backend # only if currently in the project root
.\venv\Scripts\python.exe -m pytest -q
```

Tests cover health/docs, pagination, filtering, detail responses, CORS, validation, seed repeatability, and migration up/down on a disposable SQLite database. They never migrate or reset your MySQL database. SQLite checks are not a substitute for applying the migration and retrieving seeded jobs on MySQL.

During implementation, Python compilation passed. Dependency installation was blocked by restricted network access, so pytest could not run (pytest is not installed in the existing virtual environment). API runtime and actual MySQL migrations remain unverified. Install requirements and run the checks above locally before accepting Milestone 2.

## Milestone 3: authentication and roles

Backend code includes Argon2id password hashing, signed JWT bearer tokens, student registration, login/current-user/logout, private student profiles, employer-owned job creation/editing, and protected administrator catalog management. No schema or data is reset. The incremental `0002` migration adds a user token version for logout revocation.

### Update an existing backend installation

Stop the running backend, then run from `backend`:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copy the generated value into `JWT_SECRET` in your existing `backend/.env`. Keep it private. Add `ACCESS_TOKEN_MINUTES=30` if you want to make the default explicit. Do not overwrite your database configuration. Startup and Alembic configuration now require a secret of at least 32 bytes; generate a random value rather than using a memorable password. Rotating the secret invalidates existing tokens.

```powershell
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m pytest -q
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Public registration always creates a student and their profile. Extra request fields such as `role`, `user_id`, `employer_id`, and `is_demo` are rejected on the relevant write endpoints. Emails are normalized to lowercase. Passwords must contain 12–128 characters and are not trimmed. Password hashes are never included in API response schemas. Login accepts JSON rather than an OAuth form.

### Create privileged accounts locally

Run these commands as the database operator from `backend`. They prompt for a password and confirmation without putting it in shell history:

```powershell
.\venv\Scripts\python.exe -m app.create_user --role employer --email employer@example.com --company "Your organization"
.\venv\Scripts\python.exe -m app.create_user --role admin --email admin@example.com
```

The command creates new accounts only and refuses an existing email. No public endpoint creates administrators or employers. Provisioned employers own their subsequently created jobs; fictional seeded employers have no login owner and cannot be claimed through a job edit.

| Method | Endpoint | Access / behavior |
|---|---|---|
| POST | `/api/auth/register` | Public; JSON `{email,password,name}`; returns student identity |
| POST | `/api/auth/login` | Public; JSON `{email,password}`; returns `access_token`, `token_type`, `expires_in` |
| GET | `/api/auth/me` | Any authenticated account; returns ID, email, and current role |
| POST | `/api/auth/logout` | Authenticated; revokes all current sessions for that account; 204 |
| GET/PATCH | `/api/students/me` | Student only; own name, education, interests, and catalog skills |
| POST | `/api/jobs` | Employer only; creates a job owned by the authenticated employer |
| PATCH | `/api/jobs/{job_id}` | Employer only; own jobs; missing and foreign jobs both return 404 |
| GET | `/api/admin/users` | Admin only; paginated account identities without password hashes |
| POST | `/api/admin/skills` | Admin only; adds a catalog skill with optional `name_km` |

In `/docs`, register and log in, then paste the access token into **Authorize**. Send API requests with `Authorization: Bearer <token>`. Tokens expire after the configured lifetime. Logout invalidates all already-issued tokens for the user, and clients discard their local token. There is no refresh token. Protected requests check the current user and role in the database, so a role change takes effect without waiting for token expiry. Use HTTPS when deploying. The frontend holds the access token in memory and never writes it to browser storage.

`PATCH /api/students/me` accepts any subset of `name`, `education`, `interests`, and `skill_ids`. Omitted fields stay unchanged. `skill_ids` replaces the selected skills, must contain unique existing positive IDs, and can be empty to clear skills. A student cannot supply another user ID. Example:

```json
{"education":"Computer Science student","interests":"Accessible websites","skill_ids":[1,2]}
```

Use actual IDs from `GET /api/skills`. Job creation requires title, description, location, and job_type; requirements are optional. Valid job types are `Full-time`, `Part-time`, `Internship`, and `Contract`. An example requirement is `{"skill_id":1,"required":true,"proficiency":"beginner"}`; proficiency can also be `intermediate` or `advanced`. Job edits accept a nonempty subset of creation fields; a supplied requirements list replaces the entire list. Ownership and demo flags cannot be edited.

### Verification status and limits

Added authorization tests in `backend/tests/test_auth.py` and shared isolated database fixtures in `backend/tests/conftest.py`. They cover hashed passwords, duplicate signup, role escalation rejection, incorrect credentials, missing/malformed/expired/wrong-signature/wrong-algorithm tokens, logout revocation, profile isolation, employer ownership, admin protection, and current database role enforcement. Existing migration tests now apply both migrations on a temporary SQLite database.

Python compilation passed. Tests could not execute in this environment: the virtual environment has no pytest, no wheels are cached, and installing requirements failed because package downloads were unavailable. Authentication runtime, tests, and MySQL migration `0002` remain unverified until the installation and test commands above succeed locally.

This is the authentication baseline. Login throttling, email verification, account recovery, refresh tokens, and broader account administration are not implemented.

## Milestone 4: frontend API integration

The frontend now uses a native-fetch API client in `frontend/src/services/api.js`. Pages, authentication state, and reusable request handling are split into `pages/`, `hooks/`, and `components/`. No local demo profiles or job arrays are imported into the application. Existing demo storage is left untouched and never uploaded automatically.

Signup creates a student account and then signs in. Students can update their profile with catalog skills, view API-derived statistics/recommendations, and save/unsave jobs. Employers see My Jobs, can publish listings, and edit their own jobs. Guests can browse/filter/paginate jobs and open details. Admin management remains available through `/docs`.

Requests time out after 15 seconds. Filter requests are aborted when superseded so slow responses cannot overwrite newer results. Failed saves display errors. A 401 or token expiry clears the session; switching accounts remounts all request state. Sign-out always clears the browser session. If the API is unreachable during sign-out, the UI explains that server sessions could not be revoked.

Additional endpoints:

| Method | Endpoint | Access / behavior |
|---|---|---|
| GET | `/api/saved-jobs` | Student; own saved job IDs |
| POST | `/api/saved-jobs/{job_id}` | Student; save an existing job; repeatable; 204 |
| DELETE | `/api/saved-jobs/{job_id}` | Student; remove own save; repeatable; 204 |
| GET | `/api/students/me/overview` | Student; whole-catalog coverage statistics and top six recommendations |
| GET | `/api/jobs?saved_only=true` | Student; paginate/filter own saved listings |
| GET | `/api/jobs?owned_only=true` | Employer; paginate/filter own listings |

No additional database migration is needed beyond `0002`. Apply existing migrations if your database is behind. Overview ranking currently loads the catalog in memory and uses only required-skill coverage; optimizing large catalogs and TF-IDF ranking are future work.

### Run both applications

In terminal 1, from `backend` with `.env` configured:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m app.seed
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

In terminal 2, from `frontend` with `.env` configured:

```powershell
npm install
npm run dev
```

Use the Vite URL whose origin matches `FRONTEND_ORIGIN`. Restart Vite after changing frontend environment variables. Re-run `npm install` to install UI test tools and update the lockfile; use `npm ci` only after the lockfile has been refreshed.

### Checks

From `frontend`:

```powershell
npm test
npm run test:ui
npm run lint
npm run build
```

From `backend`:

```powershell
.\venv\Scripts\python.exe -m pytest -q
```

The eight Node tests cover bearer headers, JSON, 204 responses, request errors, cancellation, query encoding, and coverage. Added Vitest + React Testing Library tests cover search/saved filters, empty results without fallback data, retry behavior, login failures, and profile saves. Added backend integration tests cover signup → profile skills → save/list/filter → statistics → logout/login persistence, save isolation, repeated saves/removals, and employer filtering.

Verified here: production build, lint without warnings, eight Node tests, and Python compilation. UI tests could not run because Vitest/Testing Library/jsdom are not installed. Backend tests could not run because pytest and other backend dependencies are missing. Earlier package installation attempts were blocked by network restrictions. Browser interactions and actual MySQL persistence still require local verification.

Manually create a student account, select skills, save a job, and confirm dashboard counts change. Sign out and back in to verify server persistence; refresh and verify that sign-in is required. Sign in as a second student and confirm isolation. Use a provisioned employer account to create/edit a job. Stop the API and confirm that browsing/saving shows errors without demo fallback. Verify mobile navigation at 360px and check the browser console.

Next: Milestone 5 adds a documented TF-IDF/skill matching endpoint, Khmer-aware normalization, score components, and ranking evaluation. CV upload remains deferred until core matching works.

## Public website and account dashboard

The public website uses a top navigation and the account workspace uses a sidebar.

- `/`: public homepage with job previews, including for signed-in visitors.
- `/jobs` and `/jobs/:id`: public job browsing and details.
- `/login` and `/register`: public sign-in and student registration.
- `/dashboard`: authenticated account dashboard; sign-in and registration redirect here.
- `/profile` and `/matcher`: student-only workspace pages.
- `/employer/jobs`, `/employer/jobs/new`, `/employer/jobs/:id/edit`: employer-only workspace pages.
- `/settings`: authenticated account settings.

Guests visiting private pages are redirected to sign-in. Use **My dashboard** in the website navigation to enter the workspace, and **Back to website** in the sidebar to return. Backend authorization continues to enforce account roles independently of navigation.

## Phase 1 — Cambodian recruitment homepage

The existing React/Vite app is preserved. The public homepage now uses the requested purple palette (`#69369D`, `#48216F`) and remains separate from `/dashboard`. No reference screenshot was attached; the implementation follows the written layout brief.

New reusable files:

```text
frontend/src/
  components/
    layout/PublicHeader.jsx, PublicFooter.jsx
    common/PortalSkeleton.jsx, CareerAdvice.jsx
    companies/EmployerSections.jsx
    jobs/HeroSearch.jsx, PortalJobCard.jsx, CategoryGrid.jsx
  pages/Home.jsx
  services/catalog.js
  portal.css
frontend/public/images/cambodia-office-hero.png
frontend/tests/catalog.test.js
```

### Install and run

Use an installed Node.js/npm runtime. From the project root:

```powershell
cd frontend
npm install
# Only create .env if it does not exist; preserve an existing configuration.
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev -- --host localhost --port 5173 --strictPort
```

Open `http://localhost:5173`. Keep the existing backend running on `http://127.0.0.1:8000`; the frontend uses `VITE_API_BASE_URL` in `.env`, and backend `FRONTEND_ORIGIN` must be `http://localhost:5173`. Backend setup and database commands are above. A failed API request displays an error and retry; it does not switch to local fictional data.

```powershell
npm test
npm run test:ui
npm run lint
npm run build
```

Phase 1 includes a sticky responsive navbar, English/Khmer navigation labels, original photographic hero, three carousel slides with manual controls and optional autoplay, keyword/function/location search, employer tiles and counts, three-column featured section, latest listings with employment-type filtering and pagination, ten category links, expandable career guides, and footer. Homepage searches and employer/category links initialize the jobs page from URL parameters. The mobile menu supports Escape, and carousel motion is disabled by default. Existing save-job actions use the API; guests are sent to sign-in.

### Data and scope

- Jobs come from the existing API. Existing seeded Cambodian employers and vacancies remain explicitly fictional; no real employer affiliation is implied. Employer logos are original text monograms.
- Counts use all catalog pages, grouped by employer ID. Category suggestions classify titles and skill names; they are not curated database categories or ML recommendations. Category-filtered results preserve API search/location/type/save/ownership filters before local classification and pagination.
- `Latest Job Opportunities` lists highest job IDs first. The current API has no posting date field; posting dates and salary ranges are not fabricated. Salary is marked undisclosed and experience directs readers to requirements.
- Company links currently open their job listings. Companies navigation jumps to the employer section; company profile routes belong to Phase 2. Career Advice opens on-page guides.
- Apply Now is intentionally absent because application management is a later phase. Existing job details explicitly state that applications are unavailable. Employer Portal leads to employer sign-in or existing role-protected job management; employer self-registration remains future work.
- Inter and Noto Sans Khmer load from Google Fonts when reachable, with local font fallbacks. Language selection translates navigation only.
- Native fetch is retained for the already tested API integration. Axios migration, React Hook Form, and Recharts will be introduced only in their relevant integration/dashboard phases; no unused packages were added for Phase 1.
- The public homepage currently reads the full catalog to compute accurate category/employer counts. Server-side category and employer aggregation should replace this for a large production catalog.

### Original hero asset

Created with the built-in image-generation tool, saved in `frontend/public/images/cambodia-office-hero.png`. Prompt: original photorealistic panoramic recruitment photograph of four Cambodian young adult professionals collaborating in a modern Phnom Penh office; warm daylight, neutral colors, subtle purple details, people on the right and calm office space on the left for text; no brands, words, or watermarks. The scene is illustrative and not a photograph of an actual employer.

### Next phase

Phase 2: dedicated company directory/profile pages, richer job detail data (salary, experience, posting date), and employer onboarding. Keep existing authentication and MySQL data intact. Later phases add applications, resumes, dashboard analytics, and documented TF-IDF matching. Phase 1 does not claim these features are implemented.

### Phase 1 verification in this session

Production build passed; lint completed without warnings; all 12 Node tests passed. Tests cover the existing API client plus title/skill category classification, employer identity/counts, multi-page catalog retrieval, query filters, cancellation, and explicit API failures. HTTP checks returned 200 for the homepage, generated hero image, and jobs search entry; the API returned four database-backed demo vacancies. These HTTP checks do not establish client-side interaction behavior.

Browser launch was rejected by this session's execution approval policy, so screenshots, layout inspection, keyboard interaction, carousel controls, and mobile interactions were not verified in a browser. The Vitest UI suite remains unavailable until the declared UI dependencies are installed with `npm install`. Manually verify the menu at 360px/tablet/desktop, search and category navigation, save/login behavior, carousel buttons, reduced motion, and layout overflow. No screenshots were fabricated.

## Unified local website, dashboard, and database setup

The configured local request path is:

```text
Browser: localhost:5173
  Public website / and account dashboard /dashboard
       -> same-origin /api requests
       -> Vite development proxy
       -> FastAPI 127.0.0.1:8000
       -> MySQL/XAMPP database khmer_job_matcher
```

`frontend/.env` and `.env.example` now use `VITE_API_BASE_URL=/`. The Vite configuration proxies `/api` to port 8000 for both dev and local preview. Existing backend `.env` retains its verified XAMPP connection and private JWT secret. Nothing resets or overwrites the database. Production hosting will need its own `/api` reverse proxy or an absolute `VITE_API_BASE_URL` and matching backend CORS origin; Vite's development proxy is not production hosting.

Start MySQL in XAMPP. After the documented backend installation, migrations, seed, and frontend installation are complete, run this in PowerShell from the project root:

```powershell
.\scripts\Start-Local.ps1
```

The helper starts missing backend/frontend servers in hidden background processes, saves logs in ignored `.local-run/`, and checks an actual job query through both FastAPI and the website proxy. It does not install dependencies, run migrations, reset databases, or change Windows security policy. If your organization blocks PowerShell scripts, use the separate Python/npm commands already documented; do not bypass that policy. Existing servers are reused. The helper's syntax was validated but the process-launch path was not executed in this session.

Verified in this session: `http://localhost:5173/api/jobs` returned four database-backed vacancies. The public job site and authenticated job dashboard continue to use the same API/account data.

## Premium Smart Home frontend concept

Open `http://localhost:5173/smart-home`. It is a separate frontend concept linked from the public footer as **Dashboard design demo**. Existing job-account routes and database data remain available. No reference screenshot was attached, so the detailed written design brief defines the layout.

Implemented: lavender page and rounded shell, purple icon sidebar, search/profile/notification header, original SVG woman-and-dog illustration and family avatars, synchronized refrigerator/device switches, three rooms with independent 16–30°C targets, on/off temperature control with an SVG dial and range/drag/plus/minus inputs, status filtering, member profiles, settings, simulated security controls, power-period selection, monthly inspection, and detail dialogs. Desktop uses sidebar/main/right-panel columns; tablet stacks the right panel; mobile uses a bottom navigation rail. Preferences and all Smart Home controls are React state and reset on refresh. Weather and power usage are illustrative; this is not a real home-control system.

Structure:

```text
frontend/src/smart-home/
  SmartHomeDashboard.jsx          # Shared state and page composition
  smart-home.css                 # Scoped Tailwind/CSS design and breakpoints
  components/
    Sidebar.jsx, Header.jsx, WelcomeBanner.jsx
    DeviceToggle.jsx, DeviceCard.jsx, DeviceOverview.jsx
    TemperatureControl.jsx, MyDevices.jsx, FamilyMembers.jsx
    PowerChart.jsx, RechartsPowerChart.jsx, SvgPowerChart.jsx
    Avatar.jsx, Modal.jsx
  data/devices.js, members.js, chartData.js
```

The sidebar links to `/smart-home/devices`, `/smart-home/security`, `/smart-home/rooms`, `/smart-home/members`, and `/smart-home/analytics`. **Sign out** in the sidebar/profile menu calls the existing account logout API, clears the in-memory session, and returns to login. The website link returns to the public site without signing out. Device status is shared between overview/right-panel cards, and the Living Room temperature switch is synchronized with its device card. Other rooms keep independent target/power state. Search matches device names or rooms. Simulated energy data does not claim to change with device switches.

### Install and run

The existing Vite/React/Tailwind setup is reused rather than generating a second project. Recharts is declared in `frontend/package.json`. Package downloads were blocked by network permissions, so it could not be installed here. To keep the application usable, the Vite alias selects the working SVG chart when Recharts is missing; after installation and a Vite restart, it selects the Recharts implementation automatically. Recharts uses its documented [AreaChart API](https://recharts.github.io/en-US/api/AreaChart/). Do not use `npm ci` until `npm install` refreshes the lockfile for the declared dependencies.

```powershell
cd frontend
npm install
npm run dev
# In a separate terminal:
npm test
npm run test:smart-home
npm run test:ui
npm run lint
npm run build
```

Plus Jakarta Sans loads from Google Fonts when reachable, with system font fallbacks. All device/member/weather/chart content is deliberately mock data. No Smart Home database schema or persistence has been added: the pending choice is whether to apply the premium dashboard style to job-portal data, or build a separate database-backed Smart Home product. Existing job website/dashboard/MySQL integration is configured and verified independently.

### Verification

All 16 Node tests passed, including device state identity, search/status filters, temperature limits, independent room defaults, chart periods, and existing catalog/API tests. An SSR smoke check rendered all six Smart Home routes successfully. Production build and lint passed. JSX interaction tests were added for switch synchronization, room control, search, and chart period selection, but the Vitest UI suite could not execute because its dependencies are not installed. Browser launch remains blocked by this session's execution policy; visual layout, pointer dragging, dialogs, focus handling, and mobile interactions need a real browser check. The Recharts renderer is unverified until its package is installed; the successful build and SSR checks used the SVG fallback.


### Dashboard login requirement

All account routes, including every `/smart-home/*` page, now require the existing FastAPI/JWT login. One AuthProvider wraps both the public website and dashboard routes, so navigation retains the current in-memory session. Guests are redirected to `/login?next=...`; successful login or registration returns to the requested private route. Login/register links preserve that destination, and only known internal paths are accepted (external URLs and login loops fall back to `/dashboard`). A regular login without `next` still opens the job-account dashboard. Refresh requires a new login by the existing token-storage design.

This login gate does not turn illustrative device/member/weather data into database records. Existing job profiles and saved jobs remain API-backed. Validation after the change: production build, lint, all 18 Node tests, and ten SSR route-render checks passed. Guest/authenticated routing interaction tests were added but remain unexecuted until the Vitest dependencies are installed.

## Modern authentication UI kit

The existing project now includes five authentication screens with a shared blue-and-white two-column card, a security illustration panel, responsive mobile layout, form errors, password visibility, and loading/feedback states. No screenshot was attached, so the written design brief defines the visual structure. Original SVG artwork is drawn in the components; no external illustration downloads or copyrighted screenshot assets are used.

### Open the screens

- `http://localhost:5173/login`: real login using the existing FastAPI account service.
- `http://localhost:5173/register`: real student registration and sign-in.
- `http://localhost:5173/login?demo=1`: preview login validation without creating a session or accessing a protected dashboard.
- `http://localhost:5173/register?demo=1`: preview registration without creating a real account.
- `http://localhost:5173/forgot-password`: clearly labeled recovery demo. Enter an email to begin the preview.
- `/verify-code`: enter the public demo code **123456** after starting recovery. It expires after five minutes and offers resend after 30 seconds.
- `/reset-password`: available as a functional preview after demo verification. Completion does not change a real password.

All page links preserve a safe `next` dashboard destination and explicit demo mode. Real login/registration use the existing shared AuthProvider and protected dashboard routes. A user already signed in is redirected from real login/register to their destination; use `?demo=1` to inspect the UI without signing out. After a deployment/HMR change, reload with Ctrl+F5 if an old page remains visible.

### Installation and startup

From the project root in PowerShell:

```powershell
cd frontend
npm install
npm run dev
```

`npm install` installs the declared `react-hook-form`, `zod`, and `axios` packages, as well as existing dependencies, and refreshes the lockfile. These packages were not present in this environment, and network package access was blocked. The Vite/Vitest `@auth-form` alias automatically uses the React Hook Form + Zod adapter when both packages are installed. Until then, a working React state-based form adapter applies the same validation rules. Restart Vite after installation. The RHF/Zod adapter and Axios package have not been executed in this session. Do not run `npm ci` until the lockfile has been refreshed.

For real login/registration, keep XAMPP MySQL and FastAPI running using the earlier instructions. `VITE_API_BASE_URL=/` sends account requests through Vite's `/api` proxy to the backend. Recovery demos work without making any account-recovery API calls.

```powershell
npm test
npm run test:routes
npm run test:ui
npm run lint
npm run build
```

### Structure and component guide

```text
frontend/
  config/auth-form-alias.js
  src/
    layouts/AuthLayout.jsx
    components/auth/
      AuthCard.jsx
      Logo.jsx
      FormInput.jsx
      PasswordInput.jsx
      PrimaryButton.jsx
      SocialLoginButtons.jsx
      AuthIllustration.jsx
      OTPInput.jsx
      PasswordStrength.jsx
      FormError.jsx
      LoadingSpinner.jsx
      AuthToast.jsx
      PolicyDialog.jsx
    pages/auth/
      Login.jsx
      Register.jsx
      ForgotPassword.jsx
      VerifyCode.jsx
      ResetPassword.jsx
    pages/Auth.jsx                    # Compatibility entry point
    hooks/
      useNativeAuthForm.js
      useRHFZodAuthForm.js
      useRecovery.js
    context/
      RecoveryContext.jsx
      recovery-context.js
    services/
      authService.js
      auth-validation.js
      auth-links.js
      auth-navigation.js
    auth.css
    App.jsx                          # Five auth routes; shared auth/recovery providers
  tests/auth-ui.test.js
  tests/auth-kit-controls.test.jsx
```

- **AuthLayout / AuthCard:** provide the page background, logo/form column, illustration column, and footer. The large illustration is hidden on smaller screens so the form stays usable.
- **FormInput / PasswordInput:** connect labels and validation errors to inputs. PasswordInput controls only visibility; it does not store passwords outside the form.
- **PrimaryButton / LoadingSpinner / FormError / AuthToast:** communicate pending actions, disable duplicate submissions, and show errors or dismissible success feedback.
- **AuthIllustration / Logo:** original SVG illustrations and branding, with phone/hand/shield art for login/register/verification and lock/key art for recovery/reset.
- **OTPInput:** six digit fields with forward focus, arrow keys, backspace, and paste support. Empty positions remain intact when a middle digit is deleted. A typed/pasted demo code does not grant access to a real account.
- **PasswordStrength:** provides a length/character-variety hint. Registration/reset enforce 12–128 characters to match the existing backend, and confirmation must match. Password values are never trimmed.
- **SocialLoginButtons:** disabled provider buttons with an explicit Coming soon notice. No OAuth flow is simulated as a real sign-in.
- **PolicyDialog:** readable development terms/privacy notices. These are not a substitute for final production service terms or recorded legal acceptance.
- **RecoveryProvider:** holds the temporary preview email, flow stage, and timestamps in memory across routes. It stores no password or authentication token. Refreshing clears the recovery preview.

The optional phone field is validated for the UI but is not persisted because the current API has no phone field. First/last names are combined into the existing `name` field and limited to 80 characters. Remember me stores only the email after successful real login; passwords and access tokens are never written to browser storage. Tokens remain in memory and refreshing requires a fresh login.

### Existing FastAPI integration and future recovery integration

`authService.register` sends exactly `{name, email, password}` to `/api/auth/register`, preserving server-side strict validation. Login continues to use AuthProvider's `/api/auth/login` and `/api/auth/me` calls; logout revokes server sessions through the existing endpoint. No database migration was introduced for these UI changes.

`createAxiosAuthService(client)` is provided for a configured Axios client when a consistent transport migration is desired. For example, initialize `axios.create({baseURL: '/'})`, pass the instance to the factory, and retain the same supported request payload. Do not put JWT secrets or any server credentials in this client.

`demoRecovery` is deliberately separate from real account actions and makes no network requests. A real recovery implementation must first add server endpoints for requesting recovery, verifying a short-lived single-use code/token, and applying a new password. Validate and rate-limit on the server, send a generic response regardless of whether the email exists, and invalidate consumed tokens. Replace the demo service and frontend stage checks with actual server-issued proof; do not treat the public demo code or client state as authorization. Never send/reset a real password through the demo methods.

### Verification and limits

Production build and lint passed. All **23 Node tests** passed, including validation boundaries, OTP editing, destination preservation, exact registration payloads, the Axios adapter contract, code expiry, and absence of network calls during demo recovery. All **13 SSR route-render checks** passed, including the five new screens. HTTP checks returned 200 for all five auth entry routes and their served modules; the existing proxied jobs API still returned four database-backed vacancies.

JSX interaction tests cover password visibility, demo login isolation, disabled social providers, OTP paste/deletion, existing login failures, and authentication gates. They remain unexecuted because Vitest/Testing Library/jsdom dependencies are not installed. Browser launch is blocked by this session's execution policy, so responsive visuals, keyboard/focus behavior, countdown interaction, and real signup/login navigation still need browser verification. Successful build/SSR checks used the native form fallback, not the uninstalled RHF/Zod adapter.

## Current account roles and application workflow

Public registration creates a normal job-seeker account (stored as the existing `student` role in the database) and its profile. The form never allows users to choose admin privileges. Login obtains the current role from `/api/auth/me`, not from a form value or URL.

- **Job seeker:** login/register defaults to `/jobs`. A safe requested job or account page is preserved. `/account` provides the account overview, `/account/profile` edits the profile, `/account/applications` lists the current user's applications, and saved jobs remain available through `/jobs?saved_only=true`.
- **Admin:** successful login always goes to `/dashboard`. Both `/dashboard` and every `/smart-home/*` route now require the admin role. The Smart Home design remains illustrative and is not job-portal analytics.
- **Employer:** login goes to `/employer/jobs` or a requested employer job-management page.

Normal users who try to open an admin dashboard are redirected to the jobs website. They see **My Account** and a sign-out action in the public navigation, rather than an admin dashboard link. Existing `/profile`, `/matcher`, and account settings remain role-protected routes; the job-seeker experience uses the public website layout.

### Apply and track

Job details now show a login-to-apply link for guests and an application action for signed-in job seekers. `POST /api/applications/{job_id}` records a submitted application using the authenticated user's ID. Repeated submissions return the same application rather than creating duplicates. `GET /api/applications` lists only the current job seeker's records with pagination and optional `job_id` filtering. Employers/admins cannot use these job-seeker write/list endpoints. Database roles continue to be enforced by FastAPI independently of frontend redirects.

The existing `applications` table is used unchanged; adding its ORM job relationship requires no migration. Demo vacancies show **Submit demo application** and explicitly state that no employer is contacted. No resume is attached and no employer email is sent by this first application workflow. Application status currently starts at `submitted`; employer status-management is future work.

### Create the first admin locally

No accounts were present in the XAMPP database during this check. Normal users can register through the website. An operator can create an admin from a terminal in `backend`:

```powershell
.\venv\Scripts\python.exe -m app.create_user --role admin --email admin@example.com
```

Choose the email you want to use before running the command. It prompts for the password without storing it in shell history. The command refuses an existing email. Do not expose admin registration publicly or promote users through the browser.

### Validation for this change

All **16 backend tests** and **24 Node frontend tests** passed, as did lint, production build, and the 13 route-render checks. Backend application tests cover successful submission, duplicate prevention, per-user isolation, persistence after logout/login, authorization, pagination, and nonexistent jobs. Frontend routing tests cover job-seeker/admin/employer destinations and attempts to use privileged next URLs. JSX tests for admin-only guards and application actions were added but remain unexecuted because UI-test dependencies are missing.

The local API was restarted with the application routes. The website proxy served the updated OpenAPI document, the existing MySQL jobs query returned four listings, the applications table exists, and an unauthenticated applications request returned 401. Browser end-to-end interaction remains unverified in this session.
