# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (run from repo root)
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build
npm run lint         # ESLint — run after every frontend change

# Backend (run from backend/)
python app.py        # Start Flask server (http://127.0.0.1:5001)

# Database (run from backend/)
python -m database.rebuild_db                      # Drop and recreate all tables from schema.sql
python -m database.bootstrap_users                 # Create default branches and admin users
python -m database.bootstrap_users --reset-passwords
python -m database.sync_pipeline                   # Tops up ~20 active deals (WARNING: auto-creates tasks)
python -m database.bootstrap_sr_manila             # Fix owner mappings for Manila branch
python -m database.clear_db                        # Truncate data tables (preserves team); use before full reimport
python -m database.backup_db                       # Dump all tables to JSON (tdt_crm_backup_YYYYMMDD.json)
python -m database.migrate_manila_owners           # One-shot idempotent: re-links Manila leads to new user IDs

# Health check
py -c "import requests; print(requests.get('http://127.0.0.1:5001/api/health').status_code)"
```

> **Windows note**: Requires `pip install tzdata` for `Asia/Manila` timezone support.

> **Backend `.env`**: `backend/.env` must define `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET_KEY`, `SPREADSHEET_ID` (Google Sheets), and `GOOGLE_APPLICATION_CREDENTIALS_JSON_PATH` (service account JSON path).

## Architecture

### Two separate React apps, one Flask backend

`frontend/src/main.jsx` routes `/admin/*` to `AdminPortal.jsx` and everything else to `App.jsx`. They share the same Vite dev server and JWT auth mechanism but are fully separate component trees.

- **`App.jsx`** — the main CRM shell: sidebar, top bar, routing to the four views (Dashboard, Database/Customers, Pipeline, Tasks), and global modal management (LeadForm, TaskForm, ProfileModal, ImageAdjustModal).
- **`AdminPortal.jsx`** — the admin shell: separate nav and routes for Analytics, Account Management, Celebration Music, and Profile Settings.

### Frontend data flow

All CRM state lives in **`frontend/src/hooks/useCRMData.js`**. It fetches all entities (leads, deals, tasks, companies, contacts, team members) and exposes both data and mutating actions. `App.jsx` calls this hook once and passes data/actions down as props — there is no context or global store.

**`frontend/src/hooks/useTheme.js`** manages 3 themes (`dark`, `light`, `neon`) with 8 neon color variants + rainbow auto-cycle. Persists to `sessionStorage` and injects overrides via `<style id="__neon-color-override__">` — theme switching does not cause React re-renders.

All API calls go through **`frontend/src/api.js`** → `apiFetch()`, which attaches the JWT from `sessionStorage` and forces a reload on 401.

**`frontend/src/constants.js`** is the source of truth for stage workflow (with probability mappings), region/branch mapping, lost reasons, and nav config.

**`frontend/src/utils.js`** contains all formatting helpers (`formatCurrencyCompact`, `getToneClass`, `displayRole`, etc.) and search/filter logic.

### Backend

**`backend/app.py`** is a monolith — all Flask routes live in this single file. On startup it calls `ensure_schema()`, which ALTER TABLEs any missing columns. When adding new columns: add the ALTER TABLE check to `ensure_schema()` first, then update `backend/database/schema.sql`.

**`backend/gsheets_sync.py`** maps the "SR" column from Google Sheets to the `team` table via `LOWER(TRIM())` match on `name` or `username`.

Auth decorator order matters: `@admin_required` must be placed **below** `@jwt_required()` on any route.

**Key helpers in `app.py`** — reuse these; do not reinvent them:
- **`build_scope(claims, branch, col, region)`** → `(sql_fragment, restrict_owner, params)` — use on every new filtered list endpoint to enforce branch/region/owner scoping.
- **`log_audit(conn, entity_type, entity_id, action, old_value, new_value, user_id)`** — call on every state-changing route.
- **`to_pht(dt)`** — converts naive/UTC datetimes to PHT ISO strings; use for all datetime fields in responses.

JWT tokens expire after **8 hours**; claims carry `role`, `branch`, `region`. Login routes support dual Werkzeug + legacy bcrypt password verification and auto-rehash on first post-upgrade login. Rate limits: login `5/min`, gsheets sync `2/min`; global default `200/hour / 1000/day`.

When a deal is closed (Won or Lost), `fill_pipeline()` is called automatically from the deal stage-change route to generate synthetic deals and maintain ~20 active deals per stage. Do not call `sync_pipeline` manually from code.

### Database

MySQL. `backend/database/schema.sql` is the source of truth. `backend/database/database.py` provides `get_db_connection()` / `close_connection()`. Always close connections in `finally` blocks. Always use `%s` parameterized queries — never string interpolation.

### Role hierarchy and data visibility

| Role | Sees |
|------|------|
| Sales Representative | Only their own leads (`owner_id = user_id`) |
| Branch Account | Their assigned branch only |
| Regional Sales Manager | All leads in their `region` |
| Head of Sales / Admin | Everything; can filter by branch or region |

Manila SRs are a special case: they can also see Central region data (handled in `build_scope()`).

### Styling

Dark theme + orange accent palette. CSS design tokens are in `frontend/src/index.css`. Modular CSS lives in `frontend/src/styles/` (base, components, layout, views, animations, login, responsive, victory-splash). Use `getToneClass()` from `utils.js` for status-based colors. Do not use `!important` in component CSS to override neon colors — the `__neon-color-override__` style tag controls those dynamically.

### Data conventions

- Database columns: `snake_case`
- API responses / frontend state: `camelCase`
- Branch/region filter is passed as `?branch=` or `?region=` query param on most list endpoints
- `activeBranch` / `activeRegion` live in `useCRMData.js` and drive all filtered fetches
