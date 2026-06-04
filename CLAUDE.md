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

# Health check
py -c "import requests; print(requests.get('http://127.0.0.1:5001/api/health').status_code)"
```

> **Windows note**: Requires `pip install tzdata` for `Asia/Manila` timezone support.

## Architecture

### Two separate React apps, one Flask backend

`frontend/src/main.jsx` routes `/admin/*` to `AdminPortal.jsx` and everything else to `App.jsx`. They share the same Vite dev server and JWT auth mechanism but are fully separate component trees.

- **`App.jsx`** — the main CRM shell: sidebar, top bar, routing to the four views (Dashboard, Database/Customers, Pipeline, Tasks), and global modal management (LeadForm, TaskForm, ProfileModal, ImageAdjustModal).
- **`AdminPortal.jsx`** — the admin shell: separate nav and routes for Analytics, Account Management, Celebration Music, and Profile Settings.

### Frontend data flow

All CRM state lives in **`frontend/src/hooks/useCRMData.js`**. It fetches all entities (leads, deals, tasks, companies, contacts, team members) and exposes both data and mutating actions. `App.jsx` calls this hook once and passes data/actions down as props — there is no context or global store.

All API calls go through **`frontend/src/api.js`** → `apiFetch()`, which attaches the JWT from `sessionStorage` and forces a reload on 401.

**`frontend/src/constants.js`** is the source of truth for stage workflow (with probability mappings), region/branch mapping, lost reasons, and nav config.

**`frontend/src/utils.js`** contains all formatting helpers (`formatCurrencyCompact`, `getToneClass`, `displayRole`, etc.) and search/filter logic.

### Backend

**`backend/app.py`** is a monolith — all Flask routes live in this single file. On startup it calls `ensure_schema()`, which ALTER TABLEs any missing columns. When adding new columns: add the ALTER TABLE check to `ensure_schema()` first, then update `backend/database/schema.sql`.

**`backend/gsheets_sync.py`** maps the "SR" column from Google Sheets to the `team` table via `LOWER(TRIM())` match on `name` or `username`.

Auth decorator order matters: `@admin_required` must be placed **below** `@jwt_required()` on any route.

### Database

MySQL. `backend/database/schema.sql` is the source of truth. `backend/database/database.py` provides `get_db_connection()` / `close_connection()`. Always close connections in `finally` blocks. Always use `%s` parameterized queries — never string interpolation.

### Role hierarchy and data visibility

| Role | Sees |
|------|------|
| Sales Representative | Only their own leads (`owner_id = user_id`) |
| Regional Sales Manager | All leads in their `region` |
| Head of Sales / Admin | Everything; can filter by branch or region |

### Styling

Dark theme + orange accent palette. CSS design tokens are in `frontend/src/index.css` and `frontend/src/styles/tokens.css`. Use `getToneClass()` from `utils.js` for status-based colors.

### Data conventions

- Database columns: `snake_case`
- API responses / frontend state: `camelCase`
- Branch/region filter is passed as `?branch=` or `?region=` query param on most list endpoints
- `activeBranch` / `activeRegion` live in `useCRMData.js` and drive all filtered fetches
