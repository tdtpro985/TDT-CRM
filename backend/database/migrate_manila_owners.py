"""One-shot migration: re-link Manila customers to the current SR roster.

Background: the old numeric-prefix Manila SR accounts were deleted and replaced
with new plain-name accounts. The customer rows, however, still carry owner_id
values that point at the deleted team rows, so the new SRs see none of their
customers. The Excel `owner_name` column (legacy `1X` strings) is the real
source of truth, so we re-link ownership from it.

This also renames the Head of Sales account markyhos -> jasmin (Jasmin), since
the HoS is now Jasmin (a separate person from Marky, the RSM).

Legacy owners NOT in MAPPING (1Vic, 1Kim, 1Abi, ...) are intentionally left
untouched. Karen / Loren / Justin have no legacy Excel rows and start empty.

Idempotent — safe to re-run (it matches on the stable owner_name string).

Usage (from backend/):  py -m database.migrate_manila_owners
"""

from .database import get_db_connection, close_connection

BRANCH = 'Manila'

# Excel owner_name (matched case-insensitively) -> current team username
MAPPING = {
    '1Mrky': 'marky',    # Regional Sales Manager
    '1Ema':  'emma',
    '1Den':  'dennis',
    '1Mldy': 'melody',
    '1Aga':  'aga',
    '1Jas':  'jasmin',   # Head of Sales
}


def migrate():
    conn = get_db_connection()
    if not conn:
        print('Failed to connect to database.')
        return

    try:
        cursor = conn.cursor()

        # 1. Rename the HoS account markyhos -> jasmin (idempotent).
        cursor.execute(
            "UPDATE team SET username = 'jasmin', name = 'Jasmin' "
            "WHERE username = 'markyhos' AND branch = %s",
            (BRANCH,),
        )
        if cursor.rowcount:
            print('Renamed HoS account markyhos -> jasmin (Jasmin).')

        # 2. Build username -> id for the current Manila roster.
        cursor.execute('SELECT id, username FROM team WHERE branch = %s', (BRANCH,))
        ids = {username: tid for tid, username in cursor.fetchall()}

        # 3. Force-relink ownership for each mapped Excel name across every layer
        #    that shares the lead UUID. Plain SET (not "WHERE owner_id IS NULL")
        #    because current values are stale dead IDs that must be overwritten.
        print('\nRe-linking customers:')
        for excel_name, username in MAPPING.items():
            tid = ids.get(username)
            if not tid:
                print(f'  ! No account for username {username!r} — skipped {excel_name}')
                continue

            # leads
            cursor.execute(
                'UPDATE leads SET owner_id = %s '
                'WHERE branch = %s AND LOWER(TRIM(owner_name)) = LOWER(%s)',
                (tid, BRANCH, excel_name),
            )
            leads_n = cursor.rowcount

            # companies (share the lead UUID)
            cursor.execute(
                'UPDATE companies c JOIN leads l ON c.id = l.id SET c.owner_id = %s '
                'WHERE l.branch = %s AND LOWER(TRIM(l.owner_name)) = LOWER(%s)',
                (tid, BRANCH, excel_name),
            )

            # contacts (company_id == lead UUID)
            cursor.execute(
                'UPDATE contacts ct JOIN leads l ON l.id = ct.company_id SET ct.owner_id = %s '
                'WHERE l.branch = %s AND LOWER(TRIM(l.owner_name)) = LOWER(%s)',
                (tid, BRANCH, excel_name),
            )

            # deals
            cursor.execute(
                'UPDATE deals d JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id) '
                'SET d.owner_id = %s '
                'WHERE l.branch = %s AND LOWER(TRIM(l.owner_name)) = LOWER(%s)',
                (tid, BRANCH, excel_name),
            )

            # activities (tasks) via their deal
            cursor.execute(
                'UPDATE activities a JOIN deals d ON a.deal_id = d.id '
                'JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id) '
                'SET a.owner_id = %s '
                'WHERE l.branch = %s AND LOWER(TRIM(l.owner_name)) = LOWER(%s)',
                (tid, BRANCH, excel_name),
            )

            print(f'  {excel_name:6} -> {username:8} (id {tid}): {leads_n} leads')

        conn.commit()

        # 4. Final per-SR lead totals for the Manila roster.
        cursor.execute(
            'SELECT t.name, t.role, COUNT(l.id) AS leads '
            'FROM team t LEFT JOIN leads l ON l.owner_id = t.id '
            'WHERE t.branch = %s '
            'GROUP BY t.id, t.name, t.role ORDER BY leads DESC',
            (BRANCH,),
        )
        print('\nManila lead counts after migration:')
        for name, role, leads in cursor.fetchall():
            print(f'  {name:12} [{role:24}] -> {leads} leads')

    finally:
        close_connection(conn)


if __name__ == '__main__':
    migrate()
