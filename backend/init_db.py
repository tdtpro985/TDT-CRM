import mysql.connector
import os
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

def init_db():
    try:
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

        # Create tables
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS companies (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            industry VARCHAR(100),
            website VARCHAR(200),
            owner VARCHAR(100),
            last_touch VARCHAR(50)
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            company_id VARCHAR(50),
            role VARCHAR(100),
            owner VARCHAR(100),
            email VARCHAR(100),
            phone VARCHAR(50),
            status VARCHAR(50),
            last_touch VARCHAR(50),
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS deals (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            company_id VARCHAR(50),
            contact_id VARCHAR(50),
            owner VARCHAR(100),
            stage VARCHAR(50),
            value INT,
            close_date VARCHAR(50),
            priority VARCHAR(50),
            source VARCHAR(50),
            last_touch VARCHAR(50),
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS activities (
            id VARCHAR(50) PRIMARY KEY,
            type VARCHAR(50),
            subject VARCHAR(200),
            owner VARCHAR(100),
            due_date VARCHAR(50),
            status VARCHAR(50),
            deal_id VARCHAR(50),
            notes TEXT,
            FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100),
            role VARCHAR(100),
            focus VARCHAR(100),
            quota INT,
            close_rate INT
        )
        ''')

        # Mock Data IDs
        comp_id1 = "comp_" + uuid.uuid4().hex[:8]
        comp_id2 = "comp_" + uuid.uuid4().hex[:8]
        cont_id1 = "cont_" + uuid.uuid4().hex[:8]
        cont_id2 = "cont_" + uuid.uuid4().hex[:8]
        deal_id1 = "deal_" + uuid.uuid4().hex[:8]
        deal_id2 = "deal_" + uuid.uuid4().hex[:8]
        
        # Insert Users
        cursor.execute("INSERT INTO users (id, name, role, focus, quota, close_rate) VALUES (%s, %s, %s, %s, %s, %s)",
                       ("user_1", "Alex Rivera", "Account Executive", "Mid-market", 5000000, 24))
        cursor.execute("INSERT INTO users (id, name, role, focus, quota, close_rate) VALUES (%s, %s, %s, %s, %s, %s)",
                       ("user_2", "Jordan Smith", "Sales Director", "Enterprise", 12000000, 18))

        # Insert Companies
        cursor.execute("INSERT INTO companies (id, name, industry, website, owner, last_touch) VALUES (%s, %s, %s, %s, %s, %s)",
                       (comp_id1, "TDT Powersteel", "Manufacturing", "https://tdtpowersteel.com", "Alex Rivera", "2026-04-01"))
        cursor.execute("INSERT INTO companies (id, name, industry, website, owner, last_touch) VALUES (%s, %s, %s, %s, %s, %s)",
                       (comp_id2, "BuildRight Construction", "Construction", "https://buildright.com", "Jordan Smith", "2026-04-03"))

        # Insert Contacts
        cursor.execute("INSERT INTO contacts (id, name, company_id, role, owner, email, phone, status, last_touch) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                       (cont_id1, "Sarah Miller", comp_id1, "Procurement Manager", "Alex Rivera", "sarah@tdtpowersteel.com", "0917-123-4567", "Customer", "2026-04-05"))
        cursor.execute("INSERT INTO contacts (id, name, company_id, role, owner, email, phone, status, last_touch) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                       (cont_id2, "James Wilson", comp_id2, "General Contractor", "Jordan Smith", "james.w@buildright.com", "0918-987-6543", "Lead", "2026-04-02"))

        # Insert Deals
        cursor.execute("INSERT INTO deals (id, name, company_id, contact_id, owner, stage, value, close_date, priority, source, last_touch) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                       (deal_id1, "Q2 Steel Supply Bundle", comp_id1, cont_id1, "Alex Rivera", "Proposal", 1250000, "2026-05-15", "High", "Referral", "2026-04-05"))
        cursor.execute("INSERT INTO deals (id, name, company_id, contact_id, owner, stage, value, close_date, priority, source, last_touch) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                       (deal_id2, "Heavy Equipment Rental Contract", comp_id2, cont_id2, "Jordan Smith", "In Review", 850000, "2026-04-30", "Medium", "Website", "2026-04-03"))

        # Insert Activities
        cursor.execute("INSERT INTO activities (id, type, subject, owner, due_date, status, deal_id, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                       ("act_1", "Task", "Finalize Pricing Matrix", "Alex Rivera", "2026-04-10", "In Progress", deal_id1, "Sarah asked for a volume discount on rebar bundles."))
        cursor.execute("INSERT INTO activities (id, type, subject, owner, due_date, status, deal_id, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                       ("act_2", "Call", "Follow-up on Proposal", "Jordan Smith", "2026-04-08", "In Progress", deal_id2, "Check if James had questions about the rental duration terms."))

        conn.commit()
        cursor.close()
        conn.close()
        print("Database initialized successfully with normalized relations and mock data.")
    except Exception as e:
        print(f"Error initializing database: {e}")

if __name__ == '__main__':
    init_db()
