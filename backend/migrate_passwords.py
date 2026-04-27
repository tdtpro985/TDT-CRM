"""
One-time password migration script.
Run this ONCE to hash all plaintext passwords currently in the live database.
Safe to run multiple times — it skips rows that already have a bcrypt hash.
"""
import mysql.connector
from werkzeug.security import generate_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

# Temporarily connect as root to perform the migration
conn = mysql.connector.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tdt_crm'),
    user='root',
    password='FinalsWeek!88'  # Use root only for this one-time migration
)

cursor = conn.cursor()
cursor.execute("SELECT id, username, password FROM team")
rows = cursor.fetchall()

migrated = 0
skipped = 0

for (user_id, username, raw_password) in rows:
    # Bcrypt hashes always start with $2b$ — skip if already hashed
    if raw_password.startswith('$2b$'):
        print(f"[SKIP]    {username} — already hashed")
        skipped += 1
        continue

    hashed = generate_password_hash(raw_password)
    cursor.execute("UPDATE team SET password = %s WHERE id = %s", (hashed, user_id))
    print(f"[HASHED]  {username}")
    migrated += 1

conn.commit()
cursor.close()
conn.close()

print(f"\nDone. Migrated: {migrated}, Skipped (already hashed): {skipped}")
