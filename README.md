# TDT Powersteel CRM
A fully functional Customer Relationship Management (CRM) system designed and tailored for the TDT Powersteel sales team. 
This project empowers the sales organization by providing a unified workspace to track leads, manage pipeline deals, log daily activities, and analyze performance through real-time dashboards.
---
## Architecture & Tech Stack
The application is built with a modern, decoupled architecture:
### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Custom CSS mapped to the TDT Powersteel brand palette (dark mode with high-contrast accent colors).
- **Structure**: Highly modular, component-driven design located in `frontend/src/`
  - `components/`: Reusable UI elements (`Panel`, `MetricCard`, `ReportChart`, `EmptyState`).
  - `pages/`: Dedicated views for Dashboard, Deals, Contacts, Activities, and Reports.
  - `utils.js` / `constants.js`: Helper functions and standardized dictionaries.
### Backend
- **Framework**: Python / Flask (`backend/main.py`)
- **Database**: MySQL
- **API**: RESTful JSON endpoints (GET, POST, PUT) handling all database CRUD operations.
- **Environment Management**: `python-dotenv` for managing database credentials securely.
---
## Getting Started
Follow these steps to run the CRM locally on your machine.
### 1. Database & Secret Environment Setup
- Ensure you have a MySQL server running (locally or remotely).
- Copy `.env.example` to `.env` and set all required variables:
.env.example (do NOT commit .env)
  DB_USER=
  DB_PASSWORD=
  DB_HOST=
  DB_NAME=
  DEFAULT_BRANCH_PASSWORD=
  DEFAULT_ADMIN_PASSWORD=
**Never commit your `.env` or any real secret credentials to version control.**
- Add `.env` to your `.gitignore`.
1. Navigate to the `backend/` directory.
2. Run the database initialization script to create tables and seed initial platform data:
  ```bash
  cd backend
  python init_db.py
  ```
3. Ensure login users are created consistently on any machine:
  ```bash
  cd backend
  python -m database.bootstrap_users
  ```
  - To reset all default account passwords across devices:
  ```bash
  python -m database.bootstrap_users --reset-passwords
  ```
  - All passwords and usernames are controlled by environment variables set in your `.env` file.
### 2. Start the Backend Server (Flask)
Prepare the backend:
```bash
cd backend
python main.py
The server will typically run on http://127.0.0.1:5000.
3. Start the Frontend Server (Vite)
Open a new terminal window in the project root and execute the following:
npm install
npm run dev
```
Vite will start a local development server and proxy /api requests to your Flask backend.

Core Features
- Dashboard: Live aggregate views on Weighted Forecast, Revenue Readiness, and Team Activity.
- Sales Workspace: Customizable reporting layouts to track specific KPIs like Deal closed vs goal and Team activity totals.
- Deals Pipeline: Track opportunity values, close probabilities, and pipeline stages (Lead → Qualified → Proposal → Negotiation → Closed Won).
- Contact Directory: Consolidate client owners and statuses.
- Activity Logging: Track phone calls, quotes, meetings, and site visits to hold sales reps accountable.
 Development & Maintenance
This CRM was originally developed as a mock frontend and progressively refactored into a full-stack application. The frontend was explicitly decoupled into single-responsibility components, enabling easy extension without risking layout breakage.
---
Security Note
- Never commit .env or any file with secrets or credentials. Refer to .env.example only.
- All sensitive configuration must reside in environment variables.
- Audit your repo before pushing to ensure no sensitive files or secrets are included.
---