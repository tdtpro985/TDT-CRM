# AGENTS.md

## Scope
- Keep edits minimal. Do not rewrite API shapes or component structure unless asked.
- Verify changes by running `npm run lint` and checking backend health (port 5001).

## Repo Shape
- **Frontend**: React (Vite) in `frontend/`. 
  - Views: `frontend/src/views/` (not `pages/`).
  - Utils: `frontend/src/utils.js` (formatting, search logic).
- **Backend**: Flask in `backend/`. 
  - Entrypoint: `backend/app.py`.
  - Auth: JWT + `@admin_required` (must be BELOW `@jwt_required`).
  - Sync: `backend/gsheets_sync.py` maps "SR" column from Sheets to `team` table via `LOWER(TRIM())` match on `name` or `username`.
- **Database**: MySQL. `backend/database/schema.sql` is the source of truth.
  - Startup: `ensure_schema()` in `app.py` auto-patches missing columns.

## Commands That Matter
- **Root (Frontend)**: `npm run dev`, `npm run build`, `npm run lint`.
- **Backend App**: `python app.py` from `backend/`.
- **DB Reset**: `python -m database.rebuild_db` (from `backend/`).
- **Setup Users**: `python -m database.bootstrap_users [--reset-passwords]`.
- **Sync Pipeline**: `python -m database.sync_pipeline` (tops up ~20 active deals).
- **Bootstrap Manila**: `python -m database.bootstrap_sr_manila` (fixes owner mappings for Manila).
- **Health Check**: `py -c "import requests; print(requests.get('http://127.0.0.1:5001/api/health').status_code)"`.

## Operational Quirks
- **Ports**: Backend `5001` (set via `FLASK_PORT`), Frontend `5173`.
- **Windows**: Requires `pip install tzdata` for `Asia/Manila` timezone support in `zoneinfo`.
- **Role Visibility**: 
  - `Sales Rep`: Can ONLY see leads where `owner_id = user_id`.
  - `Regional Sales Manager`: Sees all leads in their assigned `region`.
  - `Head of Sales` / `Admin`: Can see everything or filter by branch/region.
- **Environment**: `.env` in `backend/` requires `JWT_SECRET_KEY`, `DB_*`, and `GOOGLE_APPLICATION_CREDENTIALS_JSON_PATH`.
- **Data Conventions**: 
  - DB: `snake_case`. API/Frontend: `camelCase`.
  - Filters: CRM views often filter by `branch` and `sr`. Sample data uses `sr = 'manila.tdtpowersteel'`.
- **Styles**: Dark theme + orange accents. Tokens in `frontend/src/index.css` and `frontend/src/styles/tokens.css`. Use `getToneClass` in `utils.js` for status colors.

## Safety
- **DB Connections**: Always close in `finally` blocks using `close_connection(conn)`.
- **SQL**: Use parameterized queries ONLY (`%s` placeholders).
- **Secrets**: Never commit `credentials.json` or `.env`.
