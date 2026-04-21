import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def init_db():
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', '')
    )
    cursor = conn.cursor()
    db_name = os.getenv('DB_NAME', 'tdt_crm')
    
    cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
    cursor.execute(f"CREATE DATABASE {db_name}")
    cursor.execute(f"USE {db_name}")

    with open('schema.sql', 'r', encoding='utf-8') as f:
        sql = f.read()
    
    # Split by semicolon and execute
    statements = [s.strip() for s in sql.split(';') if s.strip()]
    for statement in statements:
        try:
            cursor.execute(statement)
        except Exception as e:
            print(f"Error executing statement: {statement[:50]}... Error: {e}")

    conn.commit()
    cursor.close()
    conn.close()
    print("Database rebuilt successfully from schema.sql!")

if __name__ == '__main__':
    init_db()
