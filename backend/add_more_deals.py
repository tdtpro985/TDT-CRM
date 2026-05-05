"""
Add more sample deals to test pagination (10+ deals per stage).
Run from backend folder: python add_more_deals.py
"""
import mysql.connector
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

def add_more_deals():
    """Add 50+ more deals to test pagination."""
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
        
        today = datetime.now()
        
        # Generate 50 more deals (10 per stage)
        deal_counter = 11  # Start from 11 (we already have 1-10)
        
        stages_config = [
            ("New Opportunity", 20, 10),  # stage, probability, count
            ("Qualified", 40, 10),
            ("Proposal", 60, 10),
            ("Negotiation", 80, 10),
            ("Closed Won", 100, 10),
        ]
        
        companies = ["comp_001", "comp_002", "comp_003", "comp_004", "comp_005"]
        contacts = ["cont_001", "cont_002", "cont_003", "cont_004", "cont_005"]
        owners = ["Alex Rivera", "Jordan Smith"]
        
        deal_names = [
            "Steel Supply Contract",
            "Construction Materials",
            "Heavy Equipment Deal",
            "Industrial Parts Order",
            "Manufacturing Supply",
            "Building Materials Package",
            "Infrastructure Project",
            "Structural Steel Deal",
            "Equipment Rental Contract",
            "Bulk Steel Order",
        ]
        
        print("\n💼 Adding more deals for pagination testing...")
        
        for stage, probability, count in stages_config:
            for i in range(count):
                deal_id = f"deal_{deal_counter:03d}"
                deal_name = f"{deal_names[i % len(deal_names)]} #{deal_counter}"
                company_id = companies[i % len(companies)]
                contact_id = contacts[i % len(contacts)]
                owner = owners[i % len(owners)]
                value = (i + 1) * 500000 + (deal_counter * 100000)
                
                # Vary close dates
                if stage == "Closed Won":
                    close_date = (today - timedelta(days=i+1)).strftime('%Y-%m-%d')
                else:
                    close_date = (today + timedelta(days=15 + i*5)).strftime('%Y-%m-%d')
                
                cursor.execute(
                    """INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                       ON DUPLICATE KEY UPDATE name = VALUES(name)""",
                    (deal_id, deal_name, company_id, contact_id, None, stage, value, close_date, probability, owner)
                )
                
                deal_counter += 1
        
        conn.commit()
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM deals")
        total_deals = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT stage, COUNT(*) as count, SUM(value) as total
            FROM deals 
            GROUP BY stage 
            ORDER BY FIELD(stage, 'New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won')
        """)
        stage_data = cursor.fetchall()
        
        print("\n" + "="*60)
        print("✅ More deals added successfully!")
        print("="*60)
        print(f"\n📊 Total Deals: {total_deals}")
        
        print(f"\n📈 Deals by Stage:")
        for stage, count, value in stage_data:
            print(f"   {stage:20} {count:2} deals  PHP {value:>15,.0f}")
        
        print(f"\n🎯 Pagination Testing:")
        print(f"   ✓ Each stage now has 10+ deals")
        print(f"   ✓ Pagination will show (10 deals per page)")
        print(f"   ✓ You can test Prev/Next buttons")
        
        print(f"\n🚀 Next steps:")
        print(f"   1. Refresh your browser (Ctrl+Shift+R)")
        print(f"   2. Go to Pipeline view")
        print(f"   3. You should see pagination controls!")
        print(f"   4. Click 'Next ›' to see more deals")
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
    print("="*60)
    print(" TDT-CRM: Add More Deals for Pagination Testing")
    print("="*60)
    add_more_deals()
    input("\nPress Enter to exit...")
