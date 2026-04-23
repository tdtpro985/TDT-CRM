from flask import Flask, request, jsonify
from flask_cors import CORS
from database.database import get_db_connection, close_connection
from gsheets_sync import sync_from_sheets, sync_to_sheets

app = Flask(__name__)
CORS(app)

STAGE_PROBABILITY = {
    'New Opportunity': 20,
    'Qualified':       40,
    'Proposal':        60,
    'Negotiation':     80,
    'Closed Won':      100,
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def rows_to_list(cursor):
    """Return all rows from the cursor as a list of dicts."""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def log_audit(conn, entity_type, entity_id, action, old_value=None, new_value=None):
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value)
           VALUES (%s, %s, %s, %s, %s)""",
        (entity_type, entity_id, action, old_value, new_value),
    )
    cursor.close()


# ─── Auth / Login ─────────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    branch   = data.get('branch', '').strip()

    if not username or not password or not branch:
        return jsonify({'error': 'Username, password and branch are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, name, email, role, branch FROM team WHERE username = %s AND password = %s AND branch = %s',
            (username, password, branch)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Invalid credentials or branch mismatch'}), 401
        user = {
            'id':       row[0],
            'name':     row[1],
            'email':    row[2],
            'role':     row[3],
            'branch':   row[4],
            'username': username,
        }
        return jsonify({'message': 'Login successful', 'user': user}), 200
    finally:
        close_connection(conn)


# ─── Team ─────────────────────────────────────────────────────────────────────

@app.route('/api/team', methods=['GET'])
def get_team():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch')
        if branch and branch != 'Headquarters':
            cursor.execute('SELECT id, name, role, branch FROM team WHERE branch = %s ORDER BY name', (branch,))
        else:
            cursor.execute('SELECT id, name, role, branch FROM team ORDER BY name')
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


# ─── Companies ────────────────────────────────────────────────────────────────

@app.route('/api/companies', methods=['GET'])
def get_companies():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, name, industry, website, city, owner, status, created_at FROM companies ORDER BY name'
        )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/companies', methods=['POST'])
def create_company():
    data = request.get_json()
    required = ['id', 'name']
    if not all(k in data for k in required):
        return jsonify({'error': 'id and name are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO companies (id, name, industry, website, city, owner, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                data['id'],
                data['name'],
                data.get('industry'),
                data.get('website'),
                data.get('city'),
                data.get('owner'),
                data.get('status', 'Active'),
            ),
        )
        conn.commit()
        return jsonify({'message': 'Company created', 'id': data['id']}), 201
    finally:
        close_connection(conn)


# ─── Contacts ─────────────────────────────────────────────────────────────────

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name, company_id AS companyId, role, owner,
                      email, phone, last_touch AS lastTouch, status, created_at
               FROM contacts ORDER BY name"""
        )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/contacts', methods=['POST'])
def create_contact():
    data = request.get_json()
    if not all(k in data for k in ['id', 'name']):
        return jsonify({'error': 'id and name are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO contacts (id, name, company_id, role, owner, email, phone, last_touch, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data['id'],
                data['name'],
                data.get('companyId'),
                data.get('role'),
                data.get('owner'),
                data.get('email'),
                data.get('phone'),
                data.get('lastTouch') or None,
                data.get('status', 'Active'),
            ),
        )
        conn.commit()
        return jsonify({'message': 'Contact created', 'id': data['id']}), 201
    finally:
        close_connection(conn)


# ─── Google Sheets Sync ───────────────────────────────────────────────────────

@app.route('/api/sync/gsheets', methods=['POST'])
def trigger_gsheets_sync():
    try:
        result = sync_from_sheets()
        if "error" in result:
            return jsonify(result), 500
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Leads ────────────────────────────────────────────────────────────────────

@app.route('/api/leads', methods=['GET'])
def get_leads():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch')
        if branch and branch != 'Headquarters':
            cursor.execute(
                """SELECT id, customer_name AS customerName, contact_num AS contactNum,
                          address, region, sr, branch, status, created_at AS createdAt
                   FROM leads WHERE branch = %s ORDER BY created_at DESC""",
                (branch,)
            )
        else:
            cursor.execute(
                """SELECT id, customer_name AS customerName, contact_num AS contactNum,
                          address, region, sr, branch, status, created_at AS createdAt
                   FROM leads ORDER BY created_at DESC"""
            )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/leads', methods=['POST'])
def create_lead():
    data = request.get_json()
    if not data.get('customerName'):
        return jsonify({'error': 'customerName is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        lead_id = data.get('id')
        customer_name = data.get('customerName')
        contact_num = data.get('contactNum')
        branch = data.get('branch')
        sr = data.get('sr')
        
        # 1. Insert into leads (Master record matching GSheets)
        cursor.execute(
            """INSERT INTO leads (id, customer_name, contact_num, address, region, sr, branch, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                lead_id,
                customer_name,
                contact_num,
                data.get('address'),
                data.get('region'),
                sr,
                branch,
                data.get('status', 'New'),
                data.get('createdAt') or None,
            ),
        )
        
        # 2. Automatically create a Company record
        # Use lead_id as company_id for direct linking
        cursor.execute(
            """INSERT INTO companies (id, name, city, owner, status)
               VALUES (%s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE name = VALUES(name)""",
            (lead_id, customer_name, data.get('region'), sr, 'Active')
        )
        
        # 3. Automatically create a Contact record
        import uuid
        contact_id = str(uuid.uuid4())
        cursor.execute(
            """INSERT INTO contacts (id, name, company_id, owner, phone, status)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (contact_id, customer_name, lead_id, sr, contact_num, 'Active')
        )

        conn.commit()
        
        # Sync to Google Sheets
        try:
            sync_to_sheets(data)
        except Exception as e:
            print(f"Failed to sync to Google Sheets: {e}")
            
        return jsonify({'message': 'Lead, Company, and Contact created', 'id': lead_id}), 201
    finally:
        close_connection(conn)


@app.route('/api/leads/<lead_id>/status', methods=['PATCH'])
def update_lead_status(lead_id):
    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({'error': 'status is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT status FROM leads WHERE id = %s', (lead_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Lead not found'}), 404

        old_status = row[0]
        cursor.execute('UPDATE leads SET status = %s WHERE id = %s', (new_status, lead_id))
        log_audit(conn, 'lead', lead_id, 'status_change', old_status, new_status)
        conn.commit()
        return jsonify({'message': 'Lead status updated'})
    finally:
        close_connection(conn)


# ─── Deals ────────────────────────────────────────────────────────────────────

@app.route('/api/deals', methods=['GET'])
def get_deals():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name, company_id AS companyId, contact_id AS contactId,
                      lead_id AS leadId, stage, value, close_date AS closeDate,
                      probability, owner, created_at
               FROM deals ORDER BY created_at DESC"""
        )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/deals', methods=['POST'])
def create_deal():
    data = request.get_json()
    if not all(k in data for k in ['id', 'name']):
        return jsonify({'error': 'id and name are required'}), 400

    stage = data.get('stage', 'New Opportunity')
    probability = STAGE_PROBABILITY.get(stage, 20)

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data['id'],
                data['name'],
                data.get('companyId'),
                data.get('contactId'),
                data.get('leadId') or None,
                stage,
                data.get('value', 0),
                data.get('closeDate') or data.get('expectedClose') or None,
                probability,
                data.get('owner'),
            ),
        )
        conn.commit()
        return jsonify({'message': 'Deal created', 'id': data['id']}), 201
    finally:
        close_connection(conn)


@app.route('/api/deals/<deal_id>/stage', methods=['PATCH'])
def update_deal_stage(deal_id):
    data = request.get_json()
    new_stage = data.get('stage')
    if not new_stage:
        return jsonify({'error': 'stage is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT stage FROM deals WHERE id = %s', (deal_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Deal not found'}), 404

        old_stage = row[0]
        new_probability = STAGE_PROBABILITY.get(new_stage, 20)
        cursor.execute(
            'UPDATE deals SET stage = %s, probability = %s WHERE id = %s',
            (new_stage, new_probability, deal_id),
        )
        log_audit(conn, 'deal', deal_id, 'stage_change', old_stage, new_stage)
        conn.commit()
        return jsonify({'message': 'Deal stage updated', 'probability': new_probability})
    finally:
        close_connection(conn)


# ─── Activities (Tasks) ───────────────────────────────────────────────────────

@app.route('/api/activities', methods=['GET'])
def get_activities():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, subject, type, owner, deal_id AS dealId,
                      due_date AS dueDate, priority, status, notes, created_at
               FROM activities ORDER BY due_date ASC"""
        )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/activities', methods=['POST'])
def create_activity():
    data = request.get_json()
    if not all(k in data for k in ['id', 'subject']):
        return jsonify({'error': 'id and subject are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO activities (id, subject, type, owner, deal_id, due_date, priority, status, notes)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data['id'],
                data['subject'],
                data.get('type', 'Follow-up'),
                data.get('owner'),
                data.get('dealId') or None,
                data.get('dueDate') or None,
                data.get('priority', 'Medium'),
                data.get('status', 'Open'),
                data.get('notes'),
            ),
        )
        conn.commit()
        return jsonify({'message': 'Activity created', 'id': data['id']}), 201
    finally:
        close_connection(conn)


@app.route('/api/activities/<activity_id>/status', methods=['PATCH'])
def update_activity_status(activity_id):
    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({'error': 'status is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT status FROM activities WHERE id = %s', (activity_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Activity not found'}), 404

        old_status = row[0]
        cursor.execute('UPDATE activities SET status = %s WHERE id = %s', (new_status, activity_id))
        log_audit(conn, 'activity', activity_id, 'status_change', old_status, new_status)
        conn.commit()
        return jsonify({'message': 'Activity status updated'})
    finally:
        close_connection(conn)


# ─── Dashboard KPIs ───────────────────────────────────────────────────────────

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch')
        branch_filter = '' if (not branch or branch == 'Headquarters') else f"WHERE branch = '{branch}'"
        branch_filter_and = '' if (not branch or branch == 'Headquarters') else f"AND branch = '{branch}'"

        # New leads this month
        cursor.execute(
            f"SELECT COUNT(*) FROM leads {branch_filter} {'AND' if branch_filter else 'WHERE'} DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')".replace(
                'WHERE  AND', 'WHERE'
            )
        )
        new_leads = cursor.fetchone()[0]

        # Active deals (not Closed Won)
        cursor.execute("SELECT COUNT(*) FROM deals WHERE stage != 'Closed Won'")
        active_deals = cursor.fetchone()[0]

        # Deals per stage
        cursor.execute("SELECT stage, COUNT(*) AS count, SUM(value) AS value FROM deals GROUP BY stage")
        deals_per_stage = rows_to_list(cursor)

        # Conversion rate
        cursor.execute(f"SELECT COUNT(*) FROM leads {branch_filter}")
        total_leads = cursor.fetchone()[0]
        cursor.execute(f"SELECT COUNT(*) FROM leads WHERE status = 'Converted' {branch_filter_and}")
        converted = cursor.fetchone()[0]
        conversion_rate = round((converted / total_leads * 100)) if total_leads else 0

        # Pipeline value
        cursor.execute("SELECT COALESCE(SUM(value), 0) FROM deals WHERE stage != 'Closed Won'")
        pipeline_value = float(cursor.fetchone()[0])

        return jsonify({
            'newLeads':      new_leads,
            'activeDeals':   active_deals,
            'dealsPerStage': deals_per_stage,
            'conversionRate': conversion_rate,
            'pipelineValue': pipeline_value,
        })
    finally:
        close_connection(conn)


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5000)
