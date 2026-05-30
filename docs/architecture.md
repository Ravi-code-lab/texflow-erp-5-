# TexFlow ERP Structure

This project now follows an ERPNext-inspired source layout: one application shell, business screens grouped as ERP modules, and shared infrastructure kept separate from feature code.

## Layout

```text
src/
  app/          Application shell and view composition
  components/   ERP module screens and reusable UI components
  hooks/        React hooks
  lib/          Shared library helpers
  modules/      ERP module registry and DocType metadata
  services/     External service integrations
  utils/        Local storage, network, export, and image utilities
  main.tsx      Browser entry point
  types.ts      Shared domain types and document models
```

Root-level files such as `package.json`, `vite.config.ts`, `electron/`, and `assets/` stay outside `src/` because they are build/runtime configuration rather than app source.

## Module Direction

ERPNext keeps business areas as modules with explicit document models and workflows. For TexFlow, new ERP features should follow the same direction:

- Put user-facing screens in `src/components/` until a domain grows large enough for its own folder.
- Register every new screen in `src/modules/registry.ts`.
- Add document model metadata in `src/modules/doctypes.ts` when the screen manages a business document.
- Use `src/modules/documentEngine.ts` when creating new ERP documents so naming series, `doctype`, and `docstatus` stay consistent.
- Update `src/modules/permissions.ts` when a module should be visible or hidden for a role.
- Keep shared document types in `src/types.ts`.
- Keep persistence and integration code in `src/utils/` or `src/services/`.
- Avoid adding new business logic directly to `src/main.tsx`; use `src/app/App.tsx` or a feature component.

When a module becomes large, split it into a folder such as:

```text
src/components/purchase/
  PurchaseOrder.tsx
  PurchaseInward.tsx
  PurchaseReturn.tsx
  index.ts
```

The `index.ts` file should export that domain's screens so app-level imports stay clean.

## ERPNext-Style Registry

Navigation and command search now read from `src/modules/registry.ts`. Each entry has:

- `id`: the app `ViewState`
- `label`: user-facing title
- `doctype`: ERP document name
- `module`: business module group
- `icon`: navigation icon
- `keywords`: optional search aliases

Business document metadata lives in `src/modules/doctypes.ts`. This keeps naming series, statuses, and key fields discoverable in one place, similar to ERPNext DocType definitions.

The Workspace module now includes a **DocType Center** desk. It reads DocType schemas, module registry entries, workflow definitions, role permissions, and live collection counts to provide an ERPNext-style meta view of the system.

The Workspace module also includes a **Workflow Inbox**. It reads `src/modules/workflows.ts`, gathers live documents from workflow-enabled modules, and lets permitted users advance records through submit/confirm/receive/cancel actions from one central desk.

The Workspace module also includes a **Report Builder**. It reads DocType schemas and live collections, lets users choose columns and filters, saves report views to local storage, and exports CSV files. This mirrors ERPNext's user-configurable query/report desk direction without requiring a custom React screen for every report.

## Upgraded ERP Modules

`src/components/SalesOrder.tsx` is now the first module upgraded toward an ERPNext-style document workspace. It combines list view, kanban pipeline, KPI number cards, naming-series document creation, workflow action buttons from `src/modules/workflows.ts`, and one-click downstream document actions for Delivery Note, Sales Invoice, and Work Order.

## Document Engine

`src/modules/documentEngine.ts` provides the first ERPNext-style document behavior:

- naming-series generation such as `SO-2026-0001`
- automatic `doctype` and `namingSeries` stamping
- ERP-style `docstatus` values:
  - `0`: draft/open
  - `1`: submitted/completed
  - `2`: cancelled

App-level document conversions now use this helper for Sales Orders, Work Orders, Job Cards, Material Requests, and Purchase Orders.

## Document Lifecycle And Audit Trail

`src/modules/documentLifecycle.ts` now powers the shared collection layer in `src/app/App.tsx`.
Every module that uses the common add/update/upsert/delete handlers receives:

- `createdAt`, `updatedAt`, `updatedBy`, and incrementing `version`
- ERP-style `docstatus` recalculation from the document status
- soft-delete cancellation behavior
- Version-style audit logs stored in `auditLogs`

The Workspace module includes an **Audit Trail** screen that exposes these Version entries with search and action filters. Audit logging can be controlled from advanced settings with `enableAuditLogs` and `auditLogRetentionDays`.

## Role Permissions

`src/modules/permissions.ts` defines which roles can read/write/submit/cancel each module group. Sidebar navigation and command search use this matrix, which moves the app closer to ERPNext's role-based desk experience.
