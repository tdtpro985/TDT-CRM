import os
import argparse

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

from .database import get_db_connection, close_connection

load_dotenv()

MANILA_SRS = [
    # Management — Head of Sales (Jasmin) and Regional Sales Manager (Marky)
    {'username': 'jasmin', 'name': 'Jasmin', 'role': 'Head of Sales'},
    {'username': 'marky',  'name': 'Marky',  'role': 'Regional Sales Manager'},
    # Sales Representatives
    {'username': 'melody', 'name': 'Melody', 'role': 'Sales Representative'},
    {'username': 'emma',   'name': 'Emma',   'role': 'Sales Representative'},
    {'username': 'karen',  'name': 'Karen',  'role': 'Sales Representative'},
    {'username': 'aga',    'name': 'Aga',    'role': 'Sales Representative'},
    {'username': 'loren',  'name': 'Loren',  'role': 'Sales Representative'},
    {'username': 'dennis', 'name': 'Dennis', 'role': 'Sales Representative'},
    {'username': 'justin', 'name': 'Justin', 'role': 'Sales Representative'},
]


def seed_manila_srs(password=None, reset_passwords=False, replace=False):
    default_password = password or os.getenv('DEFAULT_BRANCH_PASSWORD') or 'TDTpowersteel2024'
    conn = get_db_connection()
    if not conn:
        print('Failed to connect to database.')
        return

    created = 0
    updated = 0
    deleted = 0

    try:
        cursor = conn.cursor(dictionary=True)

        if replace:
            # Wipe the old Manila roster (SRs + management) before recreating.
            # Branch Account login and Admin are untouched. Customer owner_id
            # is nulled via ON DELETE SET NULL — managers reassign afterward.
            cursor.execute(
                '''DELETE FROM team
                   WHERE branch = %s
                     AND role IN ('Sales Representative', 'Head of Sales', 'Regional Sales Manager')''',
                ('Manila',),
            )
            deleted = cursor.rowcount
            conn.commit()

        for sr in MANILA_SRS:
            cursor.execute('SELECT id FROM team WHERE username = %s', (sr['username'],))
            existing = cursor.fetchone()
            hashed = generate_password_hash(default_password)

            if not existing:
                email = f"{sr['username']}@manila.tdt.internal"
                cursor.execute(
                    '''INSERT INTO team (username, password, name, email, role, branch, region)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)''',
                    (sr['username'], hashed, sr['name'], email, sr['role'], 'Manila', 'Central'),
                )
                created += 1
            elif reset_passwords:
                cursor.execute(
                    'UPDATE team SET password = %s, role = %s WHERE username = %s',
                    (hashed, sr['role'], sr['username']),
                )
                updated += 1

        conn.commit()
        print(f'Done. Deleted: {deleted}, Created: {created}, Updated: {updated}')
    finally:
        close_connection(conn)


def main():
    parser = argparse.ArgumentParser(description='Seed Manila SR accounts into the team table.')
    parser.add_argument('--reset-passwords', action='store_true', help='Reset passwords and roles for existing SR accounts.')
    parser.add_argument('--replace', action='store_true', help='Delete the existing Manila SR + management accounts first, then recreate the roster fresh.')
    parser.add_argument('--password', help='Override default password for this run.')
    args = parser.parse_args()
    seed_manila_srs(password=args.password, reset_passwords=args.reset_passwords, replace=args.replace)


if __name__ == '__main__':
    main()
