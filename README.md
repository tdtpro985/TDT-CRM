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

##  Getting Started

Follow these steps to run the CRM locally on your machine.

### 1. Database Setup
Ensure you have a MySQL server running (locally or remotely).
1. Navigate to the project root and then to the `backend/` directory.
2. Edit the `.env` file with your MySQL credentials (e.g., `DB_USER=root`, `DB_PASSWORD=yourpassword`, `DB_HOST=127.0.0.1`, `DB_NAME=tdt_crm`).
3. Run the database initialization script to create the necessary tables and seed them with the initial platform data:
   ```bash
   cd backend
   python init_db.py
   ```

### 2. Start the Backend Server (Flask)
With your database prepared, start the Flask REST API:
```bash
cd backend
python main.py
```
*The server will typically run on `http://127.0.0.1:5000`.*

### 3. Start the Frontend Server (Vite)
Open a **new terminal window**, make sure you are in the project root containing `package.json`, and execute the following:
```bash
npm install
npm run dev
```
*Vite will start a local development server (usually on `http://localhost:5173`) and automatically proxy `/api` requests to your Flask backend.*

---

## Core Features

- **Dashboard**: Live aggregate views on Weighted Forecast, Revenue Readiness, and Team Activity.
- **Sales Workspace**: Customizable reporting layouts to track specific KPIs like *Deal closed vs goal* and *Team activity totals*.
- **Deals Pipeline**: Track opportunity values, close probabilities, and pipeline stages (Lead → Qualified → Proposal → Negotiation → Closed Won).
- **Contact Directory**: Consolidate client owners and statuses.
- **Activity Logging**: Track phone calls, quotes, meetings, and site visits to hold sales reps accountable.

##  Development & Maintenance

This CRM was originally developed as a mock frontend and progressively refactored into a full-stack, database-backed application. The frontend was explicitly decoupled from a massive monolithic file into discrete, single-responsibility components and pure functions, allowing any new engineering team members to cleanly extend pages or build new UI modules without risking layout breakage.
