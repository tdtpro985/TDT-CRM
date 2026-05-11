from database.database import get_db_connection, close_connection
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM leads WHERE sr LIKE '%manila%'")
print(f'Leads with manila in SR: {cursor.fetchone()[0]}')
cursor.execute("SELECT id FROM team WHERE username = 'manila.tdtpowersteel'")
res = cursor.fetchone()
if res:
    print(f'Ghost team member ID: {res[0]}')
    cursor.execute(f"SELECT COUNT(*) FROM leads WHERE owner_id = {res[0]}")
    print(f'Leads linked to ghost team member: {cursor.fetchone()[0]}')
    cursor.execute(f"SELECT COUNT(*) FROM deals WHERE owner_id = {res[0]}")
    print(f'Deals linked to ghost team member: {cursor.fetchone()[0]}')
else:
    print('Ghost team member not found.')
close_connection(conn)
