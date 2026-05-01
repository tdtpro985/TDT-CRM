import os

from dotenv import load_dotenv

from .database import close_connection, get_db_connection

load_dotenv()


def table_exists(cursor, table_name):
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = %s AND table_name = %s
        """,
        (os.getenv('DB_NAME', 'tdt_crm'), table_name),
    )
    return cursor.fetchone() is not None


def column_exists(cursor, table_name, column_name):
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s AND column_name = %s
        """,
        (os.getenv('DB_NAME', 'tdt_crm'), table_name, column_name),
    )
    return cursor.fetchone() is not None


def ensure_table(cursor, name, create_sql):
    if not table_exists(cursor, name):
        cursor.execute(create_sql)


def ensure_column(cursor, table_name, column_name, ddl):
    if not column_exists(cursor, table_name, column_name):
        cursor.execute(f'ALTER TABLE {table_name} ADD COLUMN {ddl}')


def ensure_schema():
    conn = get_db_connection()
    if not conn:
        print('Failed to connect to database.')
        return

    try:
        cursor = conn.cursor()

        ensure_table(
            cursor,
            'leads',
            '''
            CREATE TABLE leads (
                id            VARCHAR(100) PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                contact_num   VARCHAR(255),
                address       TEXT,
                region        VARCHAR(100),
                sr            VARCHAR(255),
                branch        VARCHAR(100),
                status        VARCHAR(50)  DEFAULT 'New',
                created_at    DATE         DEFAULT (CURRENT_DATE)
            )
            ''',
        )

        ensure_table(
            cursor,
            'audit_log',
            '''
            CREATE TABLE audit_log (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                entity_type VARCHAR(50),
                entity_id   VARCHAR(100),
                action      VARCHAR(100),
                old_value   TEXT,
                new_value   TEXT,
                changed_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            ''',
        )

        ensure_column(cursor, 'companies', 'city', 'city VARCHAR(100)')
        ensure_column(cursor, 'companies', 'status', "status VARCHAR(50) DEFAULT 'Active'")
        ensure_column(cursor, 'companies', 'created_at', 'created_at DATE DEFAULT (CURRENT_DATE)')

        ensure_column(cursor, 'contacts', 'created_at', 'created_at DATE DEFAULT (CURRENT_DATE)')

        ensure_column(cursor, 'deals', 'lead_id', 'lead_id VARCHAR(100)')
        ensure_column(cursor, 'deals', 'probability', 'probability INT DEFAULT 20')
        ensure_column(cursor, 'deals', 'created_at', 'created_at DATE DEFAULT (CURRENT_DATE)')

        ensure_column(cursor, 'activities', 'priority', "priority VARCHAR(50) DEFAULT 'Medium'")
        ensure_column(cursor, 'activities', 'created_at', 'created_at DATE DEFAULT (CURRENT_DATE)')

        cursor.execute('UPDATE companies SET status = %s WHERE status IS NULL OR status = %s', ('Active', ''))
        cursor.execute('UPDATE contacts SET status = %s WHERE status IS NULL OR status = %s', ('Active', ''))
        cursor.execute('UPDATE deals SET probability = 20 WHERE probability IS NULL')
        cursor.execute('UPDATE activities SET priority = %s WHERE priority IS NULL OR priority = %s', ('Medium', ''))
        cursor.execute('UPDATE leads SET status = %s WHERE status IS NULL OR status = %s', ('New', ''))

        conn.commit()
        print('Schema migration complete.')
    finally:
        close_connection(conn)


if __name__ == '__main__':
    ensure_schema()
