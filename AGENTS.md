# AGENTS.md

## Scope
Keep edits small; preserve behavior unless asked.

## Project Layout
- Frontend: `frontend/` (React + Vite), entrypoint `frontend/src/main.jsx`.
- Backend: `backend/` (Flask + MySQL), entrypoint `backend/app.py`.
- DB schema source of truth: `backend/database/schema.sql`.

## Required Local Setup
- Frontend: `npm install`, `npm run dev`.
- Backend: `pip install -r requirements.txt`, `python app.py`.
- Backend port: set `FLASK_PORT=5001` in `backend/.env` to avoid Windows port 5000 conflicts.
- DB bootstrap: `python -m database.rebuild_db` (destructive) then `python -m database.bootstrap_users`.

## Pipeline + Tasks Flow (Non-Obvious)
- `python -m database.sync_pipeline` tops up each branch to 20 active deals and auto-generates 1–2 tasks per new deal (Focus Queue depends on this).
- Deals/tasks are filtered by branch in the API; if a branch has no leads, its board stays empty.

## Data Shape Rules
- DB uses `snake_case`, API uses `camelCase` (map in SQL or handlers).
- Common mappings: `company_id`→`companyId`, `contact_id`→`contactId`, `deal_id`→`dealId`, `close_date`→`closeDate`, `last_touch`→`lastTouch`.

## Backend Safety Rules
- SQL must use `%s` placeholders only (no f-strings).
- Always close DB connections in `finally` via `close_connection(conn)`.
- Preserve auth guards (`@jwt_required`, `@admin_required`).

## Testing Reality
- No automated test runner configured (no pytest/Vitest/Jest files or config).

## Lint
- Frontend lint: `npm run lint` (eslint config at `eslint.config.js`).
