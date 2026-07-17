# Sprint 07 — Enterprise Backend Integration

Status: **In Progress**

## Completed in this sprint

- Mount backend routers: `reports`, `runtime-templates`, `builder-documents`, `form-submissions`
- Extend `form-templates` API with fields CRUD (GET/PATCH/DELETE + nested fields)
- Replace mock reports API with live task aggregation
- Add task review endpoint: `PATCH /api/v1/tasks/{id}/review`
- Fix frontend API paths (`/api/v1/*`) for drafts, runtime templates, reports
- Refactor task workspace to API-only (remove mock/localStorage fallback)
- Wire draft center to execution-sessions + form-templates APIs
- Forms workspace backend-first (templates CRUD + manual outlet submit via API)
- Task form drawer and task execution load templates from backend

## Remaining

- History page backend-only
- Workflow builder → builder-documents API
- Remove mock seed files after all consumers migrated
