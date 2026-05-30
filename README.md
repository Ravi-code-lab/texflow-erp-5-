<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Ravi-Textile ERP

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key.
3. Run the app:
   `npm run dev`

## Project Structure

The React app source lives in `src/`:

- `src/app/` contains the application shell.
- `src/components/` contains ERP modules and screens.
- `src/modules/` contains the ERP module registry and DocType metadata.
- `src/services/`, `src/utils/`, `src/hooks/`, and `src/lib/` contain shared infrastructure.
- `src/types.ts` contains shared document/domain types.

See [docs/architecture.md](docs/architecture.md) for the ERPNext-inspired structure notes.

Current ERPNext-style layers include module registry, DocType schemas, naming-series document creation, role-based module permissions, DocType Center, Workflow Inbox, Audit Trail, and Report Builder.

The Sales Order module has also been upgraded into an ERPNext-style document workspace with list/kanban views, workflow actions, KPI cards, naming-series creation, and downstream document actions.
