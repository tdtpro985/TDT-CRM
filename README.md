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
- **Framework**: Python / Flask (`backend/app.py`)
- **Database**: MySQL
- **API**: RESTful JSON endpoints (GET, POST, PUT) handling all database CRUD operations.
- **Environment Management**: `python-dotenv` for managing database credentials securely.
---
## Getting Started
Follow these steps to run the CRM locally on your machine.
### 1. Database & Secret Environment Setup
- Ensure you have a MySQL server running.
- Copy `.env.example` to `.env` and set all required variables:
  ```ini
  DB_HOST=localhost
  DB_USER=your_username
  DB_PASSWORD=your_password
  DB_NAME=tdt_crm
  JWT_SECRET_KEY=generate_a_random_string
  FLASK_PORT=5001
  FLASK_DEBUG=True
  ```
- **Port Convention**: We use `FLASK_PORT=5001` to avoid common Windows/macOS conflicts on port 5000.
- **Security**: Never commit your `.env` or any real secret credentials to version control.

#### Database Initialization
1. Navigate to the `backend/` directory.
2. Run the schema rebuild script to create the authoritative tables:
   ```bash
   python -m database.rebuild_db
   ```
   *Note: This creates the tables based on `backend/database/schema.sql`.*
3. Ensure login users are created consistently:
   ```bash
   python -m database.bootstrap_users
   ```
   - To reset default passwords: `python -m database.bootstrap_users --reset-passwords`

4. Sync Pipeline Data (The "Agos" Flow):
   ```bash
   python -m database.sync_pipeline
   ```
   *Note: This script tops up your Kanban board to 20 active deals by pulling from your latest leads. Run this whenever you close deals and want the next batch to flow in.*

### 2. Start the Backend Server (Flask)
```bash
cd backend
python app.py
```
The server will run on http://127.0.0.1:5001.

### 3. Start the Frontend Server (Vite)
```bash
cd frontend
npm install
npm run dev
```
*Vite will start the local server on http://localhost:5173 and proxy `/api` requests to port 5001.*

---

## Google Sheets Synchronization

The CRM can automatically sync data with a centralized Google Sheet. For this to work on your local machine:

1. **Obtain Credentials**: Ask your administrator for the `credentials.json` file.
2. **Place the File**: Save `credentials.json` in the `backend/` directory.
3. **Configure .env**: Ensure your `backend/.env` file contains the path to the credentials:
   ```ini
   GOOGLE_CREDENTIALS_JSON_PATH=credentials.json
   ```
4. **Auto-Sync**: The system will now automatically sync new leads to Google Sheets in the background.

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