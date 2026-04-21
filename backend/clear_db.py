import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def clear_db():
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'tdt_crm')
    )
    cursor = conn.cursor()
    
    # Disable foreign key checks to allow clearing tables in any order without constraint errors
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    
    tables = ['activities', 'deals', 'leads', 'contacts', 'companies', 'team', 'users', 'audit_log']
    
    for table in tables:
        try:
            cursor.execute(f"TRUNCATE TABLE {table};")
        except Exception as e:
            pass # Table might not exist, which is fine
            
    # Re-enable foreign key checks
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    
    conn.commit()
    cursor.close()
    conn.close()
    print("Mock data successfully deleted! Database is now empty.")

if __name__ == '__main__':
    clear_db()
