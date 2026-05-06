import os
import uuid
import random
from datetime import date, timedelta
from database.database import get_db_connection, close_connection
from dotenv import load_dotenv

load_dotenv()

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
    print("Starting Pipeline 'Agos' Sync (Top-up to 20 Active Deals)...")
    conn = get_db_connection()
    if not conn:
        print("Error: Could not connect to database.")
        return

    try:
        cursor = conn.cursor()

        # 1. Count current ACTIVE deals (not Closed Won/Lost)
        cursor.execute("""
            SELECT COUNT(*) FROM deals 
            WHERE stage NOT IN ('Closed Won', 'Closed Lost')
        """)
        current_active_count = cursor.fetchone()[0]
        
        print(f"Current active deals on this device: {current_active_count}")

        if current_active_count >= 20:
            print("Kanban board already has 20 or more active deals. No 'Flow' needed today.")
            return

        needed_count = 20 - current_active_count
        print(f"Flow needed: Fetching {needed_count} fresh leads to reach the 20-deal limit...")

        # 2. Fetch fresh leads that are NOT yet converted and NOT part of an existing deal
        cursor.execute("""
            SELECT l.id, l.customer_name, l.sr, l.branch 
            FROM leads l
            LEFT JOIN deals d ON l.id = d.lead_id
            WHERE l.status != 'Converted' 
              AND d.id IS NULL
              AND (l.sr IS NULL OR LOWER(TRIM(l.sr)) != 'manila.tdtpowersteel')
            ORDER BY l.created_at DESC
            LIMIT %s
        """, (needed_count,))
        
        leads_to_convert = cursor.fetchall()

        if not leads_to_convert:
            print("No fresh leads found in the database to convert.")
            return

        actual_converted = len(leads_to_convert)
        print(f"Converting {actual_converted} leads into active deals...")

        # Distribute new deals mostly in early stages
        weighted_stages = (
            ['New Opportunity'] * 12 + 
            ['Qualified'] * 6 + 
            ['Proposal'] * 2
        )
        random.shuffle(weighted_stages)

        for i, lead in enumerate(leads_to_convert):
            lead_id, customer_name, sr, branch = lead
            deal_id = str(uuid.uuid4())
            
            # Use weighted distribution for the 'gap'
            stage = weighted_stages[i % len(weighted_stages)]
            value = random.randint(25000, 500000)
            prob = STAGE_PROBABILITY.get(stage, 20)
            expected_close = date.today() + timedelta(days=random.randint(15, 60))

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
        print(f"Success! Added {actual_converted} new deals. Total active deals should now be {current_active_count + actual_converted}.")
        print("Tell your team to refresh their browser to see the new flow.")

    except Exception as e:
        print(f"Error during 'agos' sync: {e}")
        conn.rollback()
    finally:
        close_connection(conn)

if __name__ == "__main__":
    sync_pipeline()
