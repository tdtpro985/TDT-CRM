from database.database import get_db_connection, close_connection

def delete_ghosts():
    conn = get_db_connection()
    if not conn: return
    try:
        cursor = conn.cursor()
        print('Deleting ghost records...')
        
        # 1. Activities
        cursor.execute("DELETE FROM activities WHERE owner = 'manila.tdtpowersteel'")
        print(f"  Activities deleted: {cursor.rowcount}")
        
        # 2. Deals
        # Use a join or subquery to delete deals linked to ghost leads
        cursor.execute("DELETE FROM deals WHERE owner = 'manila.tdtpowersteel' OR lead_id IN (SELECT id FROM leads WHERE sr = 'manila.tdtpowersteel')")
        print(f"  Deals deleted: {cursor.rowcount}")
        
        # 3. Contacts
        cursor.execute("DELETE FROM contacts WHERE owner = 'manila.tdtpowersteel' OR company_id IN (SELECT id FROM leads WHERE sr = 'manila.tdtpowersteel')")
        print(f"  Contacts deleted: {cursor.rowcount}")
        
        # 4. Companies
        cursor.execute("DELETE FROM companies WHERE owner = 'manila.tdtpowersteel' OR id IN (SELECT id FROM leads WHERE sr = 'manila.tdtpowersteel')")
        print(f"  Companies deleted: {cursor.rowcount}")
        
        # 5. Leads (Final)
        cursor.execute("DELETE FROM leads WHERE sr = 'manila.tdtpowersteel'")
        print(f"  Leads deleted: {cursor.rowcount}")
        
        conn.commit()
        print('Ghost cleanup complete.')
    except Exception as e:
        print(f"Error during ghost cleanup: {e}")
        conn.rollback()
    finally:
        close_connection(conn)

if __name__ == '__main__':
    delete_ghosts()
