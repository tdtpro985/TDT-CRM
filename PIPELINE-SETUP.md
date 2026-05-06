# Pipeline Setup Guide

## Paganahin ang Pipeline (Make Pipeline Work)

Ang pipeline ay empty kasi walang deals sa database. Kailangan mong magdagdag ng data para makita kung paano gumagana.

---

## Quick Setup (2 Steps)

### Step 1: Start the App
```bash
# Double-click this file:
START-HERE.bat
```

### Step 2: View Pipeline
1. Open browser: http://localhost:5173
2. Login:
   - Username: `manila.tdtpowersteel`
   - Password: `TDTpowersteel2024`
   - Branch: `Manila`
3. Click **Pipeline** in sidebar
4. Add deals manually to see them in the pipeline

---

## Troubleshooting

### Problem: "No deals in this stage for the current filter"

**Solution 1**: Confirm you created deals
```sql
-- Run in MySQL:
SELECT COUNT(*) FROM deals;
```

**Solution 2**: Check branch filtering
- Make sure you're logged in as Manila branch

### Problem: MySQL password error

**Solution**: Check your MySQL root password
- Default is usually empty or `root`
- Check `backend/.env` for `DB_PASSWORD`

### Problem: Database not found

**Solution**: Create database first
```bash
cd backend
python -m database.rebuild_db
```

---

## Adding More Deals

### Via UI (Recommended)
1. Go to Pipeline view
2. Click "New deal" button (top right)
3. Fill in the form:
   - Deal name (required)
   - Company (select from dropdown)
   - Owner (select team member)
   - Value (in PHP)
   - Expected close date
   - Stage (defaults to "New Opportunity")
4. Click "Create deal"

### Via API (For Developers)
```bash
# POST /api/deals
curl -X POST http://localhost:5001/api/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": "deal_custom_001",
    "name": "My Custom Deal",
    "companyId": "comp_001",
    "contactId": "cont_001",
    "stage": "New Opportunity",
    "value": 1000000,
    "closeDate": "2026-06-30",
    "owner": "Alex Rivera"
  }'
```

---

## Next Steps

Once pipeline is working:

1. **Test drag-and-drop** (future feature)
2. **Add more stages** (customize in constants.js)
3. **Add filters** (by owner, value range, date)
4. **Add sorting** (by value, date, name)
5. **Add export** (CSV, PDF reports)
6. **Add analytics** (conversion rates, win rates)

---

## Files Reference

- **Pipeline View**: `frontend/src/views/PipelineView.jsx`
- **Pipeline Styles**: `frontend/src/styles/views.css`
- **API Routes**: `backend/app.py` (lines 600-700)

---

**Status**: Ready to use! 🚀  
**Last Updated**: May 4, 2026

