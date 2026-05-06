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
    print("Starting Pipeline Sync & Lead-to-Deal conversion...")
    conn = get_db_connection()
    if not conn:
        print("Error: Could not connect to database.")
        return

    try:
        cursor = conn.cursor()

        # 1. Update any existing deals that have non-standard stages
        # This fixes visibility issues if they have old data
        print("Normalizing existing deal stages...")
        cursor.execute("UPDATE deals SET stage = 'New Opportunity' WHERE stage NOT IN ('New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost')")
        
        # 2. Get leads that don't have a deal yet
        # We want to convert ALL valid leads to deals to populate the pipeline
        cursor.execute("""
            SELECT l.id, l.customer_name, l.sr, l.branch 
            FROM leads l
            LEFT JOIN deals d ON l.id = d.lead_id
            WHERE d.id IS NULL 
              AND (l.sr IS NULL OR LOWER(TRIM(l.sr)) != 'manila.tdtpowersteel')
        """)
        leads_to_convert = cursor.fetchall()

        if not leads_to_convert:
            print("No new leads found for conversion.")
        else:
            print(f"Converting ALL {len(leads_to_convert)} available leads into active deals...")
            for lead in leads_to_convert:
                lead_id, customer_name, sr, branch = lead
                deal_id = str(uuid.uuid4())
                stage = random.choice(STAGES)
                value = random.randint(15000, 750000)
                prob = STAGE_PROBABILITY.get(stage, 20)
                expected_close = date.today() + timedelta(days=random.randint(7, 45))

                cursor.execute("""
                    INSERT INTO deals (id, name, lead_id, company_id, stage, value, close_date, probability, owner)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    f"Deal - {customer_name}",
                    lead_id,
                    lead_id, # Linking company to lead_id since we auto-create company with same ID
                    stage,
                    value,
                    expected_close,
                    prob,
                    sr
                ))
                
                # Update lead status to Converted
                cursor.execute("UPDATE leads SET status = 'Converted' WHERE id = %s", (lead_id,))

        conn.commit()
        print("Success! Pipeline synced and sample deals created.")
        print("Tell your team to refresh their browser to see the changes.")

    except Exception as e:
        print(f"Error during sync: {e}")
        conn.rollback()
    finally:
        close_connection(conn)

if __name__ == "__main__":
    sync_pipeline()
