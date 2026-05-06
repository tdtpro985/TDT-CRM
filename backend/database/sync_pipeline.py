import os
import uuid
import random
from datetime import date, timedelta
from database.database import get_db_connection, close_connection

# Stages matching PipelineView.jsx and app.py
STAGES = [
    'New Opportunity',
    'Qualified',
    'Proposal',
    'Negotiation'
]

STAGE_PROBABILITY = {
    'New Opportunity': 20,
    'Qualified':       40,
    'Proposal':        60,
    'Negotiation':     80
}

def sync_pipeline():
    print("Starting Pipeline Fresh Start (Reset + 20 Deals)...")
    conn = get_db_connection()
    if not conn:
        print("Error: Could not connect to database.")
        return

    try:
        cursor = conn.cursor()

        # 1. Reset everything first for a fresh start
        print("Cleaning up existing deals and resetting lead statuses...")
        cursor.execute("DELETE FROM deals")
        cursor.execute("UPDATE leads SET status = 'New' WHERE status = 'Converted'")
        
        # 2. Get 20 newest leads for conversion
        print("Fetching 20 newest leads for conversion...")
        cursor.execute("""
            SELECT l.id, l.customer_name, l.sr, l.branch 
            FROM leads l
            WHERE (l.sr IS NULL OR LOWER(TRIM(l.sr)) != 'manila.tdtpowersteel')
            ORDER BY l.created_at DESC
            LIMIT 20
        """)
        leads_to_convert = cursor.fetchall()

        if not leads_to_convert:
            print("No leads found in database to convert.")
        else:
            print(f"Converting {len(leads_to_convert)} newest leads into a fresh pipeline...")
            
            # Distribute stages: New(8), Qualified(6), Proposal(4), Negotiation(2)
            weighted_stages = (
                ['New Opportunity'] * 8 + 
                ['Qualified'] * 6 + 
                ['Proposal'] * 4 + 
                ['Negotiation'] * 2
            )
            # Adjust if we have fewer than 20 leads
            weighted_stages = weighted_stages[:len(leads_to_convert)]
            random.shuffle(weighted_stages)

            for i, lead in enumerate(leads_to_convert):
                lead_id, customer_name, sr, branch = lead
                deal_id = str(uuid.uuid4())
                
                stage = weighted_stages[i]
                value = random.randint(25000, 500000)
                prob = STAGE_PROBABILITY.get(stage, 20)
                expected_close = date.today() + timedelta(days=random.randint(10, 60))

                cursor.execute("""
                    INSERT INTO deals (id, name, lead_id, company_id, stage, value, close_date, probability, owner)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    f"Deal - {customer_name}",
                    lead_id,
                    lead_id,
                    stage,
                    value,
                    expected_close,
                    prob,
                    sr
                ))
                
                # Update lead status to Converted
                cursor.execute("UPDATE leads SET status = 'Converted' WHERE id = %s", (lead_id,))

        conn.commit()
        print("Success! Pipeline has been reset and populated with 20 fresh deals.")
        print("Tell your team to refresh their browser to see the changes.")

    except Exception as e:
        print(f"Error during sync: {e}")
        conn.rollback()
    finally:
        close_connection(conn)

if __name__ == "__main__":
    sync_pipeline()
