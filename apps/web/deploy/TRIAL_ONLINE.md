# NovaOps Trial Online - Fastest Path

Date: July 16, 2026

This is the recommended fastest public trial setup for NovaOps:

- Frontend: Vercel Hobby
- Backend API: Render Free Web Service
- Database: Neon Free Postgres
- Trial domain: default platform subdomains first

Example final URLs:

- Frontend: `https://novaops-web.vercel.app`
- Backend: `https://novaops-api.onrender.com`
- API base from frontend: `https://novaops-api.onrender.com`

---

## Step 1 - Push code to GitHub

You need the project in a GitHub repository before connecting Render and Vercel.

Minimum folders needed:

- `apps/web`
- `apps/api`
- `render.yaml`

---

## Step 2 - Create Neon database

1. Sign up to Neon Free.
2. Create one Postgres project.
3. Copy the connection string.

Use it as:

- `DATABASE_URL`

Recommended notes:

- Keep pooled connection string if Neon gives both pooled and direct options.
- Save the connection string safely because Render will need it.

---

## Step 3 - Deploy backend to Render

Recommended method:

1. Sign in to Render.
2. Create a new Blueprint or Web Service from the GitHub repo.
3. Use `render.yaml` from this repo.
4. Confirm the service name and deploy.

Render environment variables to fill:

- `DATABASE_URL` = Neon connection string
- `JWT_SECRET_KEY` = strong random secret
- `CORS_ORIGINS` = your Vercel URL later, for example `https://novaops-web.vercel.app`

Defaults already prepared:

- `JWT_ALGORITHM=HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES=1440`

Expected backend URL format:

- `https://novaops-api.onrender.com`

Quick backend checks after deploy:

- Open root URL and confirm API responds
- Check login endpoint from frontend later
- Check `/uploads/...` works after first evidence upload

---

## Step 4 - Deploy frontend to Vercel

1. Sign in to Vercel.
2. Import the same GitHub repo.
3. Set project root directory to `apps/web`.
4. Deploy with these environment variables:

- `NEXT_PUBLIC_API_URL=https://novaops-api.onrender.com`
- `NEXT_PUBLIC_APP_NAME=NovaOps`
- `NEXT_PUBLIC_ENV=production`

Expected frontend URL format:

- `https://novaops-web.vercel.app`

---

## Step 5 - Update backend CORS with final frontend URL

After Vercel gives the real URL:

- go back to Render
- update `CORS_ORIGINS`
- redeploy backend

Example:

```text
https://novaops-web.vercel.app
```

If you also still want local dev access, use:

```text
http://localhost:3000,http://127.0.0.1:3000,https://novaops-web.vercel.app
```

---

## Step 6 - Smoke test public trial

Run these checks in order:

1. Open frontend URL.
2. Login owner/admin.
3. Open dashboard.
4. Open settings and save one small change.
5. Create form.
6. Create task.
7. Publish task to outlet.
8. Login outlet.
9. Open assigned task.
10. Upload evidence from laptop.
11. Upload evidence from mobile.
12. Submit task.
13. Review approval from owner/admin.

---

## Step 7 - Important trial limits

### Render Free

Render pricing shows:

- Hobby workspace: `$0/mo`
- Free web service instance available
- Free Postgres has a 30-day limit, which is why this setup uses Neon instead

### Neon Free

Neon pricing states:

- Free plan: `$0`
- no time limits
- no credit card required

### Vercel Hobby

Suitable for quick public frontend trial, especially for personal and prototype use.

---

## Trial decision summary

If the goal is: "NovaOps online as fast as possible"

Use this exact order:

1. GitHub
2. Neon
3. Render backend
4. Vercel frontend
5. Update Render CORS
6. Smoke test

---

## After trial succeeds

Next upgrade path:

1. Custom domain
2. Better file storage for evidence
3. Paid backend if free sleep/cold start becomes annoying
4. Move to full VPS only after flows are stable
