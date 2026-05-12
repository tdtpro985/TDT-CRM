import os
import argparse

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

from .database import get_db_connection, close_connection

load_dotenv()

MANILA_SRS = [
    {'username': 'mrky',  'name': 'Mrky',  'role': 'Head of Sales'},
    {'username': 'den',   'name': 'Den',   'role': 'Regional Sales Manager'},
    {'username': '1dan',  'name': '1Dan',  'role': 'Sales Representative'},
    {'username': '1jas',  'name': '1Jas',  'role': 'Sales Representative'},
    {'username': '1jems', 'name': '1Jems', 'role': 'Sales Representative'},
    {'username': 'abi',   'name': 'Abi',   'role': 'Sales Representative'},
    {'username': 'aga',   'name': 'Aga',   'role': 'Sales Representative'},
    {'username': 'central', 'name': 'Central', 'role': 'Sales Representative'},
    {'username': 'che',   'name': 'Che',   'role': 'Sales Representative'},
    {'username': 'dlm',   'name': 'DLM',   'role': 'Sales Representative'},
    {'username': 'ema',   'name': 'Ema',   'role': 'Sales Representative'},
    {'username': 'fmar',  'name': 'FMAR',  'role': 'Sales Representative'},
    {'username': 'gen',   'name': 'Gen',   'role': 'Sales Representative'},
    {'username': 'jhn',   'name': 'Jhn',   'role': 'Sales Representative'},
    {'username': 'knd',   'name': 'KND',   'role': 'Sales Representative'},
    {'username': 'kim',   'name': 'Kim',   'role': 'Sales Representative'},
    {'username': 'lpc',   'name': 'LPC',   'role': 'Sales Representative'},
    {'username': 'mat',   'name': 'Mat',   'role': 'Sales Representative'},
    {'username': 'mav',   'name': 'Mav',   'role': 'Sales Representative'},
    {'username': 'mel',   'name': 'Mel',   'role': 'Sales Representative'},
    {'username': 'mldy',  'name': 'Mldy',  'role': 'Sales Representative'},
    {'username': 'nes',   'name': 'Nes',   'role': 'Sales Representative'},
    {'username': 'tdt',   'name': 'TDT',   'role': 'Sales Representative'},
    {'username': 'van',   'name': 'Van',   'role': 'Sales Representative'},
    {'username': 'vic',   'name': 'Vic',   'role': 'Sales Representative'},
]


def seed_manila_srs(password=None, reset_passwords=False):
    default_password = password or os.getenv('DEFAULT_BRANCH_PASSWORD') or 'TDTpowersteel2024'
    conn = get_db_connection()
    if not conn:
        print('Failed to connect to database.')
        return

    created = 0
    updated = 0

    try:
        cursor = conn.cursor(dictionary=True)
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
        print(f'Done. Created: {created}, Updated: {updated}')
    finally:
        close_connection(conn)


def main():
    parser = argparse.ArgumentParser(description='Seed Manila SR accounts into the team table.')
    parser.add_argument('--reset-passwords', action='store_true', help='Reset passwords and roles for existing SR accounts.')
    parser.add_argument('--password', help='Override default password for this run.')
    args = parser.parse_args()
    seed_manila_srs(password=args.password, reset_passwords=args.reset_passwords)


if __name__ == '__main__':
    main()
