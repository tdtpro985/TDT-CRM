# TDT Powersteel CRM - Project Context

## Overview
A custom CRM system for the TDT Powersteel sales team, designed to track leads, manage pipeline deals, log activities, and provide real-time analytics.

## Tech Stack
- **Frontend**: React 18/19, Vite, React Router 7.
- **Backend**: Python 3.x, Flask, Flask-JWT-Extended, Flask-CORS, Flask-Limiter.
- **Database**: MySQL (hosted locally or via server).
- **External Integrations**: Google Sheets API (v4) for lead synchronization.

## Architecture
The project is split into two main directories:
- `frontend/`: React application using Vite.
- `backend/`: Flask API and database management scripts.

### Key Architectural Patterns
- **Decoupled Frontend/Backend**: Communicates via RESTful JSON API.
- **Data Mapping**: 
    - Database uses `snake_case`.
    - API/Frontend uses `camelCase`.
    - Mapping logic is centralized in `frontend/src/hooks/useCRMData.js`.
- **Security**: 
    - JWT-based authentication (8-hour sessions).
    - Role-based access control (RBAC) with `Admin` and `Sales Rep` roles.
    - Parameterized SQL queries for all database interactions.
    - Security headers (XSS, Clickjacking, etc.) enforced on backend responses.

## Development Setup

### Backend (Flask)
1. **Directory**: `cd backend`
2. **Environment**: Copy `.env.example` to `.env`.
   - `FLASK_PORT=5001` (Recommended for Windows/macOS compatibility).
   - `FLASK_DEBUG=True` for development.
3. **Database Initialization**:
   - `python -m database.rebuild_db`: Creates tables based on `backend/database/schema.sql`.
   - `python -m database.bootstrap_users`: Seeds initial users. Use `--reset-passwords` to reset.
   - `python -m database.sync_pipeline`: Tops up the Kanban board to 20 deals and generates tasks.
4. **Run Server**: `python app.py`

### Frontend (React/Vite)
1. **Directory**: `cd frontend`
2. **Install**: `npm install`
3. **Run**: `npm run dev` (Starts Vite on http://localhost:5173).
4. **Build**: `npm run build` (Outputs to `dist/`).

## Project Conventions

### Data Models & Source of Truth
- **Database Schema**: `backend/database/schema.sql` is the authoritative source for the data model.
- **Lead Creation**: Creating a lead automatically generates a corresponding `Company` and `Contact` record.
- **Stage Logic**: Deal probability is automatically mapped from the `stage` field (e.g., 'Proposal' = 60%).

### API Standards
- **Endpoint Prefix**: `/api/`
- **Error Handling**: Standardized JSON error responses: `{"error": "Message"}`.
- **Audit Logging**: Major actions (status changes, stage updates) are logged in the `audit_log` table via `log_audit()` in `backend/app.py`.

### UI/UX Rules
- **Theme**: Dark mode with high-contrast orange accent (`#f97316`).
- **Styling**: Vanilla CSS using tokens defined in `frontend/src/styles/tokens.css`.
- **Modularity**: Views are kept in `frontend/src/views/`, reusable components in `frontend/src/components/`.

## Key Files
- `backend/app.py`: Main API entry point and route definitions.
- `backend/database/schema.sql`: Database table definitions.
- `frontend/src/hooks/useCRMData.js`: Central state management and API integration hook.
- `frontend/src/api.js`: Wrapper for fetch calls with auth header management.
- `AGENTS.md`: Specific instructions for AI agents (complementary to this file).

## Common Tasks
- **Sync with GSheets**: Triggered by Admin via `/api/sync/gsheets` or automatically in background on lead creation.
- **Adding a Route**:
    1. Define endpoint in `backend/app.py`.
    2. Add corresponding action in `frontend/src/hooks/useCRMData.js`.
    3. Use `@jwt_required()` for protection.
- **Database Migration**: Manual for now; update `schema.sql` and run `rebuild_db` (Warning: wipes data) or apply ALTER statements manually.
