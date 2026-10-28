# AI Agent Instructions — Khmer Job & Skills Matcher

## Mission
Build a production-minded, beginner-maintainable **Khmer Job & Skills Matcher** for Cambodian students and fresh graduates. Use **React + Vite + Tailwind CSS v4** for the frontend, **Python FastAPI** for the REST API, **MySQL** for persistence, and **scikit-learn** for an explainable job-matching baseline. The product should support Khmer and English content.

## How to work
1. Inspect the existing repository before changing files. Preserve working code and follow established conventions. If the project already has a `frontend/`, extend it instead of recreating it.
2. Implement in small, verifiable milestones. After each milestone, run applicable checks, fix failures, and report what changed.
3. Do not claim that a feature works unless it has been tested. Never invent live jobs, real employers, match accuracy, or API results. Label demo data clearly.
4. Use environment variables for configuration. Do not commit secrets, `.env`, virtual environments, `node_modules`, or uploaded CVs.
5. Prefer straightforward, readable code with clear file names and short comments for non-obvious logic. Explain commands and decisions for a beginner.
6. Do not stop after creating a mockup: deliver working code, navigation, API integration, migrations, and basic tests. If blocked, state the blocker and provide the next executable step.

## Stack
- Frontend: React (JavaScript), Vite, Tailwind CSS v4 (`@tailwindcss/vite`), React Router, lucide-react, Recharts, native `fetch` or Axios (choose one consistently).
- Backend: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, PyMySQL, Uvicorn.
- Database: MySQL 8.x (or compatible MySQL installation).
- ML: scikit-learn TF-IDF + cosine similarity as an initial baseline; add Khmer-aware normalization/tokenization where feasible and document limitations. Do not imply that word-level English TF-IDF fully understands Khmer.
- Auth: secure password hashing, JWT bearer tokens, role-based access (student, employer, admin).
- Testing: Vitest + React Testing Library for critical UI, pytest + FastAPI TestClient for backend, and an integration smoke test.

## Expected repository structure
```text
khmer-job-matcher/
├── frontend/
│   ├── src/
│   │   ├── components/   # Sidebar, Navbar, StatCard, JobCard, etc.
│   │   ├── layouts/      # DashboardLayout
│   │   ├── pages/        # Dashboard, Jobs, SkillMatcher, Profile, Settings, Auth
│   │   ├── services/     # API client and endpoint functions
│   │   ├── hooks/
│   │   ├── data/         # Clearly labeled demo data, only as fallback
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   └── vite.config.js
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/         # config, security
│   │   ├── db/           # session, base
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   └── ml/
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── README.md
└── AGENT_INSTRUCTIONS.md
```

## Milestone 1 — Professional responsive frontend
Build a polished student dashboard with:
- Dark navy collapsible sidebar: Dashboard, Find Jobs, Skill Matcher, My Profile, Settings, Logout.
- Top navbar: page title, search affordance, notifications (clearly demo until implemented), avatar, mobile menu.
- Overview: welcome banner, total matched jobs, skills count, highest match percentage, saved jobs count.
- Recommended jobs: job title, fictional/demo employer, location, job type, required skills, matching percentage and progress bar, skill gaps, view details/save actions.
- Find Jobs: search by title/company, filter by location and type, empty/loading/error states, job details view.
- Skill Matcher: student skills, job requirements, matched/missing skills, explainable score, suggested learning topics.
- Profile: editable student name, education, interests, and skills; validation and save feedback.
- Settings: language selector (English/Khmer), accessible theme preference if practical.
- Responsive at 360px, tablet, and desktop; keyboard accessible, semantic labels, readable contrast, no horizontal overflow.
- Use a consistent visual system: navy sidebar, blue accent, neutral backgrounds, rounded cards, restrained shadows, Lucide icons.
- Use React Router for real navigation and reusable components. No dead buttons: implement actions or clearly mark unavailable functionality.

**Acceptance criteria:** `npm install`, `npm run dev`, and `npm run build` succeed; all routes load; mobile menu works; search and filters update visible results; profile edits work in local demo state; no console errors.

## Milestone 2 — FastAPI foundation
- Create FastAPI app with CORS restricted to configured frontend origin, `/api/health`, OpenAPI docs at `/docs`, consistent validation/errors, and router separation.
- Add SQLAlchemy database session/config and Alembic migrations.
- Create entities: `users` (role), `student_profiles`, `skills`, `student_skills`, `employers`, `jobs`, `job_skills` (required/proficiency), `saved_jobs`, `applications` (optional in first release).
- Seed realistic **fictional** sample jobs and skills, explicitly labeled as demonstration data.
- Add pagination and filtering to job listing endpoints.

**Acceptance criteria:** API starts, `/api/health` returns 200, migrations apply to an empty database, seeded jobs can be retrieved.

## Milestone 3 — Authentication and roles
- Student registration/login, password hashing, JWT verification, `/api/auth/me`.
- Employer can create/edit only their own jobs; student can edit only their own profile; admin has protected management routes.
- Validate requests server-side; avoid exposing password hashes; use safe token handling and clear logout behavior.
- Add tests for unauthorized requests and cross-user access.

## Milestone 4 — Connect React to FastAPI
- Set `VITE_API_BASE_URL=http://127.0.0.1:8000` in frontend `.env.example`.
- Replace demo jobs/profile/statistics with API-backed data while preserving loading, empty, and error states.
- Implement login, profile update, job listing/details, save/unsave jobs, and employer job creation as applicable.
- Handle network errors gracefully; never silently fall back to demo data in production mode.

## Milestone 5 — Explainable job matching
- Define a transparent initial score (for example: 70% required-skill coverage + 30% text similarity), normalize to 0–100, and document the formula. This is a **heuristic compatibility score**, not a validated probability of hiring.
- Extract and normalize skill tags; support Khmer and English aliases in a curated skills dictionary.
- Rank jobs for a student, return matched skills, missing skills, score components, and suggestions.
- Include baseline TF-IDF/cosine similarity for job descriptions and profile interests; use suitable character n-grams or a tested Khmer tokenizer for Khmer text, and document limitations.
- Evaluate with a small human-labeled test set and report ranking quality rather than unsupported accuracy claims.

Suggested endpoint:
`POST /api/match` with student skill IDs or an authenticated profile; return ranked job IDs, score, matched skills, missing skills, and explanation.

## Milestone 6 — CV upload (after core matching works)
- Accept PDF files with size/type limits, inspect actual file content, reject invalid PDFs, and avoid public storage of CVs.
- Extract text with PyMuPDF, derive candidate skills, let the user review/edit them before saving.
- For scanned PDFs, report that OCR is not yet supported rather than inventing extracted skills.
- Define retention/deletion behavior for uploaded files and avoid logging personal CV text.

## Milestone 7 — Quality and delivery
- Add tests for scoring edge cases (no skills, duplicate skills, missing requirements, Khmer text), API authorization, and UI search/filter behavior.
- Document setup on Windows 11 using PowerShell, including Node/Python versions, MySQL creation, `.env`, migrations, seed command, frontend/backend startup, and test commands.
- Add screenshots only if actually captured; never fabricate screenshots or test output.
- Provide an architecture diagram, database ERD (Mermaid is fine), API endpoint table, and known limitations.

## API contract (initial target)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Student signup |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/jobs` | Search/filter/paginate jobs |
| GET | `/api/jobs/{job_id}` | Job details |
| POST | `/api/jobs` | Employer creates job |
| GET | `/api/skills` | Skill catalog |
| GET/PATCH | `/api/students/me` | Student profile |
| POST | `/api/match` | Ranked job matches |
| POST | `/api/cv/upload` | CV parsing (later milestone) |

## Execution instructions for the AI agent
1. Inspect files and report the current state briefly.
2. Start with **Milestone 1**. Create or update the actual files, not just pseudocode.
3. Install dependencies when the environment permits; otherwise give exact commands.
4. Run build/tests, fix failures, and list results accurately.
5. At the end of each milestone, report: files changed, commands to run, features completed, tests run, remaining limitations, and the next milestone.
6. Continue to subsequent milestones when the user asks; do not replace the user's existing work or erase their database without explicit permission.

## Definition of done
The app starts locally; a student can register, manage skills, browse jobs, and see explainable job recommendations; an employer can manage their own jobs; mobile UI works; MySQL persists data; core tests pass; README allows a beginner to reproduce the setup.
