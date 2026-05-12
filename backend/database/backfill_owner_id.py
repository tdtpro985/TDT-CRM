from .database import get_db_connection, close_connection


def backfill_all_owner_ids():
    conn = get_db_connection()
    if not conn:
        print('Failed to connect to database.')
        return

    try:
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE leads l
            JOIN companies c ON c.id = l.id
            JOIN team t ON LOWER(TRIM(t.name)) = LOWER(TRIM(c.owner))
                       AND LOWER(TRIM(t.branch)) = LOWER(TRIM(l.branch))
            SET l.owner_id = t.id
            WHERE l.owner_id IS NULL
        ''')
        leads_updated = cursor.rowcount

        cursor.execute('''
            UPDATE companies c
            JOIN leads l ON c.id = l.id
            JOIN team t ON LOWER(TRIM(t.name)) = LOWER(TRIM(c.owner))
                       AND LOWER(TRIM(t.branch)) = LOWER(TRIM(l.branch))
            SET c.owner_id = t.id
            WHERE c.owner_id IS NULL
        ''')
        companies_updated = cursor.rowcount

        conn.commit()
        print(f'Done. leads updated: {leads_updated}, companies updated: {companies_updated}')

        cursor.execute('''
            SELECT t.branch, t.name, COUNT(l.id) as leads
            FROM team t
            JOIN leads l ON l.owner_id = t.id
            WHERE t.role = 'Sales Representative'
            GROUP BY t.branch, t.name
            ORDER BY t.branch, leads DESC
        ''')
        print('\nSR lead counts after backfill:')
        for row in cursor.fetchall():
            print(f'  [{row[0]}] {row[1]:20} -> {row[2]} leads')

    finally:
        close_connection(conn)


if __name__ == '__main__':
    backfill_all_owner_ids()
