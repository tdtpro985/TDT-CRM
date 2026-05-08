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

# Task templates for automatic 'agos'
TASK_TEMPLATES = [
    {'subject': 'Initial Discovery Call', 'type': 'Call', 'priority': 'High', 'days_offset': 1},
    {'subject': 'Send Product Quotation', 'type': 'Email', 'priority': 'Medium', 'days_offset': 3},
    {'subject': 'Technical Site Visit', 'type': 'Meeting', 'priority': 'High', 'days_offset': 5},
    {'subject': 'Follow-up on Proposal', 'type': 'Call', 'priority': 'Medium', 'days_offset': 7},
]

def sync_pipeline():
    print("Starting Pipeline & Tasks 'Agos' Sync...")
    conn = get_db_connection()
    if not conn:
        print("Error: Could not connect to database.")
        return

    try:
        cursor = conn.cursor()

        # 1. Count current ACTIVE deals ONLY FOR THE CURRENT DEVICE/BRANCH
        # Define branches here directly to avoid import errors
        ACTIVE_BRANCHES = [
            'Manila', 'Cebu', 'Davao', 'Dagupan', 'Isabela', 
            'Naga', 'Legazpi', 'Iloilo', 'Bacolod', 'Cagayan de Oro', 
            'Zamboanga', 'General Santos', 'Tacloban'
        ]
        
        for branch in ACTIVE_BRANCHES:
            # Check active deals for this branch (excluding filtered SR)
            cursor.execute("""
                SELECT COUNT(*) FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE d.stage NOT IN ('Closed Won', 'Closed Lost')
                  AND l.branch = %s
                  AND (l.sr IS NULL OR LOWER(TRIM(l.sr)) != 'manila.tdtpowersteel')
            """, (branch,))
            current_active_count = cursor.fetchone()[0]
            
            if current_active_count >= 20:
                print(f"Branch {branch} already has {current_active_count} active deals.")
                continue

            needed_count = 20 - current_active_count
            print(f"Branch {branch}: 'Agos' needed to add {needed_count} fresh deals and tasks...")

            # 2. Fetch fresh leads for THIS branch (excluding filtered SR)
            cursor.execute("""
                SELECT l.id, l.customer_name, l.sr, l.branch 
                FROM leads l
                LEFT JOIN deals d ON l.id = d.lead_id
                WHERE l.status != 'Converted' 
                  AND d.id IS NULL
                  AND l.branch = %s
                  AND (l.sr IS NULL OR LOWER(TRIM(l.sr)) != 'manila.tdtpowersteel')
                ORDER BY l.created_at DESC
                LIMIT %s
            """, (branch, needed_count))
            
            leads_to_convert = cursor.fetchall()

            if not leads_to_convert:
                print(f"No fresh real leads found for branch {branch}.")
                continue

            # Distribute new deals
            weighted_stages = (
                ['New Opportunity'] * 12 + 
                ['Qualified'] * 6 + 
                ['Proposal'] * 2
            )
            random.shuffle(weighted_stages)

            for i, lead in enumerate(leads_to_convert):
                lead_id, customer_name, sr, branch_name = lead
                deal_id = str(uuid.uuid4())
                
                stage = weighted_stages[i % len(weighted_stages)]
                value = random.randint(25000, 500000)
                prob = STAGE_PROBABILITY.get(stage, 20)
                expected_close = date.today() + timedelta(days=random.randint(15, 60))

                # Create Deal
                cursor.execute("""
                    INSERT INTO deals (id, name, lead_id, company_id, stage, value, close_date, probability, owner)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    customer_name,
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

                # 3. AUTOMATIC TASK CREATION (Focus Queue & Task Tracking)
                # Create 1-2 tasks for each new deal
                num_tasks = random.randint(1, 2)
                selected_templates = random.sample(TASK_TEMPLATES, num_tasks)
                
                for template in selected_templates:
                    activity_id = str(uuid.uuid4())
                    # Make some tasks overdue or due today to populate Focus Queue
                    # -1 day = overdue, 0 = today, +N = future
                    day_skew = random.choice([-1, 0, 1, 2, 3]) 
                    due_date = date.today() + timedelta(days=day_skew)
                    
                    cursor.execute("""
                        INSERT INTO activities (id, subject, type, owner, deal_id, due_date, priority, status, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        activity_id,
                        template['subject'],
                        template['type'],
                        sr,
                        deal_id,
                        due_date,
                        template['priority'],
                        'Open',
                        f"Automatic task generated for new deal flow from {customer_name}."
                    ))

        conn.commit()
        print("Success! Pipeline and Tasks have been topped up to 20 deals + activities.")

    except Exception as e:
        print(f"Error during 'agos' sync: {e}")
        conn.rollback()
    finally:
        close_connection(conn)




if __name__ == "__main__":
    sync_pipeline()
