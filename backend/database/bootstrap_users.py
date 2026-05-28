import argparse
import os

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

from .database import close_connection, get_db_connection

load_dotenv()

DEFAULT_USERS = [
    {
        'username': 'manila.tdtpowersteel',
        'name': 'Manila Branch',
        'email': 'manila@tdt.com',
        'role': 'Branch Account',
        'branch': 'Manila',
        'region': 'Central',
    },
    {
        'username': 'batangas.tdtpowersteel',
        'name': 'Batangas Branch',
        'email': 'batangas@tdt.com',
        'role': 'Branch Account',
        'branch': 'Batangas',
        'region': 'Central',
    },
    {
        'username': 'cavite.tdtpowersteel',
        'name': 'Cavite Branch',
        'email': 'cavite@tdt.com',
        'role': 'Branch Account',
        'branch': 'Cavite',
        'region': 'Central',
    },
    {
        'username': 'cdo.tdtpowersteel',
        'name': 'CDO Branch',
        'email': 'cdo@tdt.com',
        'role': 'Branch Account',
        'branch': 'CDO',
        'region': 'Vis&Min',
    },
    {
        'username': 'cebu.tdtpowersteel',
        'name': 'Cebu Branch',
        'email': 'cebu@tdt.com',
        'role': 'Branch Account',
        'branch': 'Cebu',
        'region': 'Vis&Min',
    },
    {
        'username': 'davao.tdtpowersteel',
        'name': 'Davao Branch',
        'email': 'davao@tdt.com',
        'role': 'Branch Account',
        'branch': 'Davao',
        'region': 'Vis&Min',
    },
    {
        'username': 'isabela.tdtpowersteel',
        'name': 'Isabela Branch',
        'email': 'isabela@tdt.com',
        'role': 'Branch Account',
        'branch': 'Isabela',
        'region': 'North Luzon',
    },
    {
        'username': 'iloilo.tdtpowersteel',
        'name': 'Iloilo Branch',
        'email': 'iloilo@tdt.com',
        'role': 'Branch Account',
        'branch': 'Iloilo',
        'region': 'Vis&Min',
    },
    {
        'username': 'ilocos.tdtpowersteel',
        'name': 'Ilocos Branch',
        'email': 'ilocos@tdt.com',
        'role': 'Branch Account',
        'branch': 'Ilocos',
        'region': 'North Luzon',
    },
    {
        'username': 'gensan.tdtpowersteel',
        'name': 'Gensan Branch',
        'email': 'gensan@tdt.com',
        'role': 'Branch Account',
        'branch': 'Gensan',
        'region': 'Vis&Min',
    },
    {
        'username': 'legazpi.tdtpowersteel',
        'name': 'Legazpi Branch',
        'email': 'legazpi@tdt.com',
        'role': 'Branch Account',
        'branch': 'Legazpi',
        'region': 'Central',
    },
    {
        'username': 'palawan.tdtpowersteel',
        'name': 'Palawan Branch',
        'email': 'palawan@tdt.com',
        'role': 'Branch Account',
        'branch': 'Palawan',
        'region': 'Central',
    },
    {
        'username': 'powerstore.tdtpowersteel',
        'name': 'Powerstore Branch',
        'email': 'powerstore@tdt.com',
        'role': 'Branch Account',
        'branch': 'Powerstore',
        'region': 'Central',
    },
    {
        'username': 'admin.tdtpowersteel',
        'name': 'System Administrator',
        'email': 'admin@tdt.com',
        'role': 'Admin',
        'branch': 'Headquarters',
        'region': 'Central',
    },
]


def resolve_passwords(branch_password=None, admin_password=None):
    resolved_branch_password = branch_password or os.getenv('DEFAULT_BRANCH_PASSWORD') or 'TDTpowersteel2024'
    resolved_admin_password = admin_password or os.getenv('DEFAULT_ADMIN_PASSWORD') or resolved_branch_password
    return resolved_branch_password, resolved_admin_password


def ensure_default_users(reset_passwords=False, branch_password=None, admin_password=None):
    conn = get_db_connection()
    if not conn:
        print('Failed to connect to database.')
        return {'created': 0, 'passwords_reset': 0}

    branch_password, admin_password = resolve_passwords(branch_password, admin_password)
    created = 0
    passwords_reset = 0

    try:
        cursor = conn.cursor(dictionary=True)
        for user in DEFAULT_USERS:
            cursor.execute('SELECT id, username FROM team WHERE username = %s', (user['username'],))
            existing = cursor.fetchone()

            password_to_use = admin_password if user['role'] == 'Admin' else branch_password
            hashed_password = generate_password_hash(password_to_use)

            if not existing:
                cursor.execute(
                    '''
                    INSERT INTO team (username, password, name, email, role, branch, region)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ''',
                    (
                        user['username'],
                        hashed_password,
                        user['name'],
                        user['email'],
                        user['role'],
                        user['branch'],
                        user['region'],
                    ),
                )
                created += 1
                continue

            if reset_passwords:
                cursor.execute(
                    'UPDATE team SET password = %s, region = %s WHERE username = %s',
                    (hashed_password, user['region'], user['username']),
                )
                passwords_reset += 1

        conn.commit()
        return {'created': created, 'passwords_reset': passwords_reset}
    finally:
        close_connection(conn)


def main():
    parser = argparse.ArgumentParser(description='Ensure default CRM users exist across environments.')
    parser.add_argument(
        '--reset-passwords',
        action='store_true',
        help='Reset passwords for existing default users using provided/env defaults.',
    )
    parser.add_argument('--branch-password', help='Override default branch password for this run.')
    parser.add_argument('--admin-password', help='Override default admin password for this run.')
    args = parser.parse_args()

    result = ensure_default_users(
        reset_passwords=args.reset_passwords,
        branch_password=args.branch_password,
        admin_password=args.admin_password,
    )

    if args.reset_passwords:
        print(f"Done. Created users: {result['created']}, Passwords reset: {result['passwords_reset']}")
    else:
        print(f"Done. Created users: {result['created']}")


if __name__ == '__main__':
    main()
