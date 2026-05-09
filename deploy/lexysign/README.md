# LexySign Hetzner Deployment Prep

## Current target

- Host: `lexy-hetzner-01`
- IP: `37.27.49.209`
- Public app target: `https://sign.lexyalgo.com` unless Willie chooses another hostname.
- Product: B2B LexySign — `$5/month` subscription, up to `1,000` e-signs/month via API or UI.
- Brand: LexyAlgo logo for now; Sanctuary System `Iron Amber` accent `#7A5C1E`.

## Verified VPS state — 2026-05-08

- Ubuntu `24.04.4 LTS`.
- Docker `29.4.3`, Docker Compose `v5.1.3`.
- RAID arrays clean: `[UU]`, no resync line.
- Disk: `/dev/md2` 436G total, 333G available, 20% used.
- Memory: 62Gi total, 61Gi available.
- Firewall: UFW active; only SSH/80/443 open.
- Existing containers: LexyCorpus Postgres/Qdrant/Meili bound to `127.0.0.1`; no public reverse proxy conflict observed.

## Repo state

- Repo: `https://github.com/peacockesq/peacock-sign`
- Base branch: `staging`
- Prep branch: `lexysign-hetzner-prep`

## Prepared files

- `apps/OpenSign/Dockerfile.lexysign` — builds the LexySign React client from this fork, not upstream OpenSign images.
- `apps/OpenSignServer/Dockerfile.lexysign` — builds the customized server from this fork.
- `deploy/lexysign/docker-compose.yml` — self-contained Mongo + server + client + Caddy stack.
- `deploy/lexysign/Caddyfile` — routes `/api/*` to server and everything else to client.
- `deploy/lexysign/.env.example` — no real secrets.
- `deploy/lexysign/lexysign-generate-env.sh` — generates `.env`, random `MASTER_KEY`, and a throwaway P12 for smoke tests.

## Deploy runbook

On local machine:

```bash
cd /Users/bot/work/peacock-sign
git status --short --branch
git push -u origin lexysign-hetzner-prep
```

On Hetzner:

```bash
ssh -i /Users/bot/.ssh/id_ed25519_hostinger root@37.27.49.209
mkdir -p /opt/lexysign
cd /opt/lexysign
git clone --branch lexysign-hetzner-prep https://github.com/peacockesq/peacock-sign.git .
cd deploy/lexysign
HOST_URL=https://sign.lexyalgo.com bash ./lexysign-generate-env.sh
# edit .env for SMTP before any real users
# point DNS A record for sign.lexyalgo.com -> 37.27.49.209 before Caddy certificate issuance
docker compose up -d --build
```

Verification:

```bash
docker compose ps
docker compose logs --tail=200 server client caddy
curl -I https://sign.lexyalgo.com
curl -fsSL https://sign.lexyalgo.com/api/app/health || true
```

Then browser proof:

1. Load public URL.
2. Bootstrap/admin login.
3. Upload PDF.
4. Place signer fields.
5. Send signing request.
6. Complete signer flow.
7. Download signed PDF and certificate/audit trail.
8. Confirm API-created document path works.

## Blockers before public launch

1. DNS for `sign.lexyalgo.com` must point at `37.27.49.209`, or pick a different hostname.
2. SMTP must be chosen/configured/tested. Mailpit/local capture is not real delivery.
3. Subscription/billing is not wired. The $5/month / 1,000-sign cap is positioning until payment + usage gating exist.
4. The generated P12 is smoke-test only. It is not an Adobe-trusted signing certificate.
5. Backups/retention/object storage need a real decision before customers rely on it.
6. AGPL obligations apply: modified source must remain available to network users.
