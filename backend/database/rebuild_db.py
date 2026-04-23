import os
from .database import get_db_connection, close_connection

def init_db():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        cursor = conn.cursor()
        
        # Get the directory of the current script
        base_path = os.path.dirname(__file__)
        schema_path = os.path.join(base_path, 'schema.sql')

        with open(schema_path, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        # Split by semicolon and execute
        statements = [s.strip() for s in sql.split(';') if s.strip()]
        for statement in statements:
            try:
                cursor.execute(statement)
            except Exception as e:
                print(f"Error executing statement: {statement[:50]}... Error: {e}")

        conn.commit()
        print("Database rebuilt successfully from schema.sql!")
    finally:
        if conn:
            close_connection(conn)

if __name__ == '__main__':
    init_db()
