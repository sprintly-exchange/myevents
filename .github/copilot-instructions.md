# Copilot Instructions

## Architecture Overview

**MyEvents** is a self-hosted event management app. Users create events, send email invitations with RSVP links, and manage guest responses. It has a plan/payment gating system and an admin panel.

**Monorepo structure** (npm workspaces):
- `server/` — Express + TypeScript API, better-sqlite3 database
- `client/` — React 18 + Vite + Tailwind CSS + shadcn/ui (Radix UI)

**Production deployment**: A single Docker container where Express serves the compiled client from `server/public/` (the Dockerfile copies `client/dist` there). In dev, server runs on `:3001` and Vite dev server runs on `:5173` with CORS configured between them.

## Dev Commands

```bash
# Root — run both server and client concurrently
npm run dev

# Server only (port 3001)
npm run dev --workspace=server

# Client only (port 5173)
npm run dev --workspace=client

# Build both
npm run build

# Production Docker
docker compose up --build
```

There are no tests.

## Key Conventions

### Server

**Authentication** is JWT stored in an HTTP-only cookie (`token`). Protect routes with `requireAuth` or `requireAdmin` from `server/src/middleware/auth.ts`. The user payload is attached to `(req as any).user`.

**Payment gating**: routes under `/api/events` (and others) return HTTP 402 if `user.payment_status !== 'paid'`. The client axios instance (`client/src/lib/axios.ts`) auto-redirects 402 responses to `/pending-payment`. Payment is manual (Swish) and approved by admins.

**Plan limits**: Use the `checkEventLimit` middleware on any route that creates a new event. It checks the user's plan `event_limit` against their active event count; `-1` means unlimited.

**Database**: `better-sqlite3` (synchronous). The singleton db instance is in `server/src/db/index.ts`. All schema and seed data is in `server/src/db/migrations.ts` — add new tables/columns there using `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Migrations run automatically on server start.

Default IDs use SQLite's `lower(hex(randomblob(8)))` — text PKs, not integers.

**Soft deletes**: Events are never hard-deleted; use `status = 'deleted'` and filter with `status != 'deleted'` in queries.

**Email templates**: HTML strings stored in the `templates` table. Template variables use double curly braces: `{{event_title}}`, `{{event_date}}`, `{{event_location}}`, `{{rsvp_url}}`, `{{sender_name}}`. Replaced at send time in `server/src/services/email.ts`. SMTP config is read from `app_settings` in the database (not env vars).

**Route files** live in `server/src/routes/`. Apply `router.use(requireAuth)` at the top to protect all routes in a file.

### Client

**Path alias**: `@/` maps to `client/src/`. Always use this for imports.

**API calls** go through the shared axios instance at `@/lib/axios.ts` (base URL `/api`, credentials included). Do not create new axios instances.

**Data fetching**: TanStack Query (`@tanstack/react-query`) for server state. Use `useQuery` / `useMutation` from TanStack Query.

**Auth state**: Use the `useAuth()` hook (from `@/hooks/useAuth`) to access `user`, `isAdmin`, `login`, `logout`, `refetch`.

**UI components**: Radix UI primitives wrapped with `cn()` (from `@/lib/utils`) using `clsx` + `tailwind-merge`. Follow the existing shadcn/ui-style component pattern in `client/src/components/ui/`.

**Multi-language support (i18n)**: The app supports English, Swedish, and Sinhala via `react-i18next`. Locale files are at `client/src/i18n/locales/en.json`, `sv.json`, and `si.json`. **Any time you add or change user-facing text in the client, you must:**
1. Add the string to **all three** locale files (`en.json`, `sv.json`, `si.json`) under an appropriate key.
2. Reference it via `const { t } = useTranslation()` and `{t('key')}` — never hardcode UI strings.
3. Brand/proper names (e.g. "MyEvents", "Swish") stay the same in all locales but must still go through `t()` using the existing `common.appName` pattern.
4. After making changes, verify all three files are in sync: every key in `en.json` must exist in `sv.json` and `si.json` (and vice versa). Run `node -e "JSON.parse(require('fs').readFileSync('client/src/i18n/locales/si.json','utf8')); console.log('valid')"` to confirm valid JSON.

**All shared TypeScript types** are in `client/src/types/index.ts`. Add new shared types there.

**Route protection**: Wrap protected pages with `<ProtectedRoute>`. For admin-only routes use `<ProtectedRoute adminOnly>`.

### Environment Variables (server)

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `dev_secret_change_me` | Must be changed in production |
| `PORT` | `3001` (dev) / `3000` (prod) | HTTP port |
| `DB_PATH` | `server/data/myevents.db` | SQLite file path |
| `APP_URL` | `http://localhost:3000` | Used to build RSVP links in emails |
| `NODE_ENV` | — | Set to `production` in Docker |

### Default Seed Data

- Admin account: `admin` / `changeme`
- Plans: Basic (5 events, 99 SEK), Pro (20 events, 199 SEK), Unlimited (-1 events, 399 SEK)
- Email templates: Elegant, Party, Corporate
