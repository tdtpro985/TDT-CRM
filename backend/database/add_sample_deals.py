"""
Add sample deals data to populate the pipeline view.
Run this script to add test data: python -m database.add_sample_deals
"""
import uuid
from datetime import datetime, timedelta
from .database import get_db_connection, close_connection

def add_sample_deals():
    """Add sample companies, contacts, and deals for testing the pipeline."""
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database.")
        return
    
    try:
        cursor = conn.cursor()
        
        # Sample data for Manila branch
        companies_data = [
            ("comp_001", "ABC Construction Corp", "Construction", "Manila", "Alex Rivera"),
            ("comp_002", "XYZ Manufacturing Inc", "Manufacturing", "Quezon City", "Jordan Smith"),
            ("comp_003", "BuildPro Developers", "Real Estate", "Makati", "Alex Rivera"),
            ("comp_004", "SteelWorks Philippines", "Manufacturing", "Pasig", "Jordan Smith"),
            ("comp_005", "MegaBuilders Inc", "Construction", "Taguig", "Alex Rivera"),
        ]
        
        contacts_data = [
            ("cont_001", "Juan Dela Cruz", "comp_001", "Project Manager", "Alex Rivera", "juan@abc.com", "0917-123-4567"),
            ("cont_002", "Maria Santos", "comp_002", "Procurement Head", "Jordan Smith", "maria@xyz.com", "0918-234-5678"),
            ("cont_003", "Pedro Reyes", "comp_003", "CEO", "Alex Rivera", "pedro@buildpro.com", "0919-345-6789"),
            ("cont_004", "Ana Garcia", "comp_004", "Operations Manager", "Jordan Smith", "ana@steelworks.ph", "0920-456-7890"),
            ("cont_005", "Carlos Mendoza", "comp_005", "VP Engineering", "Alex Rivera", "carlos@megabuilders.com", "0921-567-8901"),
        ]
        
        # Deals with different stages
        today = datetime.now()
        deals_data = [
            # New Opportunity (20% probability)
            ("deal_001", "Q2 Steel Supply - ABC", "comp_001", "cont_001", None, "New Opportunity", 1500000, (today + timedelta(days=45)).strftime('%Y-%m-%d'), 20, "Alex Rivera"),
            ("deal_002", "Rebar Package Deal", "comp_003", "cont_003", None, "New Opportunity", 2200000, (today + timedelta(days=60)).strftime('%Y-%m-%d'), 20, "Alex Rivera"),
            
            # Qualified (40% probability)
            ("deal_003", "Manufacturing Equipment", "comp_002", "cont_002", None, "Qualified", 3500000, (today + timedelta(days=30)).strftime('%Y-%m-%d'), 40, "Jordan Smith"),
            ("deal_004", "Steel Beams Bulk Order", "comp_004", "cont_004", None, "Qualified", 1800000, (today + timedelta(days=35)).strftime('%Y-%m-%d'), 40, "Jordan Smith"),
            
            # Proposal (60% probability)
            ("deal_005", "Construction Materials Package", "comp_005", "cont_005", None, "Proposal", 4200000, (today + timedelta(days=25)).strftime('%Y-%m-%d'), 60, "Alex Rivera"),
            ("deal_006", "Industrial Steel Supply", "comp_001", "cont_001", None, "Proposal", 2800000, (today + timedelta(days=20)).strftime('%Y-%m-%d'), 60, "Alex Rivera"),
            
            # Negotiation (80% probability)
            ("deal_007", "Heavy Machinery Parts", "comp_002", "cont_002", None, "Negotiation", 5100000, (today + timedelta(days=15)).strftime('%Y-%m-%d'), 80, "Jordan Smith"),
            ("deal_008", "Structural Steel Contract", "comp_003", "cont_003", None, "Negotiation", 3900000, (today + timedelta(days=18)).strftime('%Y-%m-%d'), 80, "Alex Rivera"),
            
            # Closed Won (100% probability)
            ("deal_009", "Q1 Steel Delivery", "comp_004", "cont_004", None, "Closed Won", 2500000, (today - timedelta(days=5)).strftime('%Y-%m-%d'), 100, "Jordan Smith"),
            ("deal_010", "Emergency Steel Supply", "comp_005", "cont_005", None, "Closed Won", 1200000, (today - timedelta(days=10)).strftime('%Y-%m-%d'), 100, "Alex Rivera"),
        ]
        
        # Insert companies
        print("📦 Adding sample companies...")
        for company in companies_data:
            cursor.execute(
                """INSERT INTO companies (id, name, industry, city, owner, status)
                   VALUES (%s, %s, %s, %s, %s, 'Active')
                   ON DUPLICATE KEY UPDATE name = VALUES(name)""",
                company
            )
        
        # Insert contacts
        print("👥 Adding sample contacts...")
        for contact in contacts_data:
            cursor.execute(
                """INSERT INTO contacts (id, name, company_id, role, owner, email, phone, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, 'Active')
                   ON DUPLICATE KEY UPDATE name = VALUES(name)""",
                contact
            )
        
        # Insert deals
        print("💼 Adding sample deals...")
        for deal in deals_data:
            cursor.execute(
                """INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE name = VALUES(name)""",
                deal
            )
        
        conn.commit()
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM companies")
        company_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM contacts")
        contact_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM deals")
        deal_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT stage, COUNT(*) as count FROM deals GROUP BY stage ORDER BY FIELD(stage, 'New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won')")
        stage_counts = cursor.fetchall()
        
        print("\n✅ Sample data added successfully!")
        print(f"📊 Summary:")
        print(f"   - Companies: {company_count}")
        print(f"   - Contacts: {contact_count}")
        print(f"   - Deals: {deal_count}")
        print(f"\n📈 Deals by Stage:")
        for stage, count in stage_counts:
            print(f"   - {stage}: {count} deals")
        
        print("\n🎯 Next steps:")
        print("   1. Refresh your browser (http://localhost:5173)")
        print("   2. Login with: manila.tdtpowersteel / TDTpowersteel2024")
        print("   3. Navigate to Pipeline view")
        print("   4. You should now see deals in all stages!")
        
    except Exception as e:
        print(f"❌ Error adding sample data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        close_connection(conn)

if __name__ == '__main__':
    add_sample_deals()
