# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (run from repo root)
```bash
npm install          # install dependencies
npm run dev          # start Vite dev server on http://localhost:5173
npm run build        # production build (output in frontend/dist)
npm run lint         # ESLint check
npm run preview      # preview production build
```

### Backend (run from `backend/` directory)
```bash
pip install -r requirements.txt
python app.py                           # start Flask on port 5001
```

### Database management (run from `backend/` directory)
```bash
python -m database.rebuild_db                      # drop & recreate tables from schema.sql
python -m database.bootstrap_users                 # seed default branch + admin users
python -m database.bootstrap_users --reset-passwords  # reset all default user passwords
python -m database.sync_pipeline                   # top up Kanban board to 20 active deals
python -m database.backup_db                       # export a database backup
python -m database.clear_db                        # wipe all data (keep schema)
```

### Environment setup
Copy `.env.example` to `backend/.env` and set:
```ini
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=tdt_crm
JWT_SECRET_KEY=generate_a_random_string
FLASK_PORT=5001
FLASK_DEBUG=True
FRONTEND_URL=http://localhost:5173            # used for CORS allowlist
GOOGLE_CREDENTIALS_JSON_PATH=credentials.json   # optional, for GSheets sync
SPREADSHEET_ID=...                               # optional, target spreadsheet
```

For the frontend, create `frontend/.env` if you need to override the backend URL:
```ini
VITE_API_BASE=http://localhost:5001
```
On Windows, port 5000 is often occupied by other services — use 5001 and make sure `VITE_API_BASE` matches.

## Architecture

### Dual-portal structure
`main.jsx` mounts two completely separate React apps under one router:
- **Branch CRM portal** (`/`, `/dashboard`, `/database`, `/pipeline`, `/tasks`) — `App.jsx`
- **Admin portal** (`/admin/*`) — `AdminPortal.jsx`

Both portals have their own login pages, session state, and sidebar layouts. The admin portal uses a separate login endpoint (`/api/admin/login`) that enforces `role = 'Admin'`.

### Frontend state management
All data fetching and mutation lives in the `useCRMData` hook (`frontend/src/hooks/useCRMData.js`). It:
- Fetches all six collections in parallel on login (companies, contacts, leads, deals, activities, team)
- Applies optimistic updates locally before the API responds
- Falls back gracefully if the backend is unreachable (local state only, no crash)

`App.jsx` consumes this hook and passes slices down to each view as props.

### API layer
`frontend/src/api.js` is the single point for all HTTP calls via `apiFetch()`. It automatically attaches the JWT from `sessionStorage` (`crm_token`) to every request. On a 401 response it clears the token and reloads the page, forcing re-login. The `crm_user` key in `sessionStorage` stores the serialized user object.

The API base URL defaults to `http://localhost:5001` and can be overridden with `VITE_API_BASE`.

### Backend structure
`backend/app.py` is a single-file Flask app. It uses:
- `flask-jwt-extended` for token auth (8-hour expiry)
- `admin_required` decorator stacked below `@jwt_required()` for admin-only routes
- `flask-limiter` for rate limiting (login endpoints: 5/min; sync: 2/min)
- `rows_to_list(cursor)` helper that converts MySQL cursor rows to list-of-dicts using column names

All database connections are opened per-request via `get_db_connection()` and always closed in a `finally` block via `close_connection()`.

### Role-based data isolation
The `build_scope()` helper in `app.py` is the central enforcement point for all data filtering. It reads the JWT claims and returns a `(where_parts, restrict_owner, params)` tuple that every endpoint injects into its SQL:

| Role | Sees |
|---|---|
| `Sales Representative` | Only their own records (`owner_id` restricted) |
| `Regional Sales Manager` | All records for branches in their region |
| `Head of Sales` | All branches; can filter by `?branch=` or `?region=` |
| `Admin` | Admin portal only — uses separate login and endpoints |

The region → branch mapping lives in `REGION_BRANCHES` (defined identically in both `app.py` and `App.jsx`):
- `Central`: Manila, Palawan, Legazpi, Cavite, Batangas
- `North Luzon`: Ilocos, Isabela
- `Vis&Min`: Gensan, Iloilo, Cebu, Davao, CDO

`has_branch_filter()` returns `False` for empty strings or `'Headquarters'` — those yield unfiltered (all-branch) results. The `?branch=` and `?region=` params are mutually exclusive; `branch` takes precedence in `useCRMData.js`.

The string `manila.tdtpowersteel` in the `sr` column is a reserved system identifier for the Google Sheets sync account. All queries explicitly filter it out with `LOWER(TRIM(sr)) != 'manila.tdtpowersteel'`.

### Data model relationships
`backend/database/schema.sql` is the source of truth for the database schema. The key tables are `leads`, `companies`, `contacts`, `deals`, `activities` (called "tasks" in the UI), and `team`.

Creating a lead atomically creates a matching `companies` record (using the same `id`) and a `contacts` record (with a UUID). This means `companies.id = leads.id` for leads-originated companies, and deals join to leads via either `lead_id` or `company_id`.

The `GET /api/customers` endpoint is not a simple table query — it returns an enriched join of companies + leads + deal statistics (total, active, won, lost counts) computed via SQL subqueries. This is distinct from `GET /api/companies`.

The `deals` GET query computes deal urgency (overdue, high priority, due today) and `lastTouch` entirely in SQL subqueries — avoid moving this logic to the frontend.

**Naming conventions**: The database uses `snake_case` column names; the API serializes them to `camelCase` for the frontend. The mapping is handled in `useCRMData.js` (e.g., `contact_name` → `contact`, `close_date` → `expectedClose`). The frontend calls activities "tasks" throughout — `useCRMData` maps the `activities` API response into the `tasks` state array.

### Pipeline stages and probabilities
Stages map to fixed probabilities in both the backend (`STAGE_PROBABILITY` dict in `app.py`) and frontend (`STAGE_PROBABILITY` in `useCRMData.js`). Changing a deal's stage via `PATCH /api/deals/<id>/stage` automatically updates the probability. Audit entries are written to `audit_log` on every stage or status change.

### Password hashing
The `verify_password()` helper in `app.py` handles both Werkzeug hashes (`pbkdf2:sha256:...`) and legacy bcrypt hashes (`$2a$`/`$2b$`). On a successful bcrypt login, the password is automatically rehashed to Werkzeug format (`should_rehash` flag). New passwords are always stored as Werkzeug hashes.

### Google Sheets sync
`backend/gsheets_sync.py` reads/writes via a service account in `credentials.json`. `sync_from_sheets()` is triggered by `POST /api/sync/gsheets` (admin-only). `sync_to_sheets()` is called automatically after every successful lead creation.

The sheet layout is: `Customer Name | Contact Number | Address | Region | SR | Branch`. Each branch has its own tab; branch name matching is case-insensitive substring of the tab title.

### CSS architecture
Styles are split into purpose-specific files in `frontend/src/styles/`:
- `tokens.css` — CSS custom properties (color palette, spacing)
- `base.css` — resets and body defaults
- `layout.css` — sidebar/main/top-bar shell
- `components.css` — shared component classes
- `views.css` — view-specific overrides
- `animations.css`, `responsive.css`, `login.css` — as named
