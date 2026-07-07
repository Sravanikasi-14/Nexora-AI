# Nexora — AI Chief Growth Officer for SMBs

A working full-stack MVP implementing the product spec: AI Business Discovery → gated Business Assessment →
Dashboard → Customers → AI Chat → Growth Missions → Insights → Automation → Settings, backed by a 7-agent
pipeline (Discovery → Memory → Digital Presence → Growth → Insight → Automation → Strategy) where **only the
Strategy Agent talks to the frontend**.

Core philosophy enforced in code, not just prompts: `discoveryAgent.hasEnoughDataForAssessment()` gates every
score/insight/chart. If there's no digital presence, no customer data, and no sales data, the API returns
`hasEnoughData: false` with an explanation — it never fabricates a Growth Score.

```
nexora/
├── backend/     Express + TypeScript + Prisma (SQLite) + the 7 agents
└── frontend/    Next.js 14 (App Router) + Tailwind
```

---

## 1. Prerequisites

- Node.js 18+ and npm (check with `node -v`)
- That's it — the database is local SQLite (zero external setup), and AI Chat/narratives work with
  deterministic templates even with **no API key**.

## 2. Setup — run these in Cursor's terminal

Open the `nexora` folder in Cursor, then open **two terminals** (Terminal → Split Terminal).

### Terminal 1 — Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

You should see:
```
Nexora backend running on http://localhost:4000
AI (Anthropic) enabled: false
```

### Optional — load demo data instantly

Instead of manually clicking through Discovery, seed a fully populated demo business (8 customers, purchase
history, products, a completed assessment, missions, and insights already generated) in one command:

```bash
cd backend
npm run seed
```

Then sign in at `http://localhost:3000/login` with:
```
Email:    demo@nexora.ai
Password: demo1234
```
This drops you straight into a live Dashboard/Customers/Insights/Missions — useful for debugging the UI without
re-doing Discovery every time. Safe to re-run; it wipes and recreates only the `demo@nexora.ai` account.

Optional — to upgrade AI Chat, Insights, and Automation drafts from deterministic templates to Claude-generated
language (still strictly grounded in your data, never hallucinated numbers): open `backend/.env` and set
`ANTHROPIC_API_KEY=sk-ant-...`, then restart `npm run dev`.

### Terminal 2 — Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Visit **http://localhost:3000**.

---

## 3. Using it

1. Landing page → **Get started** → create an account
2. You're dropped into **AI Business Discovery** (only Business Name + Industry are required — skip everything else)
3. Optionally upload a customer CSV (`name, phone, email, notes`), a sales/invoice CSV
   (`customer_name, amount, product, date`), or a product CSV (`name, price, units_sold`) on the "Import your data" step
4. Finishing Discovery triggers the **Business Assessment** — if you skipped digital presence, customers, and
   sales entirely, you'll see the honest "not enough information" screen instead of a fake score
5. **Dashboard**, **Customers**, **AI Chat**, **Growth Missions**, **Insights**, **Automation**, **Settings** all
   become available from the sidebar

---

## 4. Common issues in Cursor

| Symptom | Fix |
|---|---|
| `prisma generate` fails to download engine | Needs outbound internet to `binaries.prisma.sh`; check your network/firewall, then retry |
| `EADDRINUSE: 4000` | Another process is using the port — change `PORT` in `backend/.env`, and update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to match |
| Frontend shows network errors / can't sign in | Backend isn't running, or `NEXT_PUBLIC_API_URL` doesn't match the backend port |
| CORS error in browser console | Set `CLIENT_ORIGIN` in `backend/.env` to your frontend's exact origin (default already matches `localhost:3000`) |
| `npx prisma migrate dev` asks to reset | Safe to accept in local dev — it's a fresh SQLite file at `backend/prisma/dev.db` (actual path from `DATABASE_URL`) |
| TypeScript errors mentioning `Business`/`Customer`/`Sale` not exported from `@prisma/client` | You skipped `npx prisma generate` — run it, this regenerates the typed client from `schema.prisma` |

Useful extra commands (run from `backend/`):
```bash
npx prisma studio        # visual DB browser at http://localhost:5555
npx prisma migrate reset # wipe and recreate the local database
```

---

## 5. Architecture notes

- **Agents** live in `backend/src/agents/*`. Each is a pure/service module the `strategyAgent` orchestrates —
  swap or extend any one (e.g. plug real Google Business / Instagram APIs into `digitalPresenceAgent`) without
  touching routes or frontend.
- **No hallucination by design**: `growthAgent` and `digitalPresenceAgent` are deterministic, computed only from
  what's in the database. Anthropic (`services/anthropic.ts`) is only used to *rephrase* those same grounded
  facts into more natural language for Insights/Chat/Automation — and every call falls back to a template if no
  API key is set or the call fails.
- **Automation never auto-sends**: `automationDraft` rows are always created with `status: "draft"`; the owner
  must explicitly approve in the UI.
