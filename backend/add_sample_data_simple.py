"""
Simple script to add sample deals data.
Run from backend folder: python add_sample_data_simple.py
"""
import mysql.connector
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

def add_sample_data():
    """Add sample companies, contacts, and deals."""
    try:
        # Connect to database
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'tdt_crm')
        )
        
        cursor = conn.cursor()
        print("✅ Connected to database")
        
        # Sample companies
        companies = [
            ("comp_001", "ABC Construction Corp", "Construction", "Manila", "Alex Rivera"),
            ("comp_002", "XYZ Manufacturing Inc", "Manufacturing", "Quezon City", "Jordan Smith"),
            ("comp_003", "BuildPro Developers", "Real Estate", "Makati", "Alex Rivera"),
            ("comp_004", "SteelWorks Philippines", "Manufacturing", "Pasig", "Jordan Smith"),
            ("comp_005", "MegaBuilders Inc", "Construction", "Taguig", "Alex Rivera"),
        ]
        
        print("\n📦 Adding companies...")
        for comp in companies:
            cursor.execute(
                """INSERT INTO companies (id, name, industry, city, owner, status)
                   VALUES (%s, %s, %s, %s, %s, 'Active')
                   ON DUPLICATE KEY UPDATE name = VALUES(name)""",
                comp
            )
        print(f"   Added {len(companies)} companies")
        
        # Sample contacts
        contacts = [
            ("cont_001", "Juan Dela Cruz", "comp_001", "Project Manager", "Alex Rivera", "juan@abc.com", "0917-123-4567"),
            ("cont_002", "Maria Santos", "comp_002", "Procurement Head", "Jordan Smith", "maria@xyz.com", "0918-234-5678"),
            ("cont_003", "Pedro Reyes", "comp_003", "CEO", "Alex Rivera", "pedro@buildpro.com", "0919-345-6789"),
            ("cont_004", "Ana Garcia", "comp_004", "Operations Manager", "Jordan Smith", "ana@steelworks.ph", "0920-456-7890"),
            ("cont_005", "Carlos Mendoza", "comp_005", "VP Engineering", "Alex Rivera", "carlos@megabuilders.com", "0921-567-8901"),
        ]
        
        print("\n👥 Adding contacts...")
        for cont in contacts:
            cursor.execute(
                """INSERT INTO contacts (id, name, company_id, role, owner, email, phone, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, 'Active')
                   ON DUPLICATE KEY UPDATE name = VALUES(name)""",
                cont
            )
        print(f"   Added {len(contacts)} contacts")
        
        # Sample deals
        today = datetime.now()
        deals = [
            # New Opportunity (20%)
            ("deal_001", "Q2 Steel Supply - ABC", "comp_001", "cont_001", None, "New Opportunity", 1500000, (today + timedelta(days=45)).strftime('%Y-%m-%d'), 20, "Alex Rivera"),
            ("deal_002", "Rebar Package Deal", "comp_003", "cont_003", None, "New Opportunity", 2200000, (today + timedelta(days=60)).strftime('%Y-%m-%d'), 20, "Alex Rivera"),
            
            # Qualified (40%)
            ("deal_003", "Manufacturing Equipment", "comp_002", "cont_002", None, "Qualified", 3500000, (today + timedelta(days=30)).strftime('%Y-%m-%d'), 40, "Jordan Smith"),
            ("deal_004", "Steel Beams Bulk Order", "comp_004", "cont_004", None, "Qualified", 1800000, (today + timedelta(days=35)).strftime('%Y-%m-%d'), 40, "Jordan Smith"),
            
            # Proposal (60%)
            ("deal_005", "Construction Materials Package", "comp_005", "cont_005", None, "Proposal", 4200000, (today + timedelta(days=25)).strftime('%Y-%m-%d'), 60, "Alex Rivera"),
            ("deal_006", "Industrial Steel Supply", "comp_001", "cont_001", None, "Proposal", 2800000, (today + timedelta(days=20)).strftime('%Y-%m-%d'), 60, "Alex Rivera"),
            
            # Negotiation (80%)
            ("deal_007", "Heavy Machinery Parts", "comp_002", "cont_002", None, "Negotiation", 5100000, (today + timedelta(days=15)).strftime('%Y-%m-%d'), 80, "Jordan Smith"),
            ("deal_008", "Structural Steel Contract", "comp_003", "cont_003", None, "Negotiation", 3900000, (today + timedelta(days=18)).strftime('%Y-%m-%d'), 80, "Alex Rivera"),
            
            # Closed Won (100%)
            ("deal_009", "Q1 Steel Delivery", "comp_004", "cont_004", None, "Closed Won", 2500000, (today - timedelta(days=5)).strftime('%Y-%m-%d'), 100, "Jordan Smith"),
            ("deal_010", "Emergency Steel Supply", "comp_005", "cont_005", None, "Closed Won", 1200000, (today - timedelta(days=10)).strftime('%Y-%m-%d'), 100, "Alex Rivera"),
        ]
        
        print("\n💼 Adding deals...")
        for deal in deals:
            cursor.execute(
                """INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE name = VALUES(name)""",
                deal
            )
        print(f"   Added {len(deals)} deals")
        
        conn.commit()
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM companies")
        company_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM contacts")
        contact_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM deals")
        deal_count = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT stage, COUNT(*) as count, SUM(value) as total
            FROM deals 
            GROUP BY stage 
            ORDER BY FIELD(stage, 'New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won')
        """)
        stage_data = cursor.fetchall()
        
        print("\n" + "="*50)
        print("✅ Sample data added successfully!")
        print("="*50)
        print(f"\n📊 Summary:")
        print(f"   Companies: {company_count}")
        print(f"   Contacts:  {contact_count}")
        print(f"   Deals:     {deal_count}")
        
        print(f"\n📈 Deals by Stage:")
        total_value = 0
        for stage, count, value in stage_data:
            total_value += value or 0
            print(f"   {stage:20} {count:2} deals  PHP {value:>12,.0f}")
        print(f"   {'─'*20} {'─'*8} {'─'*18}")
        print(f"   {'TOTAL':20} {deal_count:2} deals  PHP {total_value:>12,.0f}")
        
        print(f"\n🎯 Next steps:")
        print(f"   1. Start the app: START-HERE.bat")
        print(f"   2. Login: manila.tdtpowersteel / TDTpowersteel2024")
        print(f"   3. Go to Pipeline view")
        print(f"   4. You should see {deal_count} deals across all stages!")
        print()
        
        cursor.close()
        conn.close()
        
    except mysql.connector.Error as e:
        print(f"\n❌ Database error: {e}")
        print("\nTroubleshooting:")
        print("  1. Check if MySQL is running")
        print("  2. Check backend/.env for correct DB credentials")
        print("  3. Make sure database 'tdt_crm' exists")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("="*50)
    print(" TDT-CRM: Add Sample Pipeline Data")
    print("="*50)
    add_sample_data()
    input("\nPress Enter to exit...")
