# ADR 0001 — Folder Structure

## Decision

NovaOps uses a feature-first frontend architecture and modular backend architecture.

## Frontend

- app/ for routes
- features/ for business modules
- shared/ui/ for reusable design system components
- lib/ for infrastructure utilities

## Reason

This keeps enterprise modules isolated, scalable, and easier to maintain as NovaOps grows.
