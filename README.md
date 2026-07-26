# EventLedger AI — Web (React frontend)

React + Vite + Tailwind frontend for the EventLedger AI FastAPI backend.

## Local setup

```bash
npm install
cp .env.example .env    # then edit VITE_API_URL if needed
npm run dev
```

Runs at `http://localhost:5173`. It talks to the API at the URL in `.env`
(`VITE_API_URL`, defaults to `https://eventledger-api.onrender.com`).

## What's included

- **Auth**: register / login, JWT stored in `localStorage`, auto-logout on 401
- **Events**: create/list/delete events
- **Active event switcher**: pick one event in the sidebar; every other section
  (budget, expenses, income, vendors, sponsors, departments) scopes to it
- **Budget proposals**: line items, submit → approve/reject workflow
- **Expenses & Income**: estimated vs. actual tabs
- **Vendors & Sponsors**: contact + contract tracking (sponsor income syncs to
  actual income automatically on the backend)
- **Departments**: with color tags
- **Notifications**: mark read / mark all read
- **Users**: list, assign roles, audit log, and password reset (super admin only)

## Deploying on Vercel

1. Push this folder to the `eventledger-web` GitHub repo.
2. In Vercel: **New Project → Import** the repo. Vercel auto-detects Vite.
3. Add an environment variable:
   ```
   VITE_API_URL = https://eventledger-api.onrender.com
   ```
4. Deploy. Vercel runs `npm run build` and serves `dist/`.

### CORS note
The FastAPI backend currently allows all origins (`allow_origins=["*"]`), so no
backend changes are needed for the Vercel domain to work.

## Project structure

```
src/
  api/          one file per backend router (auth, events, budget, ...)
  context/      AuthContext (session) + EventContext (active event switcher)
  components/   Layout, ProtectedRoute, RequireActiveEvent, StatCard, SimpleResourcePage
  pages/        one page per nav item
```
