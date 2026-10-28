# Delivery status

The core local recruitment workflows are implemented. This document distinguishes executed checks from code that still needs its dependencies or external configuration. It is not a claim of 100% production readiness.

## Verified locally

| Check | Result |
|---|---|
| Backend API/workflow suite | 36 tests passed; 1 optional scikit-learn parity test skipped |
| Node API/logic tests | 37 tests passed |
| Server-side route rendering | 25 page checks passed |
| Frontend production build | Passed |
| Frontend lint | Passed |
| MySQL migrations | Applied through `0005`, incremental |
| Existing sample records | Four jobs and four companies preserved |
| Private upload storage | 5 MB MySQL chunk round-trip passed with 1 MB packet setting; test transaction rolled back |
| Migration up/down | Passed against disposable SQLite |
| Live local API/proxy | Job/company reads passed |
| ML model | Built-in TF-IDF trained on four public jobs; 990 learned features; signed artifact saved |
| ML evaluation | Two synthetic profiles evaluated; no human-label accuracy claim |
| Google/Facebook auth | Mocked provider/security tests passed; real apps/credentials not configured |
| Multilingual rendering | 39 checks across English, Khmer and Simplified Chinese |
| Browser test scripts | Syntax checked; execution pending |

Backend tests cover role enforcement, account isolation, employer approvals, publication/closure, job applications, resume ownership and employer access, attachment deletion, allowed application status transitions, notifications, matching, login throttling, reset-code verification, hashed single-use reset tokens, replay rejection, and revocation of old sessions.

## Still required before calling the release complete

1. **Install the declared packages from a network-enabled terminal.** Package downloads are blocked in this agent environment. `pip install -r backend/requirements.txt` installs scikit-learn/pandas/PyMuPDF; `npm install` installs React Hook Form/Zod/Axios/Recharts and the UI/browser test tools. Refresh the package lock. The working built-in TF-IDF and native form/SVG-chart fallbacks were used here; the optional library branches still need verification.
2. **Run real browser checks.** This session's approval policy rejected browser launch. `npm run test:ui` and `npm run test:e2e` are supplied, but have not run. Check mobile/tablet/desktop layout, keyboard focus, dialogs, form navigation, and account-to-application flow. No captured screenshots are claimed.
3. **Configure SMTP when ready.** You explicitly chose documentation instead of providing a mail service. Recovery remains unavailable by default and does not claim to send email. The complete backend flow was tested using a captured mailer, not a real provider.
4. **Validate PDF uploads after installing PyMuPDF.** Text resumes, upload bounds, chunk storage, private access, deletion, and attachment ownership were tested. The PDF parser branch is implemented but could not execute without the package. Scanned-image OCR is explicitly unsupported.
5. **Evaluate recommendation quality using human labels.** The matching formula, ranges, aliases, Khmer character comparison, and a controlled expected ranking are tested. There is no claimed real-world accuracy or hiring probability.
6. **Review localization before public launch.** English, Khmer, and Simplified Chinese interface catalogs are implemented across the website and dashboards. Job/company content remains in the author's language; unknown service messages fall back to their original language. Native-speaker review and interactive layout verification are still needed.
7. **Public deployment remains a separate delivery step.** Configure production HTTPS, a production database/application user, secrets, a reverse proxy, backups/retention, final service terms, and provider accounts. The project currently runs locally. Google/Facebook OAuth code is implemented; real provider login needs app credentials and browser verification. Apple sign-in stays disabled.

## Run the remaining checks

```powershell
# From the project root:
.\backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd frontend
npm install
npm run test:ui
npx playwright install chromium
$env:E2E_PYTHON = (Resolve-Path ..\backend\venv\Scripts\python.exe).Path
npm run test:e2e
```

The browser checks use an isolated SQLite database and ports 5175/8011. They do not reuse the normal MySQL-backed servers. CI is defined in `.github/workflows/checks.yml`; the workflow has not been pushed or run in this session.
