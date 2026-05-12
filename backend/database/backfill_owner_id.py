from .database import get_db_connection, close_connection


def backfill_manila_owner_ids():
    conn = get_db_connection()
    if not conn:
        print('Failed to connect to database.')
        return

    try:
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE leads l
            JOIN companies c ON c.id = l.id
            JOIN team t ON LOWER(TRIM(t.name)) = LOWER(TRIM(c.owner)) AND t.branch = 'Manila'
            SET l.owner_id = t.id
            WHERE l.owner_id IS NULL AND LOWER(TRIM(l.branch)) = 'manila'
        ''')
        leads_updated = cursor.rowcount

        cursor.execute('''
            UPDATE companies c
            JOIN leads l ON c.id = l.id
            JOIN team t ON LOWER(TRIM(t.name)) = LOWER(TRIM(c.owner)) AND t.branch = 'Manila'
            SET c.owner_id = t.id
            WHERE c.owner_id IS NULL AND LOWER(TRIM(l.branch)) = 'manila'
        ''')
        companies_updated = cursor.rowcount

        conn.commit()
        print(f'Done. leads updated: {leads_updated}, companies updated: {companies_updated}')

        # Summary per SR
        cursor.execute('''
            SELECT t.name, COUNT(l.id) as leads
            FROM team t
            JOIN leads l ON l.owner_id = t.id
            WHERE t.branch = 'Manila' AND t.role = 'Sales Representative'
            GROUP BY t.name
            ORDER BY leads DESC
        ''')
        print('\nSR lead counts after backfill:')
        for row in cursor.fetchall():
            print(f'  {row[0]:12} -> {row[1]} leads')

    finally:
        close_connection(conn)


if __name__ == '__main__':
    backfill_manila_owner_ids()
