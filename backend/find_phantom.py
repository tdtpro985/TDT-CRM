import mysql.connector
conn = mysql.connector.connect(host='localhost', database='tdt_crm', user='root', password='')
cursor = conn.cursor()

cursor.execute("""
  SELECT c.id, c.name, c.owner_id, c.created_at, c.status
  FROM companies c
  WHERE c.name LIKE 'lead-%' OR c.name LIKE 'company-%'
  ORDER BY c.created_at DESC
""")
rows = cursor.fetchall()
print(f'Found {len(rows)} phantom companies:')
for r in rows:
    print(f'  ID={r[0]}, Name={r[1]}, owner_id={r[2]}, created_at={r[3]}, status={r[4]}')

if rows:
    phantom_ids = [r[0] for r in rows]
    placeholders = ','.join(['%s'] * len(phantom_ids))

    cursor.execute(f'SELECT company_id, COUNT(*) FROM contacts WHERE company_id IN ({placeholders}) GROUP BY company_id', phantom_ids)
    contacts_count = cursor.fetchall()
    print(f'\nContact associations: {contacts_count}')

    cursor.execute(f'SELECT company_id, COUNT(*) FROM deals WHERE company_id IN ({placeholders}) GROUP BY company_id', phantom_ids)
    deals_count = cursor.fetchall()
    print(f'Deal associations: {deals_count}')

    cursor.execute(f'SELECT id FROM leads WHERE id IN ({placeholders})', phantom_ids)
    lead_rows = cursor.fetchall()
    print(f'Lead associations: {len(lead_rows)}')

cursor.close()
conn.close()
