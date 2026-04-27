import mysql.connector

try:
    # Connect as root to create the user
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="FinalsWeek!88"
    )
    cursor = conn.cursor()
    cursor.execute("CREATE USER IF NOT EXISTS 'crm_app_user'@'localhost' IDENTIFIED BY 'SecureCrmPassword!2026';")
    cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON tdt_crm.* TO 'crm_app_user'@'localhost';")
    cursor.execute("FLUSH PRIVILEGES;")
    print("Database user created successfully.")
    conn.commit()
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
