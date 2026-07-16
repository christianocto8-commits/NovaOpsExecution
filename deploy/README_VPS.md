# NovaOps VPS Deployment Guide

## 1. Server prerequisites

- Ubuntu 22.04 or newer
- Docker and Docker Compose plugin installed
- Domain DNS already pointed to the VPS public IP
  - `novaops.example.com` -> VPS IP

## 2. Prepare environment

Copy the production env example and fill the real values:

```bash
cp .env.production.example .env.production
```

At minimum update:

- `APP_DOMAIN`
- `NEXT_PUBLIC_API_URL`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET_KEY`

Recommended single-domain mode:

- App: `https://your-domain.com`
- API: `https://your-domain.com/api/v1/...`
- Uploads: `https://your-domain.com/uploads/...`

## 3. Update Nginx domain template

Edit:

- `deploy/nginx/novaops.conf`

Replace:

- `novaops.example.com`

with your real domain.

## 4. Build and start services

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## 5. Create SSL certificate

Temporary start on port 80 is already handled by Nginx. After containers are running, generate LetsEncrypt certificate:

```bash
docker run --rm \
  -v $(pwd)/deploy/certbot/www:/var/www/certbot \
  -v $(pwd)/deploy/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d your-domain.com
```

Then restart Nginx:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart nginx
```

## 6. Run checks

- Frontend: `https://your-domain.com`
- API root: `https://your-domain.com/api/v1/health`
- Evidence upload path should serve files from `/uploads/evidence/...`

## 7. Update app when code changes

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Notes

- Single-domain mode is the simplest and most practical setup for initial VPS testing.
- Evidence files are stored in Docker volume `novaops_uploads_data`.
- For long-term production, consider object storage or external backup for uploads.
- Backend migrations run automatically when the API container starts.
