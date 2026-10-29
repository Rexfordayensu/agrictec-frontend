# AgriCtec

A farm-records, credit-score and loan-access app for farmers in Ghana, plus a Super Admin Console
that runs the platform. Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19 with the React
Compiler, TypeScript strict, Tailwind v4 and zustand, on the **AgriCtec API**: FastAPI, PostgreSQL and Python. The API is its own repository,
`agrictec-backend`. All data lives in the database; the browser keeps only UI preferences.

Clone the two repositories side by side. The deployment in `deploy/` expects this layout:

```
agrictec/
  agrictec-frontend/   this repository: the Next.js app and deploy/
  agrictec-backend/    the API
```

## Getting started

Start the API first (the backend repository's README has the details):

```bash
cd ../agrictec-backend
python -m venv .venv && .venv\Scripts\activate   # macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements-dev.txt
copy .env.example .env      # set DATABASE_URL (your PostgreSQL), and SEED_DEMO_DATA=true for the demo
alembic upgrade head
uvicorn app.main:app --reload --port 8000        # API docs: http://localhost:8000/docs
```

Then the app, in another terminal, from this repository (Node.js 20.9+, 22 recommended):

```bash
npm install
cp .env.example .env   # optional: BACKEND_URL if the API isn't on http://127.0.0.1:8000
npm run dev            # http://localhost:3000
```

The app calls `/api/v1` on its own origin and Next.js forwards it to the API (`next.config.ts`),
so the API's httpOnly session cookies belong to this site and no CORS setup is needed.

| Command                       | What it does                                         |
| ----------------------------- | ---------------------------------------------------- |
| `npm run dev`                 | Development server (Turbopack)                       |
| `npm run build` / `npm start` | Production build and server                          |
| `npm run lint`                | ESLint (React Compiler rules included)               |
| `npx tsc --noEmit`            | Type check                                           |
| `node --test tests/*.test.cjs` | The frontend's helper and component tests            |

The tests for the old localStorage services were removed. That behaviour now lives in the API
and is tested there; `tests/` keeps the suites for the pure helpers in `lib/` and the components.

## Admin Console

The console lives at **`/admin`** and has its own sign-in at **`/admin-login`**. Farmer and admin
sessions are completely separate: a farmer session never opens the console, and signing in or out
on one side never touches the other.

### Signing in (demo)

With `SEED_DEMO_DATA=true`, the API seeds a demo world when it first starts: about 60 farmers
across all 16 regions, their records and MoMo transactions, 25 loan applications, verifications,
risk flags, announcements and a team.

| Who                          | Email                         | Password                                        |
| ---------------------------- | ----------------------------- | ----------------------------------------------- |
| Super Admin (no `.env`)      | `superadmin@agrictec.app`     | `Admin@2026` — must be changed at first sign-in |
| Admin                        | `efua.asantewaa@agrictec.app` | `Team@2026`                                     |
| Support                      | `kofi.adjei@agrictec.app`     | `Team@2026`                                     |
| Analyst                      | `yaw.darko@agrictec.app`      | `Team@2026`                                     |
| Any seeded farmer (`/login`) | shown in **All Farmers**      | `Farmer@2026`                                   |

**Your own Super Admin:** set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the backend's `.env` and restart the
API. It is applied once per value, so a password you later change in the console is kept.

Five failed sign-ins lock that email for five minutes, and 30 minutes of inactivity signs an
admin out (with a two-minute warning). Both are enforced by the API.

### Roles

Every page, menu item and button is shown only to roles that may use it, and every service action
checks the permission again (`lib/admin/permissions.ts`), so hiding is never the only guard.

| Permission                                             | Analyst | Support | Admin | Super Admin |
| ------------------------------------------------------ | :-----: | :-----: | :---: | :---------: |
| Overview                                               |   ✅    |   ✅    |  ✅   |     ✅      |
| View farmers                                           |   ✅    |   ✅    |  ✅   |     ✅      |
| Farmer notes, tags, password resets                    |         |   ✅    |  ✅   |     ✅      |
| Suspend / reactivate                                   |         |         |  ✅   |     ✅      |
| Delete farmers permanently                             |         |         |       |     ✅      |
| View as farmer (read-only)                             |         |   ✅    |  ✅   |     ✅      |
| Review verifications                                   |         |   ✅    |  ✅   |     ✅      |
| View loan applications                                 |   ✅    |   ✅    |  ✅   |     ✅      |
| Move applications                                      |         |         |  ✅   |     ✅      |
| Manage lenders                                         |         |         |  ✅   |     ✅      |
| Credit rules                                           |         |         |       |     ✅      |
| Content (market, weather, crops, assistant, diagnoses) |         |         |  ✅   |     ✅      |
| Announcements                                          |         |         |  ✅   |     ✅      |
| Risk & fraud review                                    |         |   ✅    |  ✅   |     ✅      |
| Reports & exports                                      |   ✅    |         |  ✅   |     ✅      |
| Team & roles                                           |         |         |       |     ✅      |
| Audit log                                              |         |         |  ✅   |     ✅      |
| System settings, backups, danger zone                  |         |         |       |     ✅      |

A page a role can't use shows a "You don't have access to this page" screen. Nobody can demote or
disable themselves, and the last active Super Admin can never be removed.

### How the farmer app reads the platform config

The farmer app hard-codes nothing the admin controls. It reads it from the API's
`GET /api/v1/platform` snapshot, which the console's saves change:

| Admin control                                                        | Farmer app reads it through                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Credit rules (weights, bands, eligibility)                           | `platform-store` → `calculateCreditScore(…, config)`; the API scores loan applications itself           |
| Lenders (rates, limits, on/off)                                      | `lenders.service` — only active lenders are offered                                                     |
| Market prices, crops, assistant replies, diagnoses                   | `platform-store` (only reviewed, published prices reach farmers)                                        |
| Feature flags, maintenance mode, sign-ups, guest mode                | `platform-store` (menus hide, pages say "unavailable", maintenance replaces the app; the API refuses too) |
| Plans (prices, features, AI credits)                                 | `platform-store` → the plans page; the API enforces plans and spends credits                            |
| Announcements                                                        | the dashboard banner (by region and crop)                                                               |
| Loan decisions, verifications, suspensions                           | the farmer's applications timeline, verification status and sign-in check                               |

An open farmer app stays in step with the server: the API pushes a change notice over
Server-Sent Events (`GET /api/v1/events`), `use-platform-sync` reloads the stores in place (a
hidden tab catches up when it comes back), and a suspended or deleted farmer is signed out at once.

### The audit logging rule

**Every admin write is audited by the API**, in the same database transaction as the change. The
permission is checked first — if that fails, nothing runs and nothing is logged — then the change
and exactly one entry with the actor, the action, the target and the **before** and **after**
values are committed together. Sign-ins, sign-outs and password changes are logged too.

- The log is **append-only**: a database trigger refuses any edit or delete, for everyone.
- Secrets never enter it: temporary passwords, password hashes and full Ghana Card numbers are
  left out (only the masked card and its fingerprint are ever stored).
- The backend's tests check that allowed writes add exactly one entry and refused ones change nothing.

### The backend

The `agrictec-backend` repository is the server this app runs on. It authenticates every request
(httpOnly session cookies, argon2 password hashes), enforces the role matrix on every admin
endpoint, scopes every farmer request to that farmer's own data, re-checks loan eligibility and
plans server-side, and writes the audit log. `proxy.ts` only uses the session cookies for fast
redirects; the API is the real check. Its README lists every endpoint and the security model.

Weather (Open-Meteo) and the market research evidence (MoFA prices via FAO, and WFP prices) work without any keys.
Payments (Paystack), SMS (Arkesel), email (SMTP), Ghana Card checks (Smile ID) and real AI
(Claude, for the assistant and the crop doctor) switch on when their keys are set in the
backend's `.env`. Until then:
- plans use demo payments
- notifications appear only in the app
- the assistant answers from the knowledge base
- the crop doctor shows demonstration results

Password-reset codes and scheduled email reports need email, and SMS for codes by phone. See "Outside services" in the backend's README.

### Deploying

[`deploy/`](deploy/README.md) runs the app on one Linux server with Docker Compose:
PostgreSQL, the API, this app and Caddy, which provides automatic HTTPS. Its README walks
through the first deployment, updates, backups and switching on the optional services.
