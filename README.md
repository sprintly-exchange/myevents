# MyEvents

A self-hosted event management app — create events, send email invitations, track RSVPs.

**Stack:** React 18 · Vite · Tailwind CSS · Express · TypeScript · Prisma · SQLite

---

## Local Development

```bash
# Install dependencies (root, server, client)
npm install

# Run both server (port 3001) and client (port 5173) concurrently
npm run dev

# Build for production
npm run build
```

---

## Deploy to Fly.io

Deployment is **manual** — triggered from the GitHub Actions UI, never on push.

### 1. Prerequisites

Install the Fly CLI and log in:

```bash
brew install flyctl   # or: curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create GitHub Environments

Go to **Settings → Environments → New environment** and create two environments:

- `production`
- `development`

### 3. Configure each environment

Open each environment and add the following secrets and variables.

#### Secrets (`Settings → Environments → <env> → Secrets`)

| Secret | Description |
|---|---|
| `FLY_API_TOKEN` | Run `fly tokens create deploy` and paste the output |
| `JWT_SECRET` | A long random string — e.g. `openssl rand -hex 32` |

#### Variables (`Settings → Environments → <env> → Variables`)

| Variable | `production` example | `development` example |
|---|---|---|
| `FLY_APP_NAME` | `myevents` | `myevents-dev` |
| `APP_URL` | `https://myevents.fly.dev` | `https://myevents-dev.fly.dev` |

> `production` and `development` can share the same `FLY_API_TOKEN` if you only have one Fly.io account.

### 4. Optionally protect the production environment

In **Settings → Environments → production**, enable **Required reviewers** and add yourself. This adds a manual approval gate before any production deploy runs.

### 5. Run the workflow

1. Go to **Actions → Deploy to Fly.io → Run workflow**
2. Select the branch to deploy
3. Choose `production` or `development` from the environment dropdown
4. Optionally override **Fly app name** or **Public URL** inline (leave blank to use the environment defaults)
5. Click **Run workflow**

The workflow will automatically:
- Create the Fly app if it doesn't exist yet
- Create a persistent 1 GB volume (`myevents_data`) for the SQLite database if missing
- Push `JWT_SECRET` and `APP_URL` as Fly secrets
- Build and rolling-deploy the Docker image via Fly's remote builder

### 6. Fly.io regions

Common regions for the `fly_region` input:

| Code | Location |
|---|---|
| `arn` | Stockholm, Sweden *(default)* |
| `cdg` | Paris, France |
| `lhr` | London, UK |
| `ams` | Amsterdam, Netherlands |
| `fra` | Frankfurt, Germany |

Full list: `fly platform regions`

### 7. Environment variables set on Fly

These are set automatically by the workflow. You can also set them manually with `fly secrets set`:

| Variable | Source |
|---|---|
| `JWT_SECRET` | GitHub secret |
| `APP_URL` | GitHub variable |
| `NODE_ENV` | `production` (set in `fly.toml`) |
| `PORT` | `3000` (set in `fly.toml`) |
| `DATABASE_URL` | `file:/app/data/myevents.db` (set in `Dockerfile`) |

---

## Default Admin Account

On first boot the database is seeded with:

- **Username:** `admin`
- **Password:** `changeme`

> Change this immediately after first login via the admin panel.

---

## SMTP / Email

SMTP settings are stored in the database and managed via **Admin → Settings**. Defaults on a fresh install:

| Setting | Default |
|---|---|
| Host | `smtp.strato.de` |
| Port | `465` (SSL/TLS) |
| User | *(set in admin panel)* |
| Password | *(set in admin panel)* |
