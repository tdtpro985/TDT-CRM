import os
import uuid
import random
from datetime import date, timedelta
from database.database import get_db_connection, close_connection
from dotenv import load_dotenv

load_dotenv()

ITEMS_PER_PAGE = 20

ACTIVE_STAGES = [
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

TASK_TEMPLATES = [
    {'subject': 'Initial Discovery Call', 'type': 'Call', 'priority': 'High', 'days_offset': 1},
    {'subject': 'Send Product Quotation', 'type': 'Email', 'priority': 'Medium', 'days_offset': 3},
    {'subject': 'Technical Site Visit', 'type': 'Meeting', 'priority': 'High', 'days_offset': 5},
    {'subject': 'Follow-up on Proposal', 'type': 'Call', 'priority': 'Medium', 'days_offset': 7},
]

ACTIVE_BRANCHES = [
    'Manila', 'Cebu', 'Davao', 'Dagupan', 'Isabela',
    'Naga', 'Legazpi', 'Iloilo', 'Bacolod', 'Cagayan de Oro',
    'Zamboanga', 'General Santos', 'Tacloban'
]


def fill_pipeline(conn, branch=None, target_per_stage=ITEMS_PER_PAGE):
    created = 0
    cursor = conn.cursor()

    branches = [branch] if branch else ACTIVE_BRANCHES

    for b in branches:
        cursor.execute("""
            SELECT COUNT(*) FROM deals d
            LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
            WHERE d.stage IN ('New Opportunity','Qualified','Proposal','Negotiation')
              AND l.branch = %s
              AND (l.sr IS NULL OR LOWER(TRIM(l.sr)) != 'manila.tdtpowersteel')
        """, (b,))
        total_active = cursor.fetchone()[0]

        if total_active >= target_per_stage:
            continue

        needed = target_per_stage - total_active

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
        """, (b, needed))

        leads_to_convert = cursor.fetchall()

        for lead in leads_to_convert:
                lead_id, customer_name, sr, branch_name = lead
                deal_id = str(uuid.uuid4())
                value = random.randint(25000, 500000)
                prob = STAGE_PROBABILITY.get('New Opportunity', 20)
                expected_close = date.today() + timedelta(days=random.randint(15, 60))

                cursor.execute("""
                    INSERT INTO deals (id, name, lead_id, company_id, stage, value, close_date, probability, owner)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    customer_name,
                    lead_id,
                    lead_id,
                    'New Opportunity',
                    value,
                    expected_close,
                    prob,
                    sr
                ))

                cursor.execute("UPDATE leads SET status = 'Converted' WHERE id = %s", (lead_id,))

                num_tasks = random.randint(1, 2)
                selected_templates = random.sample(TASK_TEMPLATES, num_tasks)

                for template in selected_templates:
                    activity_id = str(uuid.uuid4())
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

                created += 1

    return created


def sync_pipeline():
    print("Starting Pipeline & Tasks Sync (per-stage fill)...")
    conn = get_db_connection()
    if not conn:
        print("Error: Could not connect to database.")
        return

    try:
        created = fill_pipeline(conn)
        conn.commit()
        print(f"Success! Created {created} new deal(s).")
    except Exception as e:
        print(f"Error during sync: {e}")
        conn.rollback()
    finally:
        close_connection(conn)


if __name__ == "__main__":
    sync_pipeline()
