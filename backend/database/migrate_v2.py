import mysql.connector
from .database import get_db_connection, close_connection
from .migrate_owner_ids import migrate_owner_ids

def run_migration_v2():
    """
    Non-destructive migration to add relational fields (owner_id, region, join tables)
    while preserving all existing string-based legacy data.
    """
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return

    try:
        cursor = conn.cursor()
        print("Starting side-by-side migration (v2)...")

        # Helper to safely add columns
        def add_column_if_not_exists(table, column, definition):
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                print(f"  [+] Added {column} to {table}")
            except mysql.connector.Error as err:
                if err.errno == 1060: # Duplicate column name
                    print(f"  [.] Column {column} already exists in {table}")
                else:
                    print(f"  [!] Error adding {column} to {table}: {err}")

        # 1. Team Table: Add Region support
        add_column_if_not_exists("team", "region", "ENUM('North Luzon', 'Central', 'Vis&Min') DEFAULT 'North Luzon'")

        # 2. Companies: Add owner_id FK
        add_column_if_not_exists("companies", "owner_id", "INT")
        try:
            cursor.execute("ALTER TABLE companies ADD FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL")
            print("  [+] Added FK for companies.owner_id")
        except: pass

        # 3. Contacts: Add owner_id FK
        add_column_if_not_exists("contacts", "owner_id", "INT")
        try:
            cursor.execute("ALTER TABLE contacts ADD FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL")
            print("  [+] Added FK for contacts.owner_id")
        except: pass

        # 4. Leads: Add owner_id FK
        add_column_if_not_exists("leads", "owner_id", "INT")
        try:
            cursor.execute("ALTER TABLE leads ADD FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL")
            print("  [+] Added FK for leads.owner_id")
        except: pass

        # 5. Deals: Add owner_id FK
        add_column_if_not_exists("deals", "owner_id", "INT")
        try:
            cursor.execute("ALTER TABLE deals ADD FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL")
            print("  [+] Added FK for deals.owner_id")
        except: pass

        # 6. Create deal_contacts join table (Many-to-Many)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deal_contacts (
                deal_id    VARCHAR(100) NOT NULL,
                contact_id VARCHAR(100) NOT NULL,
                role       VARCHAR(100) DEFAULT 'Primary',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (deal_id, contact_id),
                FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
            )
        """)
        print("  [+] Verified deal_contacts join table exists")

        conn.commit()
        print("Schema expansion complete.")

        # 7. Perform Data Takeover (Backfill FKs from strings)
        print("\nStarting Data Takeover (backfilling owner_ids from legacy strings)...")
        migrate_owner_ids()

    except Exception as e:
        print(f"Critical error during migration: {e}")
        conn.rollback()
    finally:
        close_connection(conn)

if __name__ == '__main__':
    run_migration_v2()
