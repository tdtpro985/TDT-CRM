# Pipeline Setup Guide

## Paganahin ang Pipeline (Make Pipeline Work)

Ang pipeline ay empty kasi walang deals sa database. Kailangan natin ng sample data para makita kung paano gumagana.

---

## Quick Setup (3 Steps)

### Step 1: Add Sample Data

**Option A: Using Batch File (Easiest)**
```bash
# Double-click this file:
add-sample-data.bat

# Enter your MySQL root password when prompted
```

**Option B: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to your database
3. Open file: `backend/database/sample_deals.sql`
4. Click "Execute" (⚡ icon)

**Option C: Using Command Line**
```bash
cd backend/database
mysql -u root -p tdt_crm < sample_deals.sql
```

### Step 2: Start the App
```bash
# Double-click this file:
START-HERE.bat
```

### Step 3: View Pipeline
1. Open browser: http://localhost:5173
2. Login:
   - Username: `manila.tdtpowersteel`
   - Password: `TDTpowersteel2024`
   - Branch: `Manila`
3. Click **Pipeline** in sidebar
4. You should now see deals! 🎉

---

## What Sample Data Includes

### 📦 5 Companies
- ABC Construction Corp
- XYZ Manufacturing Inc
- BuildPro Developers
- SteelWorks Philippines
- MegaBuilders Inc

### 👥 5 Contacts
- Juan Dela Cruz (ABC Construction)
- Maria Santos (XYZ Manufacturing)
- Pedro Reyes (BuildPro)
- Ana Garcia (SteelWorks)
- Carlos Mendoza (MegaBuilders)

### 💼 10 Deals (Across All Stages)

| Stage | Deals | Total Value |
|-------|-------|-------------|
| New Opportunity | 2 | PHP 3.7M |
| Qualified | 2 | PHP 5.3M |
| Proposal | 2 | PHP 7.0M |
| Negotiation | 2 | PHP 9.0M |
| Closed Won | 2 | PHP 3.7M |

**Total Pipeline Value**: PHP 28.7M

---

## Pipeline Features You Can Test

### ✅ Kanban Board
- See deals organized by stage
- Each column shows stage name, deal count, and total value
- Deals show: name, company, owner, value, probability, close date

### ✅ Deal Details Modal
- Click "View details" on any deal card
- See full deal information
- View stage progress bar
- Move deals between stages using footer buttons

### ✅ Stage Totals (Below Pipeline)
- Horizontal cards showing summary per stage
- Hover effects
- Responsive grid layout

### ✅ Metrics (Top KPIs)
- Active deals count
- Pipeline value (total)
- Average deal size
- Closing this month

### ✅ Stage Filter
- Filter deals by specific stage
- "All stages" shows everything

### ✅ Pagination
- Each column shows 2 deals per page
- Use Prev/Next buttons to navigate
- Shows current page / total pages

---

## Troubleshooting

### Problem: "No deals in this stage for the current filter"

**Solution 1**: Check if sample data was added
```sql
-- Run in MySQL:
SELECT COUNT(*) FROM deals;
-- Should return 10
```

**Solution 2**: Check branch filtering
- Make sure you're logged in as Manila branch
- Sample deals are not linked to specific branches yet

**Solution 3**: Add branch to sample deals
```sql
-- Run in MySQL to link deals to Manila branch:
UPDATE leads SET branch = 'Manila' WHERE id IN (
  SELECT DISTINCT company_id FROM deals
);
```

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

- **Sample Data SQL**: `backend/database/sample_deals.sql`
- **Batch File**: `add-sample-data.bat`
- **Pipeline View**: `frontend/src/views/PipelineView.jsx`
- **Pipeline Styles**: `frontend/src/styles/views.css`
- **API Routes**: `backend/app.py` (lines 600-700)

---

**Status**: Ready to use! 🚀  
**Last Updated**: May 4, 2026

