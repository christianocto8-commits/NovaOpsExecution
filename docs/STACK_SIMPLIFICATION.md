# NovaOps Stack Simplification

NovaOps is organized around five operational stacks:

1. Web app: Next.js, React, TypeScript, Tailwind CSS.
2. API app: FastAPI Python.
3. Database: PostgreSQL with SQLAlchemy and Alembic.
4. Background jobs: VPS systemd timer calling one API job endpoint.
5. Deployment: VPS Linux, Nginx, systemd, and `scripts/deploy-vps-live.ps1`.

## Scheduler Model

Daily background work should enter through:

`POST /api/v1/jobs/process`

That endpoint orchestrates:

- recurring task auto-publish
- overdue task alerts and expiry
- due-soon task alerts
- compliance digest delivery

Legacy scheduler endpoints remain available for manual diagnostics and backward compatibility, but production scheduling should use the unified jobs endpoint.

## What Stays Optional

Enterprise SSO, SMS/email providers, push notifications, and mobile Capacitor packaging remain optional extensions around the core stack. Avoid adding Redis, Celery, queues, or microservices until there is a clear operational need.
