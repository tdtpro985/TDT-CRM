import mysql.connector
from .database import get_db_connection, close_connection
from .migrate_owner_ids import migrate_owner_ids

def run_purge_migration():
    """
    Startup migration that handles schema expansion, data backfill, and legacy column removal.
    This script ensures that any device pulling the relational changes stays in sync.
    """
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return

    try:
        cursor = conn.cursor()
        
        # 1. Identify if migration is needed (check for legacy columns)
        legacy_columns = [
            ('deals', 'owner'),
            ('contacts', 'owner'),
            ('activities', 'owner'),
            ('leads', 'sr')
        ]
        
        needed = False
        for table, column in legacy_columns:
            cursor.execute(f"SHOW COLUMNS FROM {table} LIKE '{column}'")
            if cursor.fetchone():
                needed = True
                break
        
        if not needed:
            # Quick exit if already clean
            return

        print("Relational schema migration detected - updating database...")

        # 2. Schema Expansion (Ensure owner_id columns exist before backfilling)
        # Helper to safely add columns
        def add_column_if_not_exists(table, column, definition):
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                print(f"  [+] Added {column} to {table}")
            except mysql.connector.Error as err:
                if err.errno == 1060: # Duplicate column name
                    pass # Already exists
                else:
                    print(f"  [!] Error adding {column} to {table}: {err}")

        # Add owner_id columns and region/stage if missing
        add_column_if_not_exists("team", "region", "ENUM('North Luzon', 'Central', 'Vis&Min') DEFAULT 'North Luzon'")
        add_column_if_not_exists("companies", "owner_id", "INT")
        add_column_if_not_exists("contacts", "owner_id", "INT")
        add_column_if_not_exists("leads", "owner_id", "INT")
        add_column_if_not_exists("deals", "owner_id", "INT")
        add_column_if_not_exists("activities", "owner_id", "INT")
        add_column_if_not_exists("activities", "stage", "VARCHAR(100) DEFAULT NULL")
        
        # 3. Data Takeover (Backfill FKs from strings)
        print("  [>] Backfilling owner IDs from legacy data...")
        migrate_owner_ids()

        # 4. Final Cleanup: Drop legacy string columns
        print("  [>] Dropping legacy string columns...")
        for table, column in legacy_columns:
            try:
                cursor.execute(f"ALTER TABLE {table} DROP COLUMN {column}")
                print(f"  [-] Dropped {column} from {table}")
            except mysql.connector.Error as err:
                if err.errno == 1091: # Column doesn't exist
                    pass
                else:
                    print(f"  [!] Error dropping {column} from {table}: {err}")

        conn.commit()
        print("Database schema is now fully relational and clean.")

    except Exception as e:
        print(f"Critical error during startup migration: {e}")
        conn.rollback()
    finally:
        close_connection(conn)

if __name__ == '__main__':
    run_purge_migration()
