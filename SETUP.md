# TDT-CRM Setup Guide

## Prerequisites

Kailangan mo ng:
- ✅ Node.js (v14+) at npm — **INSTALLED** (v24.15.0)
- ✅ Python 3.12+ — **INSTALLED** (C:\Users\kramzu\AppData\Local\Programs\Python\Python312)
- ✅ MySQL — **INSTALLED at RUNNING**

---

## Quick Start (Simpleng Pag-run)

### 1. Backend (Flask API)

Buksan ang **Terminal 1** at run:

```bash
cd backend
python app.py
```

**Expected output:**
```
* Serving Flask app 'app'
* Running on http://127.0.0.1:5001
```

✅ Backend is ready kapag nakita mo yan.

---

### 2. Frontend (React + Vite)

Buksan ang **Terminal 2** (bagong terminal) at run:

```bash
npm run dev
```

**Expected output:**
```
VITE ready in XXX ms
➜ Local: http://localhost:5173/
```

✅ Frontend is ready kapag nakita mo yan.

---

### 3. Open sa Browser

Buksan ang browser at pumunta sa:

- **Branch Portal**: http://localhost:5173
- **Admin Portal**: http://localhost:5173/admin

---

## Login Credentials

### Admin Portal
- **URL**: http://localhost:5173/admin
- **Username**: `admin.tdtpowersteel`
- **Password**: `TDTpowersteel2024`

### Branch Portal (Sales Rep)
- **URL**: http://localhost:5173
- **Username**: `manila.tdtpowersteel` (or any branch: batangas, cavite, cebu, davao, etc.)
- **Password**: `TDTpowersteel2024`
- **Branch**: `Manila` (or corresponding branch name)

---

## Troubleshooting

### Problem: "Port 5001 is already in use"

**Solution 1** — Kill the process:
```bash
# Find what's using port 5001
netstat -ano | findstr ":5001"

# Kill the process (replace XXXX with PID)
taskkill /PID XXXX /F
```

**Solution 2** — Use a different port:
```bash
# Edit backend/.env
FLASK_PORT=5002

# Edit vite.config.js
proxy: {
  '/api': 'http://localhost:5002'
}

# Edit frontend/src/api.js
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5002'
```

---

### Problem: "Database connection failed"

**Check kung running ang MySQL:**
```bash
# Check MySQL service
Get-Service -Name "*sql*"

# Or check process
Get-Process -Name "mysqld"
```

**Check database credentials sa `backend/.env`:**
```
DB_HOST=localhost
DB_NAME=tdt_crm
DB_USER=root
DB_PASSWORD=
```

**Test connection:**
```bash
cd backend
python -c "from database.database import get_db_connection; conn = get_db_connection(); print('Connected!' if conn else 'Failed')"
```

---

### Problem: "Module not found" errors

**Install Python dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

**Install Node dependencies:**
```bash
npm install
```

---

### Problem: Empty database / No users

**Bootstrap default users:**
```bash
cd backend
python -m database.bootstrap_users
```

**Rebuild database from schema:**
```bash
cd backend
python -m database.rebuild_db
```

⚠️ **Warning**: `rebuild_db` will DELETE all existing data!

---

## Development Workflow

### Daily Startup
1. Open 2 terminals
2. Terminal 1: `cd backend && python app.py`
3. Terminal 2: `npm run dev`
4. Open browser: http://localhost:5173

### Stopping the App
- Press `Ctrl+C` sa both terminals

---

## File Structure

```
TDT-CRM/
├── backend/
│   ├── app.py              ← Main Flask app (PREFERRED)
│   ├── .env                ← Environment variables
│   ├── requirements.txt    ← Python dependencies
│   └── database/
│       ├── schema.sql      ← Database schema
│       └── bootstrap_users.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx         ← Main app
│   │   ├── api.js          ← API client
│   │   └── views/          ← Pages
│   └── index.html
├── package.json            ← Node dependencies
└── vite.config.js          ← Vite config
```

---

## Common Commands

### Backend
```bash
# Start backend
cd backend
python app.py

# Rebuild database
python -m database.rebuild_db

# Bootstrap users
python -m database.bootstrap_users

# Reset passwords
python -m database.bootstrap_users --reset-passwords
```

### Frontend
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

---

## Environment Variables

**backend/.env:**
```env
DB_HOST=localhost
DB_NAME=tdt_crm
DB_USER=root
DB_PASSWORD=

JWT_SECRET_KEY=super-secret-key-change-in-production
FRONTEND_URL=http://localhost:5173
FLASK_PORT=5001
GOOGLE_CREDENTIALS_JSON_PATH=credentials.json
DEFAULT_BRANCH_PASSWORD=TDTpowersteel2024
DEFAULT_ADMIN_PASSWORD=TDTpowersteel2024
```

---

## Next Steps

1. ✅ App is running
2. Login using credentials above
3. Add data through the UI
4. Explore features:
   - Dashboard (5 KPIs)
   - Customer Database (Leads)
   - Pipeline (Deals)
   - Tasks (Activities)
   - Admin Portal (User management, Analytics)

---

## Need Help?

- Check `README.md` for detailed documentation
- Check `AGENTS.md` for development guidelines
- Check backend logs in Terminal 1
- Check frontend logs in Terminal 2 or browser console (F12)
