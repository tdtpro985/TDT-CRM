from .database import get_db_connection, close_connection

def clear_data():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        cursor = conn.cursor()

        print("Starting database cleanup...")

        # Disable foreign key checks
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")

        tables = ['activities', 'deals', 'contacts', 'companies', 'leads', 'audit_log']
        for table in tables:
            try:
                cursor.execute(f"TRUNCATE TABLE {table};")
                print(f"  [OK] Cleared table: {table}")
            except Exception as e:
                print(f"  [ERROR] Failed to clear {table}: {e}")

        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        conn.commit()
        
        print("\nDatabase cleanup complete. Ready for Google Sheets sync.")
        print("Login accounts (team table) were preserved.")
    except Exception as e:
        print(f"Critical error: {e}")
    finally:
        if conn:
            close_connection(conn)

if __name__ == '__main__':
    clear_data()
