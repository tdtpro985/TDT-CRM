import json
import os
from datetime import datetime

from dotenv import load_dotenv

from .database import close_connection, get_db_connection

load_dotenv()


def backup_database(output_path=None):
    conn = get_db_connection()
    if not conn:
        raise RuntimeError('Failed to connect to database for backup.')

    try:
        cursor = conn.cursor()
        cursor.execute('SHOW TABLES')
        tables = [row[0] for row in cursor.fetchall()]

        backup = {
            'createdAt': f"{datetime.utcnow().isoformat()}Z",
            'database': os.getenv('DB_NAME', 'tdt_crm'),
            'tables': {},
        }

        for table in tables:
            cursor.execute(f'SELECT * FROM {table}')
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            backup['tables'][table] = {
                'columns': columns,
                'rows': [list(row) for row in rows],
            }

        if not output_path:
            output_path = os.path.join('..', 'backups', f"tdt_crm_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

        abs_output = os.path.abspath(output_path)
        os.makedirs(os.path.dirname(abs_output), exist_ok=True)
        with open(abs_output, 'w', encoding='utf-8') as f:
            json.dump(backup, f, default=str)

        return abs_output
    finally:
        close_connection(conn)


if __name__ == '__main__':
    print(backup_database())
