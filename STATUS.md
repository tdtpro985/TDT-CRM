# TDT-CRM Current Status

**Date**: May 4, 2026  
**Status**: ✅ **FULLY OPERATIONAL**

---

## 🟢 Currently Running

| Service | Status | URL | Port |
|---------|--------|-----|------|
| Backend (Flask) | ✅ Running | http://localhost:5001 | 5001 |
| Frontend (Vite) | ✅ Running | http://localhost:5173 | 5173 (or 5175) |
| MySQL Database | ✅ Running | localhost | 3306 |

---

## 📋 Quick Access

### User Portals
- **Branch Portal**: http://localhost:5173
- **Admin Portal**: http://localhost:5173/admin

### Login Credentials
```
Admin:
  Username: admin.tdtpowersteel
  Password: TDTpowersteel2024

Branch (Manila):
  Username: manila.tdtpowersteel
  Password: TDTpowersteel2024
  Branch:   Manila
```

---

## 🗂️ Database Status

**Database**: `tdt_crm`  
**Tables**: 7 (team, companies, contacts, leads, deals, activities, audit_log)  
**Users**: 14 (1 admin + 13 branch users)  
**Data**: Empty (0 leads, 0 deals, 0 activities)

---

## 📁 Important Files

### Configuration
- `backend/.env` - Environment variables (DB, JWT, ports)
- `vite.config.js` - Frontend proxy config
- `frontend/src/api.js` - API base URL

### Startup Scripts
- `START-HERE.bat` - **Double-click to start everything**
- `start-backend.bat` - Start backend only
- `start-frontend.bat` - Start frontend only

### Documentation
- `QUICK-START.txt` - Quick reference card
- `SETUP.md` - Detailed setup guide
- `README.md` - Full project documentation
- `AGENTS.md` - Development guidelines

---

## 🔧 Recent Changes

1. ✅ Copied `.env` from `backend/env-credentials/` to `backend/`
2. ✅ Changed backend port from 5000 → 5001 (port 5000 was stuck)
3. ✅ Updated `vite.config.js` proxy to point to port 5001
4. ✅ Updated `frontend/src/api.js` default API_BASE to port 5001
5. ✅ Added `FLASK_PORT=5001` to `.env`
6. ✅ Modified `app.py` to read port from environment variable
7. ✅ Created startup batch files for easy launching

---

## 🚀 How to Run

### Option 1: Automatic (Recommended)
```bash
# Double-click this file:
START-HERE.bat
```

### Option 2: Manual
```bash
# Terminal 1 (Backend)
cd backend
python app.py

# Terminal 2 (Frontend)
npm run dev
```

### Option 3: Using batch files
```bash
# Terminal 1
start-backend.bat

# Terminal 2
start-frontend.bat
```

---

## 🛠️ Maintenance Commands

### Reset Database
```bash
cd backend
python -m database.rebuild_db
```

### Bootstrap Users
```bash
cd backend
python -m database.bootstrap_users
```

### Reset Passwords
```bash
cd backend
python -m database.bootstrap_users --reset-passwords
```

### Install Dependencies
```bash
# Python
cd backend
pip install -r requirements.txt

# Node
npm install
```

---

## 🐛 Known Issues

1. **Port 5000 stuck** - Fixed by moving to port 5001
2. **Empty database** - Normal for fresh install, add data via UI or run init_db
3. **Frontend on port 5175** - Normal if 5173/5174 are busy, Vite auto-increments

---

## ✅ What's Working

- ✅ Authentication (JWT-based, 8-hour sessions)
- ✅ Multi-branch data isolation
- ✅ Lead management (CRUD + status updates)
- ✅ Deal pipeline (Kanban board, stage updates)
- ✅ Task tracking (create, toggle status)
- ✅ Dashboard KPIs (5 metrics)
- ✅ Admin portal (user management, analytics)
- ✅ Branch filtering (all queries respect branch)
- ✅ Audit logging (status/stage changes)
- ✅ Responsive design (mobile-friendly)
- ✅ Search & filtering
- ✅ Pagination

---

## 📊 Database Schema

```
team (14 rows)
  - id, username, password, name, email, role, branch

companies (0 rows)
  - id, name, industry, website, city, owner, status, created_at

contacts (0 rows)
  - id, name, company_id, role, owner, email, phone, last_touch, status, created_at

leads (0 rows)
  - id, customer_name, contact_num, address, region, sr, branch, status, created_at

deals (0 rows)
  - id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner, created_at

activities (0 rows)
  - id, subject, type, owner, deal_id, due_date, priority, status, notes, created_at

audit_log (0 rows)
  - id, entity_type, entity_id, action, old_value, new_value, changed_at
```

---

## 🎯 Next Steps

### Option 1: Add Sample Data (Recommended for Testing)
```bash
# Double-click this file to add 10 sample deals:
ADD-SAMPLE-DATA.bat
```

This will add:
- 5 companies (ABC Construction, XYZ Manufacturing, etc.)
- 5 contacts (Juan, Maria, Pedro, Ana, Carlos)
- 10 deals across all pipeline stages (PHP 28.7M total value)

### Option 2: Add Data Manually
1. Login and explore the UI
2. Add your own data:
   - Create leads in Customer Database
   - Create deals in Pipeline
   - Create tasks in Tasks view
3. Test features:
   - Dashboard KPIs update automatically
   - Branch filtering works
   - Search and filters work
   - Admin portal shows analytics

---

## 📞 Support

If you encounter issues:
1. Check `SETUP.md` for troubleshooting
2. Check backend terminal for errors
3. Check browser console (F12) for frontend errors
4. Check MySQL is running: `Get-Service -Name "*sql*"`
5. Check ports are free: `netstat -ano | findstr ":5001"`

---

**Last Updated**: May 4, 2026 2:45 PM  
**Status**: Ready for use ✅
