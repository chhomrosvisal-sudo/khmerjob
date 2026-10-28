# Google and Facebook sign-in

The application now implements server-side authorization-code sign-in for Google and Facebook. Real sign-in requires your own provider applications and credentials. They are not supplied with the project. Buttons are disabled until each provider's required backend settings exist. Apple sign-in remains unavailable.

## 1. Google setup

In [Google Cloud Console](https://console.cloud.google.com/), create/select your project, configure its OAuth consent screen/audience, and create an OAuth client of type **Web application**. Configure test users if your consent screen is in testing. Request only `openid`, `email`, and `profile`.

For the default local setup, register this exact authorized redirect URI:

```text
http://localhost:5173/oauth/callback
```

Put the client ID and secret privately in `backend/.env`:

```dotenv
GOOGLE_CLIENT_ID=your-web-client-id
GOOGLE_CLIENT_SECRET=your-web-client-secret
```

This implementation redirects to Google's authorization server, exchanges the code on FastAPI with the client secret and S256 PKCE verifier, and reads the protected UserInfo endpoint. It requires a provider-verified email. It does not accept an email or provider ID asserted by browser JavaScript.

References: [Google web-server authorization flow](https://developers.google.com/identity/protocols/oauth2/web-server) and [OpenID Connect/UserInfo](https://developers.google.com/identity/openid-connect/openid-connect).

## 2. Facebook setup

In [Meta for Developers](https://developers.facebook.com/apps/), create/select an application supporting Facebook Login. Configure the login product/use case available to your application, website origin, and valid OAuth redirect URI. For the default setup, the application's callback is also:

```text
http://localhost:5173/oauth/callback
```

Use the supported Graph API version selected in your Meta application dashboard. Set all three values privately in `backend/.env`:

```dotenv
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_GRAPH_VERSION=vXX.0
```

`vXX.0` is a placeholder, not a valid setting. Enter your actual supported version. The backend refuses malformed versions and does not guess one. Request `public_profile` and `email`. Facebook users can decline email sharing or lack an available email; the application then gives a clear error and offers email/password sign-in.

Check the current requirements shown in your Meta dashboard for test accounts, app mode, permissions/access review, business verification if applicable, privacy-policy URL, and data-deletion instructions. If the dashboard requires HTTPS for your setup, use your own HTTPS development/deployment origin and register its exact callback. This code does not provision hosting or publish your app. Development-mode access is not a substitute for configuring access for ordinary users.

The backend exchanges the code with your app credentials, validates the token's app ID and user ID using `debug_token`, and requests `/me` with app-secret proof. Provider tokens are never returned to the frontend or saved in the database.

Reference: [Meta manual Facebook Login flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/). The documentation endpoint returned HTTP 429 to this agent; verify current console labels and provider requirements in your own developer account. Live Facebook authentication has not been tested here.

## 3. Run the application

Keep existing database credentials and `JWT_SECRET`. Never put provider secrets in `frontend/.env`, source code, or chat.

```powershell
cd D:\Project_Python_y4s2\khmer-job-matcher\backend
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Restart an already running API after editing its `.env`. Start the frontend in another terminal with `cd frontend` then `npm run dev`. Open `http://localhost:5173/login` and select Google or Facebook.

`FRONTEND_ORIGIN` must be the single frontend origin used in your browser. The backend constructs the callback as `FRONTEND_ORIGIN` plus `/oauth/callback`. The default is `http://localhost:5173`. `localhost` and `127.0.0.1`, different ports, and HTTP/HTTPS are different origins; do not switch them during a flow. Deployments must serve the React application at `/oauth/callback` and use HTTPS. Vite's `/api` proxy works with the current local setup; a separate production API needs its configured API base and CORS origin.

## Accounts and security

- New social identities create normal job-seeker (`student`) accounts and profiles. Social sign-in never creates administrators or employers.
- An existing identity logs into its existing local account. The current database role and active status are enforced, including normal admin/employer routing.
- Matching an email does **not** merge accounts. If an email/password or another-provider account already exists, sign in with that existing method, open **Settings**, and connect Google/Facebook. Job seekers can reach Settings from the account navigation. This requires a valid account session before starting the connection.
- Connection preserves the local account's email, applications, saved jobs, and role. The provider account may use a different email, so connect only an account you own. An identity already attached to another user cannot be taken over. Only one identity per provider per local user is supported. Unlinking is not provided in this version.
- Five-minute, single-use OAuth transactions are stored as hashed state plus a hashed independent browser verifier. An atomic database claim rejects callback replay. Google also binds the code exchange with S256 PKCE. Linking records the initiating account's session version; logout/revocation invalidates pending linking.
- The browser keeps only the short-lived pending transaction in tab-scoped session storage. It clears that state on callback, removes the callback query from browser history, and keeps application access tokens only in memory. Refreshing after login still requires sign-in again. Denied permission, expired state, missing email, provider errors, and unavailable configuration have explicit error states.
- Provider access/refresh tokens are not stored. Social-only accounts have an unguessable random password hash; no password is shown or emailed. They can use configured password recovery to set an email/password credential later.
- Migration `0005` adds `social_identities` and `oauth_flows` only. Existing user/job/application data is preserved. Expired OAuth transactions are cleaned when another flow starts.

## API and verification

| Endpoint | Purpose |
|---|---|
| `GET /api/auth/social/providers` | Public enabled/disabled flags; never exposes keys |
| `POST /api/auth/social/{provider}/start` | Public start; JSON `{ "verifier": "43+ URL-safe random characters" }` |
| `POST /api/auth/social/{provider}/link` | Same body, authenticated account connection |
| `POST /api/auth/social/{provider}/complete` | JSON `state`, `code`, `verifier`; returns the normal short-lived application JWT |
| `GET /api/auth/social/connections` | Authenticated list of connected provider names |

Run backend tests with `python -m pytest -q` using the venv and frontend logic tests with `npm test`. Provider HTTP responses are mocked in backend tests. Tests cover browser binding, expiry/replay, provider mismatch, missing/unverified email, token app/user validation, collisions, deliberate linking, cross-account isolation, preserved roles, disabled accounts, and logout invalidation. Frontend tests cover tab state, cancellation, safe redirects, single callback consumption, and authenticated connection paths.

No live Google or Facebook login is claimed until actual app credentials, provider access settings, and browser-based sign-in have been configured and exercised.
