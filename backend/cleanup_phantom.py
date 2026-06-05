"""Delete phantom companies (name is an ID string) and their linked deals/tasks."""
import mysql.connector

conn = mysql.connector.connect(host='localhost', database='tdt_crm', user='root', password='')
cursor = conn.cursor()

# Find phantom companies
cursor.execute("""
  SELECT c.id, c.name
  FROM companies c
  WHERE c.name LIKE 'lead-%' OR c.name LIKE 'company-%'
  ORDER BY c.created_at DESC
""")
rows = cursor.fetchall()
print(f'Found {len(rows)} phantom companies:')
for r in rows:
    print(f'  ID={r[0]}, Name={r[1]}')

if not rows:
    print('Nothing to clean up.')
    cursor.close()
    conn.close()
    exit()

phantom_ids = [r[0] for r in rows]
placeholders = ','.join(['%s'] * len(phantom_ids))

# Find deals linked to phantom companies
cursor.execute(f'SELECT id, name FROM deals WHERE company_id IN ({placeholders})', phantom_ids)
deal_rows = cursor.fetchall()
deal_ids = [d[0] for d in deal_rows]
print(f'\nLinked deals ({len(deal_ids)}):')
for d in deal_rows:
    print(f'  ID={d[0]}, Name={d[1]}')

deal_ph = ','.join(['%s'] * len(deal_ids)) if deal_ids else 'NULL'

# Find activities linked to those deals
if deal_ids:
    cursor.execute(f'SELECT id, subject FROM activities WHERE deal_id IN ({deal_ph})', deal_ids)
    activity_rows = cursor.fetchall()
    activity_ids = [a[0] for a in activity_rows]
    print(f'Linked activities: {len(activity_ids)}')
    for a in activity_rows:
        print(f'  ID={a[0]}, Subject={a[1]}')
else:
    activity_ids = []

# Find contacts linked to phantom companies
cursor.execute(f'SELECT id, name FROM contacts WHERE company_id IN ({placeholders})', phantom_ids)
contact_rows = cursor.fetchall()
print(f'\nLinked contacts ({len(contact_rows)}):')
for c in contact_rows:
    print(f'  ID={c[0]}, Name={c[1]}')

# --- DELETE operations ---
print('\n--- Performing deletion ---')

# 1. Delete activities linked to phantom deals
if activity_ids:
    act_ph = ','.join(['%s'] * len(activity_ids))
    cursor.execute(f'DELETE FROM activities WHERE id IN ({act_ph})', activity_ids)
    print(f'Deleted {cursor.rowcount} activities')

# 2. Delete deal_contacts and deal_attachments (cascading)
if deal_ids:
    cursor.execute(f'DELETE FROM deal_contacts WHERE deal_id IN ({deal_ph})', deal_ids)
    print(f'Deleted {cursor.rowcount} deal_contacts')
    # deal_attachments may not exist in all databases
    cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'tdt_crm' AND table_name = 'deal_attachments'")
    if cursor.fetchone()[0] > 0:
        cursor.execute(f'DELETE FROM deal_attachments WHERE deal_id IN ({deal_ph})', deal_ids)
        print(f'Deleted {cursor.rowcount} deal_attachments')

# 3. Delete the deals
if deal_ids:
    cursor.execute(f'DELETE FROM deals WHERE id IN ({deal_ph})', deal_ids)
    print(f'Deleted {cursor.rowcount} deals')

# 4. Delete contacts
if contact_rows:
    con_ids = [c[0] for c in contact_rows]
    con_ph = ','.join(['%s'] * len(con_ids))
    cursor.execute(f'DELETE FROM contacts WHERE id IN ({con_ph})', con_ids)
    print(f'Deleted {cursor.rowcount} contacts')

# 5. Delete phantom leads (same ID as phantom companies)
cursor.execute(f'DELETE FROM leads WHERE id IN ({placeholders})', phantom_ids)
print(f'Deleted {cursor.rowcount} leads')

# 6. Delete phantom companies
cursor.execute(f'DELETE FROM companies WHERE id IN ({placeholders})', phantom_ids)
print(f'Deleted {cursor.rowcount} companies')

conn.commit()
print('\nCleanup complete!')

cursor.close()
conn.close()
