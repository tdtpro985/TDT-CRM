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
- **Rate Limiting**: 1000/day, 200/hour globally; 5/min on login

### Role Hierarchy
| Role | Scope |
|------|-------|
| Admin | All branches |
| Head of Sales | All branches/regions |
| Regional Sales Manager | Own region's branches |
| Sales Representative | Own branch only |

---

## Getting Started

### Setup

#### 1. Environment & Database

Ensure a MySQL server is running, then create `backend/.env` with the following variables:

```bash
# backend/.env
DB_HOST=localhost
DB_NAME=tdt_crm
DB_USER=root
DB_PASSWORD=your_mysql_password

JWT_SECRET_KEY=change-this-in-production
FRONTEND_URL=http://localhost:5173
FLASK_PORT=5001

# Default passwords set by bootstrap_users
DEFAULT_BRANCH_PASSWORD=TDTpowersteel2024
DEFAULT_ADMIN_PASSWORD=TDTpowersteel2024
```

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

#### 3. Populate the Pipeline (optional)

```bash
python -m database.sync_pipeline
```

> **⚠️ Warning**: This converts "New" leads into deals and auto-creates follow-up tasks. On databases with many unprocessed leads this can generate hundreds of entries. Only run intentionally.

#### 4. Start the Backend

```bash
cd backend
pip install -r requirements.txt
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

## Core Features

- **Dashboard**: Live KPIs — weighted forecast, active deals, conversion rate, pipeline value, and deals by stage.
- **Sales Pipeline**: Kanban and table view of deals across stages: Qualified → New Opp → Proposal → Negotiation → Closed Won/Lost. Tracks value, probability, and close date.
- **Customer Database**: Company and contact records with full deal and activity history.
- **Activity Logging**: Tasks and follow-ups linked to deals. Tracks calls, quotes, meetings, and site visits with urgency scoring.
- **Admin Panel**: User management, branch assignment, and org-wide analytics.
- **Audit Trail**: Every entity change is logged with old/new values, timestamp, and the user who made the change.

---

## Development & Maintenance

The frontend uses single-responsibility components to allow safe extension without layout breakage.

**Useful commands:**

```bash
npm run lint              # ESLint check — run after every frontend change
npm run build             # Production build

# Health check
py -c "import requests; print(requests.get('http://127.0.0.1:5001/api/health').status_code)"
```

---

## Security Note

- Never commit `.env` or any file containing secrets.
- All sensitive configuration must reside in environment variables.
- Audit your repo before pushing to ensure no sensitive files are included.

---
