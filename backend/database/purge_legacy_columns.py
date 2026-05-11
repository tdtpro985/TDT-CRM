import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def run_drop_migration():
    """
    Safely drops legacy columns (sr, owner) from tables if they still exist.
    This script is intended to be run once by anyone pulling the relational schema changes.
    """
    config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': os.getenv('DB_NAME', 'tdt_crm')
    }

    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        # List of (table, column) pairs to drop
        legacy_columns = [
            ('deals', 'owner'),
            ('contacts', 'owner'),
            ('activities', 'owner'),
            ('leads', 'sr'),
            ('companies', 'sr'),
            ('companies', 'owner')
        ]

        print("Checking for legacy columns to drop...")
        
        for table, column in legacy_columns:
            try:
                # Check if column exists
                cursor.execute(f"SHOW COLUMNS FROM {table} LIKE '{column}'")
                if cursor.fetchone():
                    print(f"Dropping column '{column}' from table '{table}'...")
                    cursor.execute(f"ALTER TABLE {table} DROP COLUMN {column}")
                    print(f"Successfully dropped '{column}' from '{table}'.")
                else:
                    print(f"Column '{column}' in table '{table}' already gone.")
            except mysql.connector.Error as err:
                print(f"Error handling {table}.{column}: {err}")

        conn.commit()
        print("\nMigration complete. You can now delete this script.")

    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    run_drop_migration()
