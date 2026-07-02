# Frontend Architecture

The NovaOps frontend uses Next.js App Router with a feature-first architecture.

## Structure

apps/web/
- app/
- components/
- features/
- shared/
- lib/

## Key Concepts

- Dashboard layout is protected by AuthGuard.
- OutletProvider manages the active outlet context.
- EnterpriseShell provides sidebar and workspace layout.
- Shared UI components are located in shared/ui.
- Feature modules are located in features/.
