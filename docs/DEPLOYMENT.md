# Deployment Runbook — The Support Hub

## Stack overview

| Service | Description |
|---|---|
| `db` | PostgreSQL 16 (internal only, no host port binding) |
| `api` | Node 22 / Fastify REST API on port 3001 |
| `migrate` | One-shot migration runner — exits 0 when done |
| `web` | Vite/React frontend served by nginx on port 80 |

Hosted on **Coolify** (self-hosted PaaS) behind **Cloudflare** proxy. Traefik handles internal routing.

---

## Coolify configuration

### Platform: Docker Compose

Set **Build Pack** to `Docker Compose` and **Docker Compose Location** to:

```
./docker-compose.yaml
```

> **Critical:** the file must be `.yaml` not `.yml`. Coolify's default expectation is `.yaml` and will throw "Docker Compose file not found" if it can't find it.

---

### Domain configuration

| Service | Domain field | Value |
|---|---|---|
| `web` | Domains for web | `http://the-support-hub.chattoweb.com` |
| `api` | Domains for api | *(leave blank — not publicly exposed)* |
| `migrate` | Domains for migrate | *(leave blank — one-shot job)* |

**Use `http://`, not `https://`.** Cloudflare terminates SSL before traffic reaches Traefik. If you configure `https://` in Coolify, Traefik will attempt Let's Encrypt certificate provisioning but the ACME HTTP-01 challenge will be intercepted by Cloudflare and never reach the server — resulting in a perpetual browser SSL error even though deployment succeeds.

Cloudflare proxy (orange cloud) handles the HTTPS → HTTP leg automatically.

---

### Environment variables

Set these in **Environment Variables** → uncheck **"Available at Buildtime"** for all of them. They are runtime-only.

| Variable | Value | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | *(your password)* | Used by api and db services |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Claude API key for the chat agent |
| `CORS_ORIGIN` | `https://the-support-hub.chattoweb.com` | Must match the public URL |
| `NODE_ENV` | `production` | **Must uncheck "Available at Buildtime"** — if passed as a build arg it causes npm ci to skip devDependencies and the TypeScript build fails |

`POSTGRES_DB` and `POSTGRES_USER` default to `supporthub` via compose fallbacks — only set them if you want different values.

---

### Build args

Coolify passes all environment variables as Docker build args by default. This causes a problem: `NODE_ENV=production` as a build arg tells npm to skip devDependencies, so `tsc` isn't installed and the build fails.

**Fix applied in Dockerfiles:** both `api/Dockerfile` and the root `Dockerfile` explicitly set `ENV NODE_ENV=development` in their build stages. This overrides the build arg at the layer level before `npm ci` runs. The runtime stage then re-sets `ENV NODE_ENV=production`.

Coolify will show a warning about `NODE_ENV=production` at buildtime — this is expected and harmless given the Dockerfile override.

---

## Docker notes

### Port binding

Containers use `expose:` not `ports:`. Coolify's Traefik proxy runs on the host and owns port 80/443. Binding `80:80` in compose conflicts with Traefik and causes "port already allocated" errors.

```yaml
# WRONG — conflicts with Traefik
ports:
  - "80:80"

# CORRECT — internal only, Traefik routes from outside
expose:
  - "80"
```

### Variable syntax

Use `:-default` soft fallbacks, not `:?error` hard-fail validation:

```yaml
# WRONG — fails if Coolify doesn't pass the var at runtime
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}

# CORRECT — falls back to default if unset
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-supporthub}
```

---

## TypeScript build notes

### devDependencies at build time

`npm ci` in a Node image skips devDependencies when `NODE_ENV=production`. Since `typescript` and `tsc` are devDependencies, the build stage needs `NODE_ENV=development` explicitly set before the install step.

### tsconfig exclude

The `api/tsconfig.json` must exclude test files explicitly, otherwise TypeScript picks them up via glob and fails with TS6059 (file outside rootDir) because test files import from a `tests/` directory outside `src/`:

```json
"exclude": ["node_modules", "dist", "**/*.test.ts", "tests/**"]
```

### FastifyError typing

With `strict: true`, the `setErrorHandler` callback's `error` parameter must be explicitly typed:

```typescript
import Fastify, { type FastifyError } from "fastify";

fastify.setErrorHandler((error: FastifyError, _request, reply) => {
  ...
});
```

---

## Vite API URL

`VITE_API_URL` is baked into the JS bundle at build time by Vite. It must be passed as a Docker build arg, not a runtime env var.

The root `Dockerfile` handles this:

```dockerfile
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
```

If not set, the frontend defaults to `http://localhost:3001` (fine for local dev, not for production). Set `VITE_API_URL` in Coolify environment variables **with** "Available at Buildtime" checked for this one.

---

## Migration

The `migrate` service runs `node -e "import('./dist/db/migrate.js')"` as a one-shot job (`restart: "no"`). It depends on `db` being healthy before starting. It exits 0 on success — Coolify treats this as "Finished" which is correct.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Docker Compose file not found" | File named `.yml` not `.yaml` | `git mv docker-compose.yml docker-compose.yaml` |
| Build exits 127 — `tsc: not found` | `NODE_ENV=production` build arg skips devDeps | Add `ENV NODE_ENV=development` in Dockerfile build stage |
| TS6059 — file outside rootDir | Test files included in tsc compile | Add `"**/*.test.ts", "tests/**"` to tsconfig `exclude` |
| TS18046 — error is of type unknown | `setErrorHandler` callback untyped | Import `FastifyError` and annotate the parameter |
| Port 80 already allocated | `ports: "80:80"` conflicts with Traefik | Replace with `expose: "80"` |
| POSTGRES_PASSWORD not set at runtime | `:?` hard-fail syntax | Use `:-supporthub` soft default |
| SSL browser error / ERR_SSL_PROTOCOL_ERROR | `https://` domain in Coolify — Let's Encrypt vs Cloudflare conflict | Set domain to `http://` in Coolify; Cloudflare handles SSL |
| API stays unhealthy | DB connection fails — POSTGRES_PASSWORD not in env vars | Add env vars in Coolify, uncheck "Available at Buildtime", redeploy |

---

## Git push limitation

`git push` via scripted contexts (osascript, etc.) requires macOS Keychain access and will fail silently or with auth errors. All pushes must be run manually in Terminal:

```bash
git -C '/path/to/repo' push origin main
```

---

## Commit history (deployment work)

| Commit | Description |
|---|---|
| `a373205` | Rename docker-compose.yml → .yaml; fix port conflicts; add soft env var fallbacks |
| `c578f65` | Fix NODE_ENV build arg issue — add ENV NODE_ENV=development to build stages |
| `3532c3a` | Fix TS6059 (test files in rootDir) and TS18046 (FastifyError typing) |
| `ab37a06` | Remove host port bindings; fix POSTGRES_PASSWORD soft default |
