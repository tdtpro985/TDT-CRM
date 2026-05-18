from .database import get_db_connection, close_connection


def backfill_all_owner_ids():
    conn = get_db_connection()
    if not conn:
        print('Failed to connect to database.')
        return

    try:
        cursor = conn.cursor()

        # 1. Backfill leads from companies where lead has no owner but company does
        cursor.execute('''
            UPDATE leads l
            JOIN companies c ON c.id = l.id
            SET l.owner_id = c.owner_id
            WHERE l.owner_id IS NULL AND c.owner_id IS NOT NULL
        ''')
        leads_from_companies = cursor.rowcount

        # 2. Backfill leads/companies from team using name/branch strings (Legacy GSheets data)
        cursor.execute('''
            UPDATE leads l
            JOIN companies c ON c.id = l.id
            JOIN team t ON LOWER(TRIM(t.name)) = LOWER(TRIM(c.owner))
                       AND LOWER(TRIM(t.branch)) = LOWER(TRIM(l.branch))
            SET l.owner_id = t.id, c.owner_id = t.id
            WHERE l.owner_id IS NULL OR c.owner_id IS NULL
        ''')
        string_match_updated = cursor.rowcount

        # 3. Sync owner_id to contacts from parent lead/company
        cursor.execute('''
            UPDATE contacts c
            JOIN leads l ON l.id = c.company_id
            SET c.owner_id = l.owner_id
            WHERE c.owner_id IS NULL AND l.owner_id IS NOT NULL
        ''')
        contacts_updated = cursor.rowcount

        # 4. Sync owner_id to deals from parent lead/company
        cursor.execute('''
            UPDATE deals d
            JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
            SET d.owner_id = l.owner_id
            WHERE d.owner_id IS NULL AND l.owner_id IS NOT NULL
        ''')
        deals_updated = cursor.rowcount

        conn.commit()
        print(f'Done backfill:')
        print(f'  Leads synced from companies: {leads_from_companies}')
        print(f'  String match (name/branch) updates: {string_match_updated}')
        print(f'  Contacts synced from leads: {contacts_updated}')
        print(f'  Deals synced from leads: {deals_updated}')

        cursor.execute('''
            SELECT t.branch, t.name, COUNT(l.id) as leads
            FROM team t
            JOIN leads l ON l.owner_id = t.id
            WHERE t.role IN ('Sales Representative', 'Sales Rep')
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
