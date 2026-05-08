# AGENTS.md

## Scope
- Keep edits minimal and reversible. Do not rewrite API shapes, response keys, or component structure unless asked.

## Repo Shape
- Frontend lives in `frontend/`; views go in `frontend/src/views/` and the app entry is `frontend/src/main.jsx`.
- Backend lives in `backend/`; preferred entrypoint is `backend/app.py` and `backend/main.py` is legacy.

## Commands That Matter
- Run from repo root: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.
- Frontend npm scripts are wired to Vite with the `frontend` app directory.
- Backend reset/bootstrap/sync are module commands run from `backend/`: `python -m database.rebuild_db`, `python -m database.bootstrap_users`, `python -m database.sync_pipeline`.
- Backend health check: `py -3.11 -c "import requests; print(requests.get('http://127.0.0.1:5001/api/health').status_code)"`.

## Operational Quirks
- Backend defaults to port `5000`; on Windows, use `FLASK_PORT=5001` in `backend/.env` if `5000` is occupied.
- `backend/database/schema.sql` is the source of truth.
- The CRM filters by `branch` and `sr`; sample data is hidden with `sr = 'manila.tdtpowersteel'`.
- `backend/database/sync_pipeline.py` tops up the pipeline to 20 active deals and creates follow-up tasks.

## Data Shape
- Database uses `snake_case`; frontend/API JSON uses `camelCase`.
- Keep `close_date`/`closeDate` aliases and other field mappings stable between backend and `frontend/src/hooks/useCRMData.js`.

## UI Rules
- Preserve the dark theme with orange accent.
- Use the existing CSS tokens from `frontend/src/index.css` and `frontend/src/styles/tokens.css`.
- Keep sidebar/navigation and view code in the current structure; do not move views back into `pages/`.
- If `anti-generic-ui-ux-design.md` exists, follow its layout rules but keep the dark/orange palette.

## Safety
- Always close DB connections in `finally` with `close_connection(conn)`.
- Use parameterized SQL only.
- Keep `@jwt_required` and `@admin_required` in place on protected routes.
