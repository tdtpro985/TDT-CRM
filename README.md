# TDT Powersteel CRM
A fully functional Customer Relationship Management (CRM) system designed and tailored for the TDT Powersteel sales team.
This project empowers the sales organization by providing a unified workspace to track leads, manage pipeline deals, log daily activities, and analyze performance through real-time dashboards.

---

## Architecture & Tech Stack

The application is built with a modern, decoupled architecture:

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: React Router v7
- **Styling**: Custom CSS with dark mode and orange accent palette (TDT brand)
- **Structure**: Component-driven design in `frontend/src/`
  - `views/`: Page-level components (Dashboard, Pipeline, Customers, Tasks, Admin)
  - `components/`: Reusable UI elements (`Panel`, `MetricCard`, `Modal`, `EmptyState`, forms)
  - `hooks/useCRMData.js`: Central data-fetching hook — all API state lives here
  - `utils.js` / `constants.js`: Formatting helpers, stage definitions, branch/region mapping

### Backend
- **Framework**: Python / Flask (`backend/app.py` — all routes and logic in one file)
- **Database**: MySQL; `backend/database/schema.sql` is the source of truth
- **Auth**: JWT (flask-jwt-extended), 8-hour tokens stored in `sessionStorage`
- **API**: RESTful JSON endpoints with role-based access control
- **Rate Limiting**: 1000/day, 200/hour globally; 5/min on login, 2/min on Google Sheets sync

### Role Hierarchy
| Role | Scope |
|------|-------|
| Admin | All branches |
| Head of Sales | All branches/regions |
| Regional Sales Manager | Own region's branches |
| Sales Representative | Own branch only |

---

## Getting Started

### Quick Start (Windows)
Double-click `START-HERE.bat` at the repo root. It opens two terminal windows — one for the backend and one for the frontend.

Default login credentials are provided separately by your administrator.

### Manual Setup

#### 1. Environment & Database

- Ensure a MySQL server is running.
- Create `backend/.env` from the provided template — ask your administrator for the correct values.
  > We use `FLASK_PORT=5001` to avoid common conflicts on port 5000.

#### 2. Database Initialization (run from `backend/`)

```bash
# Create all tables from schema.sql
python -m database.rebuild_db

# Create default branch and admin users
python -m database.bootstrap_users

# (Optional) Reset passwords for existing default users
python -m database.bootstrap_users --reset-passwords
```

#### 3. Populate the Pipeline — "Agos" Flow (optional)

```bash
python -m database.sync_pipeline
```

> **⚠️ Warning**: This converts "New" leads into deals and auto-creates follow-up tasks. On databases with many unprocessed leads this can generate hundreds of entries. Only run intentionally.

#### 4. Start the Backend

```bash
cd backend
python app.py
```

Backend runs at `http://127.0.0.1:5001`.

#### 5. Start the Frontend

```bash
# From the repo root
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. Vite proxies all `/api` requests to port 5001.

---

## Google Sheets Synchronization

The CRM syncs lead data with a centralized Google Sheet. To enable it:

1. **Obtain Credentials**: Ask your administrator for the `credentials.json` service account file.
2. **Place the File**: Save `credentials.json` in the `backend/` directory.
3. **Configure `.env`**: Ensure `GOOGLE_CREDENTIALS_JSON_PATH=credentials.json` is set.
4. **Trigger Sync**: Hit `POST /api/sync/gsheets` (Admin only) or create a lead — sync runs automatically in the background.

---

## Core Features

- **Dashboard**: Live KPIs — weighted forecast, active deals, conversion rate, pipeline value, and deals by stage.
- **Sales Pipeline**: Kanban and table view of deals across stages: Qualified → New Opp → Proposal → Negotiation → Closed Won/Lost. Tracks value, probability, and close date.
- **Customer Database**: Company and contact records with full deal and activity history.
- **Activity Logging**: Tasks and follow-ups linked to deals. Tracks calls, quotes, meetings, and site visits with urgency scoring.
- **Admin Panel**: User management, branch assignment, org-wide analytics, and Google Sheets sync trigger.
- **Audit Trail**: Every entity change is logged with old/new values, timestamp, and the user who made the change.

---

## Development & Maintenance

This CRM started as a mock frontend and was progressively refactored into a full-stack application. The frontend uses single-responsibility components to allow safe extension without layout breakage.

**Useful commands:**

```bash
npm run lint              # ESLint check — run after every frontend change
npm run build             # Production build

# Health check
py -c "import requests; print(requests.get('http://127.0.0.1:5001/api/health').status_code)"
```

---

## Security Note

- Never commit `.env`, `credentials.json`, or any file containing secrets.
- All sensitive configuration must reside in environment variables.
- Audit your repo before pushing to ensure no sensitive files are included.

---
