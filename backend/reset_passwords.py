import mysql.connector
from werkzeug.security import generate_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

conn = mysql.connector.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tdt_crm'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD')
)

cursor = conn.cursor()
cursor.execute("SELECT id, username FROM team")
users = cursor.fetchall()

default_password = "TDTpowersteel2024"
hashed = generate_password_hash(default_password)

print(f"Setting all passwords to '{default_password}'...")

for (user_id, username) in users:
    cursor.execute("UPDATE team SET password = %s WHERE id = %s", (hashed, user_id))
    print(f"  Updated: {username}")

conn.commit()
cursor.close()
conn.close()

print("\nDone. All accounts reset to TDTpowersteel2024 with correct Werkzeug hashes.")
