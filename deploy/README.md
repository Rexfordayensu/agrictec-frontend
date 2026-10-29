# Deploying AgriCtec

This folder runs the whole app on one Linux server with Docker. It starts four containers:

- **db:** PostgreSQL 17. Its data lives in the `db-data` volume.
- **api:** the FastAPI backend. It applies migrations every time it starts.
- **web:** the Next.js app.
- **caddy:** the only part reachable from the internet. It gets and renews the HTTPS
  certificate itself.

## What you need

- **A server** with at least 2 GB of RAM: building the web app needs it. A 2 GB VPS from
  DigitalOcean, Hetzner, Vultr or AWS Lightsail costs about $10–15 a month. Use Ubuntu 24.04.
- **A domain name.** Create an `A` record pointing it (and `www`, if you want it) at the
  server's IP address.
- **Open ports:** 22 (SSH), 80 and 443. Keep every other port closed.

## First deployment

1. Install Docker on the server:

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. Get the code onto the server. Clone both repositories into one folder, for example from
   your private GitHub repositories. The backend's folder must be named `agrictec-backend`,
   because that's where `docker-compose.yml` builds the API from:

   ```bash
   mkdir agrictec && cd agrictec
   git clone https://github.com/YOU/agrictec-web.git
   git clone https://github.com/YOU/agrictec-api.git agrictec-backend
   cd agrictec-web/deploy
   ```

3. Create the settings file and fill it in:

   ```bash
   cp .env.example .env
   nano .env
   ```

   - `DOMAIN` is your domain, without `https://`.
   - Generate `POSTGRES_PASSWORD` and `SECRET_KEY` with the command shown in the file.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` are your Super Admin sign-in. The API won't start
     in production without them, so the public demo admin can never exist there.
   - Leave the optional services empty for now.

4. Start everything:

   ```bash
   docker compose up -d --build
   ```

   The first build takes a few minutes. Follow it with `docker compose logs -f`.

5. Open `https://YOUR_DOMAIN`. The certificate appears within a minute once the DNS record
   has spread. Then sign in at `/admin-login` with your admin email and password.

The production database starts empty, with no demo farmers. Every farmer signs up for real.

## Updating

```bash
cd agrictec
git -C agrictec-backend pull && git -C agrictec-web pull
cd agrictec-web/deploy && docker compose up -d --build
```

Migrations run automatically when the API restarts.

## Backups

PostgreSQL holds everything. Back it up every day and keep copies **off** the server.

```bash
# Make a backup
docker compose exec -T db pg_dump -U agrictec -Fc agrictec > agrictec-$(date +%F).dump

# Restore a backup (replaces what's there): stop the app first, so nothing writes meanwhile
docker compose stop web api
docker compose exec -T db pg_restore -U agrictec -d agrictec --clean --if-exists < agrictec-2026-10-29.dump
docker compose start api web
```

To run the backup daily, add it to `crontab -e`:

```
0 2 * * * cd /root/agrictec/agrictec-web/deploy && docker compose exec -T db pg_dump -U agrictec -Fc agrictec > /root/backups/agrictec-$(date +\%F).dump
```

Your VPS provider's snapshots are a good second layer, but they aren't a replacement.

## Turning on the optional services

Add the keys to `deploy/.env`, then run `docker compose up -d` (no rebuild needed).

- **Paystack:**
  1. Start with `sk_test_...`.
  2. In the Paystack dashboard, set the webhook URL to
     `https://YOUR_DOMAIN/api/v1/payments/paystack/webhook`.
  3. Switch to `sk_live_...` once a test payment works.

  Until a key is set, farmers can only use the Free plan.
- **SMS (Arkesel), email (SMTP), Ghana Card checks (Smile ID):** see "Outside services" in
  the backend repository's README.

## Checking on it

```bash
docker compose ps            # every service should be "healthy" or "running"
docker compose logs api      # API errors
curl https://YOUR_DOMAIN/api/v1/health
```

## Notes

- **Only Caddy publishes ports.** The API and web containers can only be reached inside the
  compose network. The API believes the `X-Forwarded-For` header (for rate limits) only from
  that network, so visitors can't fake their address.
- **Changing `ADMIN_IDLE_MINUTES` needs `--build`.** The web app bakes it in at build time.
  Every other setting applies with `docker compose up -d`.
- **Another host?** Render, Railway and Fly.io can build both Dockerfiles: the backend
  repository's `Dockerfile`, and this repository's `deploy/web.Dockerfile` built from its root.
  Each repository can be its own service there. If you use them:
  - Provide PostgreSQL from the host.
  - Set the same variables the `api` service gets in `docker-compose.yml`.
  - Build the web app with `BACKEND_URL` pointing at the API's private address.
  - Set `TRUSTED_PROXIES` to the host's internal network.
