import os
from .database import get_db_connection, close_connection

def migrate_owner_ids():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return

    try:
        cursor = conn.cursor(dictionary=True)
        print("Starting owner_id cross-reference migration...")

        # 1. Fetch all team members for mapping
        cursor.execute("SELECT id, name, username, branch FROM team")
        team = cursor.fetchall()
        
        # Map by Name (primary) and Username (fallback)
        name_map = {t['name'].lower(): t['id'] for t in team}
        user_map = {t['username'].lower(): t['id'] for t in team}

        def get_team_id(identifier):
            if not identifier: return None
            val = identifier.strip().lower()
            return name_map.get(val) or user_map.get(val)

        # 2. Migrate Leads
        print("Processing Leads...")
        cursor.execute("SELECT id, sr FROM leads WHERE owner_id IS NULL")
        leads = cursor.fetchall()
        for lead in leads:
            tid = get_team_id(lead['sr'])
            if tid:
                cursor.execute("UPDATE leads SET owner_id = %s WHERE id = %s", (tid, lead['id']))
        print(f"  [OK] Processed {len(leads)} leads")

        # 3. Migrate Companies
        print("Processing Companies...")
        cursor.execute("SELECT id, owner FROM companies WHERE owner_id IS NULL")
        comps = cursor.fetchall()
        for comp in comps:
            tid = get_team_id(comp['owner'])
            if tid:
                cursor.execute("UPDATE companies SET owner_id = %s WHERE id = %s", (tid, comp['id']))
        print(f"  [OK] Processed {len(comps)} companies")

        # 4. Migrate Contacts
        print("Processing Contacts...")
        cursor.execute("SELECT id, owner FROM contacts WHERE owner_id IS NULL")
        conts = cursor.fetchall()
        for cont in conts:
            tid = get_team_id(cont['owner'])
            if tid:
                cursor.execute("UPDATE contacts SET owner_id = %s WHERE id = %s", (tid, cont['id']))
        print(f"  [OK] Processed {len(conts)} contacts")

        # 5. Migrate Deals
        print("Processing Deals...")
        cursor.execute("SELECT id, owner, contact_id FROM deals WHERE owner_id IS NULL")
        deals = cursor.fetchall()
        for deal in deals:
            tid = get_team_id(deal['owner'])
            if tid:
                cursor.execute("UPDATE deals SET owner_id = %s WHERE id = %s", (tid, deal['id']))
            
            # 6. Bootstrap many-to-many deal_contacts
            if deal['contact_id']:
                cursor.execute("""
                    INSERT IGNORE INTO deal_contacts (deal_id, contact_id, role)
                    VALUES (%s, %s, 'Primary')
                """, (deal['id'], deal['contact_id']))
        print(f"  [OK] Processed {len(deals)} deals and bootstrapped associations")

        conn.commit()
        print("\nMigration complete. New schema fields are now synchronized with legacy data.")

    except Exception as e:
        print(f"Critical error during migration: {e}")
        conn.rollback()
    finally:
        close_connection(conn)

if __name__ == '__main__':
    migrate_owner_ids()
