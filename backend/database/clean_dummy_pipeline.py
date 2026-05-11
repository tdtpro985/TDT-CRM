from database.database import get_db_connection, close_connection

def clean_dummy_pipeline():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return

    try:
        cursor = conn.cursor()
        print("Identifying dummy deals created by sync_pipeline...")

        # 1. Identify deals that have activities with 'Automatic task generated'
        cursor.execute("""
            SELECT DISTINCT deal_id 
            FROM activities 
            WHERE notes LIKE '%Automatic task generated%'
              AND deal_id IS NOT NULL
        """)
        dummy_deal_ids = [row[0] for row in cursor.fetchall()]

        if not dummy_deal_ids:
            print("No dummy deals found to clean up.")
            return

        print(f"Found {len(dummy_deal_ids)} dummy deals.")

        # 2. Get the lead_ids associated with these deals so we can revert them
        format_strings = ','.join(['%s'] * len(dummy_deal_ids))
        cursor.execute(f"SELECT DISTINCT lead_id FROM deals WHERE id IN ({format_strings}) AND lead_id IS NOT NULL", tuple(dummy_deal_ids))
        lead_ids = [row[0] for row in cursor.fetchall()]

        # 3. Revert leads to 'New' status
        if lead_ids:
            lead_format = ','.join(['%s'] * len(lead_ids))
            cursor.execute(f"UPDATE leads SET status = 'New' WHERE id IN ({lead_format})", tuple(lead_ids))
            print(f"  [OK] Reverted {cursor.rowcount} leads back to 'New' status.")

        # 4. Delete the dummy deals (this will cascade to activities and deal_contacts via foreign keys)
        cursor.execute(f"DELETE FROM deals WHERE id IN ({format_strings})", tuple(dummy_deal_ids))
        print(f"  [OK] Deleted {cursor.rowcount} dummy deals and their associated tasks.")

        conn.commit()
        print("\nCleanup complete. The pipeline is now restored to its previous state.")

    except Exception as e:
        print(f"Error during cleanup: {e}")
        conn.rollback()
    finally:
        close_connection(conn)

if __name__ == '__main__':
    clean_dummy_pipeline()
