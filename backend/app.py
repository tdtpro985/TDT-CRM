import os
import traceback
from functools import wraps
from importlib import import_module
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from database.database import get_db_connection, close_connection
from database.sync_pipeline import fill_pipeline
from gsheets_sync import sync_from_sheets, sync_to_sheets
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {
    "origins": os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "allow_headers": ["Content-Type", "Authorization"]
}})

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)  # 8-hour sessions
jwt = JWTManager(app)

@jwt.unauthorized_loader
def unauthorized_response(callback):
    return jsonify({'error': 'Missing Authorization Header', 'details': callback}), 401

@jwt.invalid_token_loader
def invalid_token_response(callback):
    return jsonify({'error': 'Invalid Token', 'details': callback}), 401

@jwt.expired_token_loader
def expired_token_response(jwt_header, jwt_payload):
    return jsonify({'error': 'Token Expired'}), 401

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["1000 per day", "200 per hour"]
)

# Admin-only decorator: use on top of @jwt_required()
# Usage: @jwt_required() THEN @admin_required on the route
def admin_required(fn):
    """Decorator that checks the JWT claims for Admin role.
    Must be stacked BELOW @jwt_required() so the token is already validated.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'Admin':
            return jsonify(error='Admins only!'), 403
        return fn(*args, **kwargs)
    return wrapper

@app.errorhandler(Exception)
def handle_exception(e):
    # Log securely on backend
    print(f"Backend Error: {traceback.format_exc()}")
    return jsonify(error="An internal error occurred"), 500

STAGE_PROBABILITY = {
    'New Opportunity': 20,
    'Qualified':       40,
    'Proposal':        60,
    'Negotiation':     80,
    'Closed Won':      100,
    'Closed Lost':     0,
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def rows_to_list(cursor):
    """Return all rows from the cursor as a list of dicts."""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def verify_password(stored_hash, provided_password):
    """Verify passwords across both Werkzeug and bcrypt hash formats.

    Returns:
        tuple[bool, bool]: (is_valid, should_rehash)
    """
    if not stored_hash or not provided_password:
        return False, False

    hash_value = stored_hash.decode('utf-8', errors='ignore') if isinstance(stored_hash, bytes) else str(stored_hash)
    password_value = str(provided_password)

    try:
        return check_password_hash(hash_value, password_value), False
    except (ValueError, TypeError):
        pass

    if hash_value.startswith(('$2a$', '$2b$', '$2y$')):
        try:
            bcrypt_module = import_module('bcrypt')
            is_valid = bcrypt_module.checkpw(password_value.encode('utf-8'), hash_value.encode('utf-8'))
            return is_valid, is_valid
        except (ImportError, ValueError, TypeError):
            return False, False

    return False, False


def normalize_username(username):
    return str(username or '').strip().lower()


def normalize_branch(branch):
    return str(branch or '').strip().lower()


def has_branch_filter(branch):
    normalized = normalize_branch(branch)
    return bool(normalized and normalized != 'headquarters')


def log_audit(conn, entity_type, entity_id, action, old_value=None, new_value=None):
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value)
           VALUES (%s, %s, %s, %s, %s)""",
        (entity_type, entity_id, action, old_value, new_value),
    )
    cursor.close()


# ─── Auth / Login ─────────────────────────────────────────────────────────────

@app.route('/api/admin/login', methods=['POST'])
@limiter.limit("5 per minute")
def admin_login():
    data     = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name, email, role, branch, password, username, region
               FROM team
               WHERE LOWER(TRIM(username)) = %s AND role = 'Admin'""",
            (normalize_username(username),)
        )
        row = cursor.fetchone()

        if not row:
            return jsonify({'error': 'Invalid credentials or account is not an Admin.'}), 401

        valid_password, should_rehash = verify_password(row[5], password)
        if not valid_password:
            return jsonify({'error': 'Invalid credentials or account is not an Admin.'}), 401

        if should_rehash:
            cursor.execute('UPDATE team SET password = %s WHERE id = %s', (generate_password_hash(password), row[0]))
            conn.commit()

        user = {
            'id':       row[0],
            'name':     row[1],
            'email':    row[2],
            'role':     row[3],
            'branch':   row[4],
            'username': row[6],
            'region':   row[7]
        }
        
        # Ensure identity is a string and include role/branch in claims
        access_token = create_access_token(
            identity=str(user['id']), 
            additional_claims={"role": user['role'], "branch": user['branch'], "region": user['region']}
        )
        return jsonify({'message': 'Login successful', 'user': user, 'access_token': access_token}), 200
    finally:
        close_connection(conn)


@app.route('/api/login', methods=['POST'])
@limiter.limit("5 per minute")
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
            """SELECT id, name, email, role, branch, password, username, region
               FROM team
               WHERE LOWER(TRIM(username)) = %s
                 AND LOWER(TRIM(branch)) = %s""",
            (normalize_username(username), normalize_branch(branch))
        )
        row = cursor.fetchone()

        if not row:
            return jsonify({'error': 'Invalid credentials or branch mismatch'}), 401

        valid_password, should_rehash = verify_password(row[5], password)
        if not valid_password:
            return jsonify({'error': 'Invalid credentials or branch mismatch'}), 401

        if should_rehash:
            cursor.execute('UPDATE team SET password = %s WHERE id = %s', (generate_password_hash(password), row[0]))
            conn.commit()

        user = {
            'id':       row[0],
            'name':     row[1],
            'email':    row[2],
            'role':     row[3],
            'branch':   row[4],
            'username': row[6],
            'region':   row[7]
        }
        
        # Ensure identity is a string and include role/branch in claims
        access_token = create_access_token(
            identity=str(user['id']), 
            additional_claims={"role": user['role'], "branch": user['branch'], "region": user['region']}
        )
        return jsonify({'message': 'Login successful', 'user': user, 'access_token': access_token}), 200
    finally:
        close_connection(conn)


# ─── Customers ────────────────────────────────────────────────────────────────

@app.route('/api/customers', methods=['GET'])
@jwt_required()
def get_customers():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch', '')
        
        # Base query for customers with computed status and KPIs
        # Status logic: Negotiation > Prospect > Converted > New
        query = """
            SELECT 
                c.id, c.name, c.industry, c.website, c.city, t.name AS owner, c.owner_id AS ownerId, 
                c.status AS companyStatus, c.created_at AS createdAt,
                l.contact_num AS contactNum, l.address, l.region, t_lead.name AS sr, l.branch,
                COALESCE(deal_stats.totalDealCount, 0) AS totalDealCount,
                COALESCE(deal_stats.activeDealCount, 0) AS activeDealCount,
                COALESCE(deal_stats.closedWonCount, 0) AS closedWonCount,
                COALESCE(deal_stats.closedLostCount, 0) AS closedLostCount,
                COALESCE(deal_stats.closedWonValue, 0) AS closedWonValue,
                COALESCE(deal_stats.closedLostValue, 0) AS closedLostValue,
                CASE 
                    WHEN COALESCE(deal_stats.closedLostCount, 0) = 0 THEN 
                        CASE WHEN COALESCE(deal_stats.closedWonCount, 0) > 0 THEN 'Win Only' ELSE 'No History' END
                    ELSE ROUND(COALESCE(deal_stats.closedWonCount, 0) / COALESCE(deal_stats.closedLostCount, 0), 2)
                END AS winLossRatio,
                CASE
                    WHEN COALESCE(deal_stats.totalDealCount, 0) = 0 THEN 'New'
                    WHEN deal_stats.hasNegotiation > 0 THEN 'Negotiation'
                    WHEN deal_stats.hasProspect > 0 THEN 'Prospect'
                    WHEN deal_stats.activeDealCount = 0 AND deal_stats.totalDealCount > 0 THEN 'Converted'
                    ELSE 'New'
                END AS customerStatus
            FROM companies c
            LEFT JOIN team t ON c.owner_id = t.id
            LEFT JOIN leads l ON c.id = l.id
            LEFT JOIN team t_lead ON l.owner_id = t_lead.id
            LEFT JOIN (
                SELECT 
                    company_id,
                    COUNT(*) AS totalDealCount,
                    SUM(CASE WHEN stage NOT IN ('Closed Won', 'Closed Lost') THEN 1 ELSE 0 END) AS activeDealCount,
                    SUM(CASE WHEN stage = 'Closed Won' THEN 1 ELSE 0 END) AS closedWonCount,
                    SUM(CASE WHEN stage = 'Closed Lost' THEN 1 ELSE 0 END) AS closedLostCount,
                    SUM(CASE WHEN stage = 'Closed Won' THEN value ELSE 0 END) AS closedWonValue,
                    SUM(CASE WHEN stage = 'Closed Lost' THEN value ELSE 0 END) AS closedLostValue,
                    SUM(CASE WHEN stage IN ('Proposal', 'Negotiation') THEN 1 ELSE 0 END) AS hasNegotiation,
                    SUM(CASE WHEN stage IN ('New Opportunity', 'Qualified') THEN 1 ELSE 0 END) AS hasProspect
                FROM deals
                GROUP BY company_id
            ) deal_stats ON c.id = deal_stats.company_id
        """
        
        where_clauses = ["1=1"]
        params = []
        
        if has_branch_filter(branch):
            where_clauses.append("LOWER(TRIM(l.branch)) = %s")
            params.append(normalize_branch(branch))
            
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
            
        query += " ORDER BY c.name"
        
        cursor.execute(query, tuple(params))
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/customers/<customer_id>', methods=['GET'])
@jwt_required()
def get_customer_detail(customer_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        
        # 1. Fetch Company/Customer info
        cursor.execute("""
            SELECT 
                c.id, c.name, c.industry, c.website, c.city, t.name AS owner, c.owner_id AS ownerId, 
                c.status AS companyStatus, c.created_at AS createdAt,
                l.contact_num AS contactNum, l.address, l.region, t_lead.name AS sr, l.branch,
                COALESCE(deal_stats.totalDealCount, 0) AS totalDealCount,
                COALESCE(deal_stats.activeDealCount, 0) AS activeDealCount,
                COALESCE(deal_stats.closedWonCount, 0) AS closedWonCount,
                COALESCE(deal_stats.closedLostCount, 0) AS closedLostCount,
                COALESCE(deal_stats.closedWonValue, 0) AS closedWonValue,
                COALESCE(deal_stats.closedLostValue, 0) AS closedLostValue,
                CASE
                    WHEN COALESCE(deal_stats.totalDealCount, 0) = 0 THEN 'New'
                    WHEN deal_stats.hasNegotiation > 0 THEN 'Negotiation'
                    WHEN deal_stats.hasProspect > 0 THEN 'Prospect'
                    WHEN deal_stats.activeDealCount = 0 AND deal_stats.totalDealCount > 0 THEN 'Converted'
                    ELSE 'New'
                END AS customerStatus
            FROM companies c
            LEFT JOIN team t ON c.owner_id = t.id
            LEFT JOIN leads l ON c.id = l.id
            LEFT JOIN team t_lead ON l.owner_id = t_lead.id
            LEFT JOIN (
                SELECT 
                    company_id,
                    COUNT(*) AS totalDealCount,
                    SUM(CASE WHEN stage NOT IN ('Closed Won', 'Closed Lost') THEN 1 ELSE 0 END) AS activeDealCount,
                    SUM(CASE WHEN stage = 'Closed Won' THEN 1 ELSE 0 END) AS closedWonCount,
                    SUM(CASE WHEN stage = 'Closed Lost' THEN 1 ELSE 0 END) AS closedLostCount,
                    SUM(CASE WHEN stage = 'Closed Won' THEN value ELSE 0 END) AS closedWonValue,
                    SUM(CASE WHEN stage = 'Closed Lost' THEN value ELSE 0 END) AS closedLostValue,
                    SUM(CASE WHEN stage IN ('Proposal', 'Negotiation') THEN 1 ELSE 0 END) AS hasNegotiation,
                    SUM(CASE WHEN stage IN ('New Opportunity', 'Qualified') THEN 1 ELSE 0 END) AS hasProspect
                FROM deals
                GROUP BY company_id
            ) deal_stats ON c.id = deal_stats.company_id
            WHERE c.id = %s
        """, (customer_id,))
        
        customer_row = cursor.fetchone()
        if not customer_row:
            return jsonify({'error': 'Customer not found'}), 404
            
        columns = [col[0] for col in cursor.description]
        customer_data = dict(zip(columns, customer_row))
        
        # 2. Fetch all deals for this customer
        cursor.execute("""
            SELECT d.id, d.name, d.stage, d.value, d.close_date AS closeDate, d.probability, 
                   t.name AS owner, d.owner_id AS ownerId, d.created_at AS createdAt
            FROM deals d
            LEFT JOIN team t ON d.owner_id = t.id
            WHERE d.company_id = %s
            ORDER BY d.created_at DESC
        """, (customer_id,))
        deals = rows_to_list(cursor)
        
        # 3. Fetch all activities for these deals
        deal_ids = [d['id'] for d in deals]
        activities = []
        if deal_ids:
            format_strings = ','.join(['%s'] * len(deal_ids))
            cursor.execute(f"""
                SELECT a.id, a.subject, a.type, t.name AS owner, a.owner_id AS ownerId,
                       a.deal_id AS dealId, a.due_date AS dueDate, a.priority, a.status, a.notes, a.created_at AS createdAt
                FROM activities a
                LEFT JOIN team t ON a.owner_id = t.id
                WHERE a.deal_id IN ({format_strings})
                ORDER BY a.created_at DESC
            """, tuple(deal_ids))
            activities = rows_to_list(cursor)
            
        # 4. Fetch audit log for these deals
        audit_logs = []
        if deal_ids:
            format_strings = ','.join(['%s'] * len(deal_ids))
            cursor.execute(f"""
                SELECT id, entity_type AS entityType, entity_id AS entityId, action, old_value AS oldValue, new_value AS newValue, changed_at AS changedAt
                FROM audit_log
                WHERE entity_type = 'deal' AND entity_id IN ({format_strings})
                ORDER BY changed_at DESC
            """, tuple(deal_ids))
            audit_logs = rows_to_list(cursor)
            
        return jsonify({
            'customer': customer_data,
            'deals': deals,
            'activities': activities,
            'auditLogs': audit_logs
        })
    finally:
        close_connection(conn)


# ─── Team ─────────────────────────────────────────────────────────────────────

@app.route('/api/team', methods=['GET'])
@jwt_required()
def get_team():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch')
        if branch and branch != 'Headquarters':
            cursor.execute('SELECT id, name, role, branch, region FROM team WHERE branch = %s ORDER BY name', (branch,))
        else:
            cursor.execute('SELECT id, name, role, branch, region FROM team ORDER BY name')
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


# ─── Companies ────────────────────────────────────────────────────────────────

@app.route('/api/companies', methods=['GET'])
@jwt_required()
def get_companies():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch', '')
        if has_branch_filter(branch):
            cursor.execute(
                '''
                SELECT c.id, c.name, c.industry, c.website, c.city, t.name AS owner, c.owner_id AS ownerId, c.status, c.created_at
                FROM companies c
                LEFT JOIN team t ON c.owner_id = t.id
                INNER JOIN leads l ON l.id = c.id
                WHERE LOWER(TRIM(l.branch)) = %s
                ORDER BY c.name
                ''',
                (normalize_branch(branch),),
            )
        else:
            cursor.execute(
                '''
                SELECT c.id, c.name, c.industry, c.website, c.city, t.name AS owner, c.owner_id AS ownerId, c.status, c.created_at 
                FROM companies c
                LEFT JOIN team t ON c.owner_id = t.id
                LEFT JOIN leads l ON l.id = c.id
                WHERE 1=1
                ORDER BY c.name
                '''
            )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/companies', methods=['POST'])
@jwt_required()
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
            """INSERT INTO companies (id, name, industry, website, city, owner_id, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                data['id'],
                data['name'],
                data.get('industry'),
                data.get('website'),
                data.get('city'),
                data.get('ownerId'),
                data.get('status', 'Active'),
            ),
        )
        conn.commit()
        return jsonify({'message': 'Company created', 'id': data['id']}), 201
    finally:
        close_connection(conn)


# ─── Contacts ─────────────────────────────────────────────────────────────────

@app.route('/api/contacts', methods=['GET'])
@jwt_required()
def get_contacts():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch', '')
        if has_branch_filter(branch):
            cursor.execute(
                '''
                SELECT c.id, c.name, c.company_id AS companyId, c.role, t.name AS owner, c.owner_id AS ownerId,
                       c.email, c.phone, c.last_touch AS lastTouch, c.status, c.created_at
                FROM contacts c
                LEFT JOIN team t ON c.owner_id = t.id
                INNER JOIN leads l ON l.id = c.company_id
                WHERE LOWER(TRIM(l.branch)) = %s
                ORDER BY c.name
                ''',
                (normalize_branch(branch),),
            )
        else:
            cursor.execute(
                """SELECT c.id, c.name, c.company_id AS companyId, c.role, t.name AS owner, c.owner_id AS ownerId,
                          c.email, c.phone, c.last_touch AS lastTouch, c.status, c.created_at
                   FROM contacts c
                   LEFT JOIN team t ON c.owner_id = t.id
                   LEFT JOIN leads l ON l.id = c.company_id
                   WHERE 1=1
                   ORDER BY c.name"""
            )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/contacts', methods=['POST'])
@jwt_required()
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
            """INSERT INTO contacts (id, name, company_id, role, owner_id, email, phone, last_touch, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data['id'],
                data['name'],
                data.get('companyId'),
                data.get('role'),
                data.get('ownerId'),
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
@limiter.limit("2 per minute")
@jwt_required()
@admin_required
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
@jwt_required()
def get_leads():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch', '')
        if has_branch_filter(branch):
            cursor.execute(
                """SELECT l.id, l.customer_name AS customerName, l.contact_num AS contactNum,
                          l.address, l.region, t.name AS sr, l.owner_id AS ownerId, l.branch, l.status, l.created_at AS createdAt
                   FROM leads l
                   LEFT JOIN team t ON l.owner_id = t.id
                   WHERE LOWER(TRIM(l.branch)) = %s
                   ORDER BY l.created_at DESC""",
                (normalize_branch(branch),)
            )
        else:
            cursor.execute(
                """SELECT l.id, l.customer_name AS customerName, l.contact_num AS contactNum,
                          l.address, l.region, t.name AS sr, l.owner_id AS ownerId, l.branch, l.status, l.created_at AS createdAt
                   FROM leads l
                   LEFT JOIN team t ON l.owner_id = t.id
                   WHERE 1=1
                   ORDER BY l.created_at DESC"""
            )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/leads', methods=['POST'])
@jwt_required()
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
        owner_id = data.get('ownerId')

        # Validation: Ensure owner_id belongs to the correct branch/region
        if owner_id:
            cursor.execute('SELECT branch, region FROM team WHERE id = %s', (owner_id,))
            team_row = cursor.fetchone()
            if not team_row:
                return jsonify({'error': 'Assigned owner not found in team'}), 400
            
            # Allow Admins to bypass branch check, but Sales Reps must match
            token_claims = get_jwt()
            if token_claims.get('role') != 'Admin':
                if normalize_branch(team_row[0]) != normalize_branch(branch):
                    return jsonify({'error': f'Owner branch ({team_row[0]}) mismatch with lead branch ({branch})'}), 400
        
        # 1. Insert into leads (Master record matching GSheets)
        cursor.execute(
            """INSERT INTO leads (id, customer_name, contact_num, address, region, owner_id, branch, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                lead_id,
                customer_name,
                contact_num,
                data.get('address'),
                data.get('region'),
                owner_id,
                branch,
                data.get('status', 'New'),
                data.get('createdAt') or CURRENT_DATE,
            ),
        )
        
        # 2. Automatically create a Company record
        # Use lead_id as company_id for direct linking
        cursor.execute(
            """INSERT INTO companies (id, name, city, owner_id, status)
               VALUES (%s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE name = VALUES(name), owner_id = VALUES(owner_id)""",
            (lead_id, customer_name, data.get('region'), owner_id, 'Active')
        )
        
        # 3. Automatically create a Contact record
        import uuid
        contact_id = str(uuid.uuid4())
        cursor.execute(
            """INSERT INTO contacts (id, name, company_id, owner_id, phone, status)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (contact_id, customer_name, lead_id, owner_id, contact_num, 'Active')
        )

        # 4. Add the contact to the deal if it's created via pipeline sync (not applicable here, but good for consistency)
        # For now, we just ensure the join table exists for many-to-many.
        
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
@jwt_required()
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
@jwt_required()
def get_deals():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch', '')
        if has_branch_filter(branch):
            cursor.execute(
                '''
                SELECT d.id, d.name, d.company_id AS companyId, d.contact_id AS contactId,
                       d.lead_id AS leadId, d.stage, d.value, d.close_date AS closeDate,
                       d.probability, t.name AS owner, d.owner_id AS ownerId, d.created_at,
                       COALESCE(urgency.urgencyScore, 0) AS urgencyScore,
                       CASE
                           WHEN urgency.hasOverdue = 1 THEN 'Overdue'
                           WHEN urgency.hasHigh = 1 THEN 'High Priority'
                           WHEN urgency.hasToday = 1 THEN 'Due Today'
                           ELSE NULL
                       END AS urgencyLabel,
                       urgency.nextDueDate,
                       GREATEST(
                           IFNULL(activity_touch.lastActivityDate, DATE('1000-01-01')),
                           IFNULL(DATE(audit_touch.lastAuditDate), DATE('1000-01-01')),
                           IFNULL(d.created_at, DATE('1000-01-01'))
                       ) AS lastTouch,
                       CASE WHEN agos.agosCount > 0 THEN 1 ELSE 0 END AS isAgos
                FROM deals d
                LEFT JOIN team t ON d.owner_id = t.id
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                LEFT JOIN (
                    SELECT a.deal_id,
                               MAX(CASE
                                   WHEN a.status IN ('Open', 'Reopened') AND a.due_date < CURDATE() THEN 3
                                   WHEN a.status IN ('Open', 'Reopened') AND a.priority = 'High' THEN 2
                                   WHEN a.status IN ('Open', 'Reopened') AND a.due_date = CURDATE() THEN 1
                                   ELSE 0
                               END) AS urgencyScore,
                               MAX(CASE WHEN a.status IN ('Open', 'Reopened') AND a.due_date < CURDATE() THEN 1 ELSE 0 END) AS hasOverdue,
                               MAX(CASE WHEN a.status IN ('Open', 'Reopened') AND a.priority = 'High' THEN 1 ELSE 0 END) AS hasHigh,
                               MAX(CASE WHEN a.status IN ('Open', 'Reopened') AND a.due_date = CURDATE() THEN 1 ELSE 0 END) AS hasToday,
                               MIN(CASE WHEN a.status IN ('Open', 'Reopened') THEN a.due_date END) AS nextDueDate
                    FROM activities a
                    GROUP BY a.deal_id
                ) urgency ON urgency.deal_id = d.id
                LEFT JOIN (
                    SELECT a.deal_id, MAX(a.created_at) AS lastActivityDate
                    FROM activities a
                    GROUP BY a.deal_id
                ) activity_touch ON activity_touch.deal_id = d.id
                LEFT JOIN (
                    SELECT al.entity_id AS deal_id, MAX(al.changed_at) AS lastAuditDate
                    FROM audit_log al
                    WHERE al.entity_type = 'deal'
                    GROUP BY al.entity_id
                ) audit_touch ON audit_touch.deal_id = d.id
                LEFT JOIN (
                    SELECT a.deal_id,
                           SUM(CASE WHEN a.notes LIKE '%Automatic task generated%' THEN 1 ELSE 0 END) AS agosCount
                    FROM activities a
                    GROUP BY a.deal_id
                ) agos ON agos.deal_id = d.id
                WHERE LOWER(TRIM(l.branch)) = %s
                ORDER BY urgencyScore DESC, d.created_at DESC
                ''',
                (normalize_branch(branch),),
            )
        else:
            cursor.execute(
                """SELECT d.id, d.name, d.company_id AS companyId, d.contact_id AS contactId,
                          d.lead_id AS leadId, d.stage, d.value, d.close_date AS closeDate,
                          d.probability, t.name AS owner, d.owner_id AS ownerId, d.created_at,
                          COALESCE(urgency.urgencyScore, 0) AS urgencyScore,
                          CASE
                              WHEN urgency.hasOverdue = 1 THEN 'Overdue'
                              WHEN urgency.hasHigh = 1 THEN 'High Priority'
                              WHEN urgency.hasToday = 1 THEN 'Due Today'
                              ELSE NULL
                          END AS urgencyLabel,
                          urgency.nextDueDate,
                          GREATEST(
                              IFNULL(activity_touch.lastActivityDate, DATE('1000-01-01')),
                              IFNULL(DATE(audit_touch.lastAuditDate), DATE('1000-01-01')),
                              IFNULL(d.created_at, DATE('1000-01-01'))
                          ) AS lastTouch,
                          CASE WHEN agos.agosCount > 0 THEN 1 ELSE 0 END AS isAgos
                   FROM deals d
                   LEFT JOIN team t ON d.owner_id = t.id
                   LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                   LEFT JOIN (
                       SELECT a.deal_id,
                              MAX(CASE
                                  WHEN a.status IN ('Open', 'Reopened') AND a.due_date < CURDATE() THEN 3
                                  WHEN a.status IN ('Open', 'Reopened') AND a.priority = 'High' THEN 2
                                  WHEN a.status IN ('Open', 'Reopened') AND a.due_date = CURDATE() THEN 1
                                  ELSE 0
                              END) AS urgencyScore,
                              MAX(CASE WHEN a.status IN ('Open', 'Reopened') AND a.due_date < CURDATE() THEN 1 ELSE 0 END) AS hasOverdue,
                              MAX(CASE WHEN a.status IN ('Open', 'Reopened') AND a.priority = 'High' THEN 1 ELSE 0 END) AS hasHigh,
                              MAX(CASE WHEN a.status IN ('Open', 'Reopened') AND a.due_date = CURDATE() THEN 1 ELSE 0 END) AS hasToday,
                              MIN(CASE WHEN a.status IN ('Open', 'Reopened') THEN a.due_date END) AS nextDueDate
                       FROM activities a
                       GROUP BY a.deal_id
                   ) urgency ON urgency.deal_id = d.id
                   LEFT JOIN (
                       SELECT a.deal_id, MAX(a.created_at) AS lastActivityDate
                       FROM activities a
                       GROUP BY a.deal_id
                   ) activity_touch ON activity_touch.deal_id = d.id
                   LEFT JOIN (
                       SELECT al.entity_id AS deal_id, MAX(al.changed_at) AS lastAuditDate
                       FROM audit_log al
                       WHERE al.entity_type = 'deal'
                       GROUP BY al.entity_id
                   ) audit_touch ON audit_touch.deal_id = d.id
                   LEFT JOIN (
                       SELECT a.deal_id,
                              SUM(CASE WHEN a.notes LIKE '%Automatic task generated%' THEN 1 ELSE 0 END) AS agosCount
                       FROM activities a
                       GROUP BY a.deal_id
                   ) agos ON agos.deal_id = d.id
                   WHERE 1=1
                     AND l.branch IS NOT NULL
                   ORDER BY urgencyScore DESC, d.created_at DESC"""
            )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/deals', methods=['POST'])
@jwt_required()
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
        owner_id = data.get('ownerId')
        
        # Validation for owner_id branch mismatch
        if owner_id:
            cursor.execute('SELECT branch FROM team WHERE id = %s', (owner_id,))
            team_row = cursor.fetchone()
            if not team_row:
                return jsonify({'error': 'Assigned owner not found in team'}), 400
            
            # If leadId is provided, check branch against lead's branch
            lead_id = data.get('leadId')
            if lead_id:
                cursor.execute('SELECT branch FROM leads WHERE id = %s', (lead_id,))
                lead_row = cursor.fetchone()
                if lead_row:
                    if team_row[0] != lead_row[0]:
                        token_claims = get_jwt()
                        if token_claims.get('role') != 'Admin':
                            return jsonify({'error': f'Owner branch ({team_row[0]}) mismatch with lead/deal branch ({lead_row[0]})'}), 400

        cursor.execute(
            """INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner_id)
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
                data.get('ownerId'),
            ),
        )
        conn.commit()
        return jsonify({'message': 'Deal created', 'id': data['id']}), 201
    finally:
        close_connection(conn)


@app.route('/api/deals/<deal_id>/stage', methods=['PATCH'])
@jwt_required()
def update_deal_stage(deal_id):
    data = request.get_json()
    new_stage = data.get('stage')
    new_value = data.get('value')
    new_close = data.get('closeDate')
    new_owner = data.get('owner')

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT stage, value, close_date, owner, lead_id FROM deals WHERE id = %s', (deal_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Deal not found'}), 404

        old_stage, old_value, old_close, old_owner, lead_id = row
        
        updates = []
        params = []
        
        if new_stage:
            new_probability = STAGE_PROBABILITY.get(new_stage, 20)
            updates.append('stage = %s, probability = %s')
            params.extend([new_stage, new_probability])
            log_audit(conn, 'deal', deal_id, 'stage_change', old_stage, new_stage)
        
        if new_value is not None:
            updates.append('value = %s')
            params.append(new_value)
            log_audit(conn, 'deal', deal_id, 'value_change', str(old_value), str(new_value))
            
        if new_close:
            updates.append('close_date = %s')
            params.append(new_close)
            log_audit(conn, 'deal', deal_id, 'close_date_change', str(old_close), str(new_close))
            
        if data.get('ownerId'):
            updates.append('owner_id = %s')
            params.append(data.get('ownerId'))
            log_audit(conn, 'deal', deal_id, 'owner_id_change', str(row[3]), str(data.get('ownerId')))

        if not updates:
            return jsonify({'message': 'No updates provided'}), 400

        params.append(deal_id)
        cursor.execute(f'UPDATE deals SET {", ".join(updates)} WHERE id = %s', params)
        conn.commit()

        if new_stage:
            is_closed = new_stage in ('Closed Won', 'Closed Lost')
            if is_closed and lead_id:
                cursor.execute('SELECT branch FROM leads WHERE id = %s', (lead_id,))
                lead_row = cursor.fetchone()
                if lead_row:
                    fill_pipeline(conn, branch=lead_row[0])
                    conn.commit()

        return jsonify({'message': 'Deal updated successfully'})
    finally:
        close_connection(conn)


# ─── Activities (Tasks) ───────────────────────────────────────────────────────

@app.route('/api/activities', methods=['GET'])
@jwt_required()
def get_activities():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch', '')
        if has_branch_filter(branch):
            cursor.execute(
                '''
                SELECT a.id, a.subject, a.type, t.name AS owner, a.owner_id AS ownerId, a.deal_id AS dealId,
                       a.due_date AS dueDate, a.priority, a.status, a.notes, a.created_at, a.stage
                FROM activities a
                LEFT JOIN team t ON a.owner_id = t.id
                LEFT JOIN deals d ON d.id = a.deal_id
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE LOWER(TRIM(l.branch)) = %s
                ORDER BY
                    CASE
                        WHEN a.status IN ('Open', 'Reopened') AND a.due_date < CURDATE() THEN 1
                        WHEN a.status IN ('Open', 'Reopened') AND a.priority = 'High' THEN 2
                        WHEN a.status IN ('Open', 'Reopened') AND a.due_date = CURDATE() THEN 3
                        WHEN a.status IN ('Open', 'Reopened') THEN 4
                        ELSE 5
                    END,
                    a.due_date ASC
                ''',
                (normalize_branch(branch),),
            )
        else:
            cursor.execute(
                """SELECT a.id, a.subject, a.type, t.name AS owner, a.owner_id AS ownerId, a.deal_id AS dealId,
                          a.due_date AS dueDate, a.priority, a.status, a.notes, a.created_at, a.stage
                   FROM activities a
                   LEFT JOIN team t ON a.owner_id = t.id
                   LEFT JOIN deals d ON d.id = a.deal_id
                   LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                   WHERE 1=1
                   ORDER BY
                       CASE
                           WHEN a.status IN ('Open', 'Reopened') AND a.due_date < CURDATE() THEN 1
                           WHEN a.status IN ('Open', 'Reopened') AND a.priority = 'High' THEN 2
                           WHEN a.status IN ('Open', 'Reopened') AND a.due_date = CURDATE() THEN 3
                           WHEN a.status IN ('Open', 'Reopened') THEN 4
                           ELSE 5
                       END,
                       a.due_date ASC"""
            )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/activities', methods=['POST'])
@jwt_required()
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
            """INSERT INTO activities (id, subject, type, owner_id, deal_id, due_date, priority, status, notes, stage)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data['id'],
                data['subject'],
                data.get('type', 'Follow-up'),
                data.get('ownerId'),
                data.get('dealId') or None,
                data.get('dueDate') or None,
                data.get('priority', 'Medium'),
                data.get('status', 'Open'),
                data.get('notes'),
                data.get('stage'),
            ),
        )
        conn.commit()
        return jsonify({'message': 'Activity created', 'id': data['id']}), 201
    finally:
        close_connection(conn)


@app.route('/api/activities/<activity_id>/status', methods=['PATCH'])
@jwt_required()
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
@jwt_required()
def get_dashboard():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch', '')
        has_branch = has_branch_filter(branch)
        branch_params = (normalize_branch(branch),) if has_branch else ()

        # New leads this month
        new_leads_query = "SELECT COUNT(*) FROM leads WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')"
        new_leads_query += ""
        if has_branch:
            new_leads_query += " AND LOWER(TRIM(branch)) = %s"
        cursor.execute(new_leads_query, branch_params)
        new_leads = cursor.fetchone()[0]

        # Active deals (not Closed Won or Closed Lost)
        if has_branch:
            cursor.execute(
                '''
                SELECT COUNT(*)
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE d.stage NOT IN ('Closed Won', 'Closed Lost') 
                  AND LOWER(TRIM(l.branch)) = %s
                ''',
                branch_params,
            )
        else:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE d.stage NOT IN ('Closed Won', 'Closed Lost') 
                  AND l.branch IS NOT NULL
            """)
        active_deals = cursor.fetchone()[0]

        # Deals per stage
        if has_branch:
            cursor.execute(
                '''
                SELECT d.stage, COUNT(*) AS count, SUM(d.value) AS value
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE LOWER(TRIM(l.branch)) = %s
                GROUP BY d.stage
                ''',
                branch_params,
            )
        else:
            cursor.execute("""
                SELECT d.stage, COUNT(*) AS count, SUM(d.value) AS value 
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE l.branch IS NOT NULL
                GROUP BY d.stage
            """)
        deals_per_stage = rows_to_list(cursor)

        # Conversion rate
        leads_query = "SELECT COUNT(*) FROM leads WHERE 1=1"
        if has_branch:
            leads_query += " AND LOWER(TRIM(branch)) = %s"
        cursor.execute(leads_query, branch_params)
        total_leads = cursor.fetchone()[0]
        
        converted_query = "SELECT COUNT(*) FROM leads WHERE status = 'Converted'"
        if has_branch:
            converted_query += " AND LOWER(TRIM(branch)) = %s"
        cursor.execute(converted_query, branch_params)
        converted = cursor.fetchone()[0]
        
        conversion_rate = round((converted / total_leads * 100), 1) if total_leads else 0

        # Pipeline value
        if has_branch:
            cursor.execute(
                '''
                SELECT COALESCE(SUM(d.value), 0)
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE d.stage NOT IN ('Closed Won', 'Closed Lost') 
                  AND LOWER(TRIM(l.branch)) = %s
                ''',
                branch_params,
            )
        else:
            cursor.execute("""
                SELECT COALESCE(SUM(d.value), 0) 
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE d.stage NOT IN ('Closed Won', 'Closed Lost') 
                  AND l.branch IS NOT NULL
            """)
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


# ─── Admin: Profile ───────────────────────────────────────────────────────────

@app.route('/api/admin/profile', methods=['PUT'])
@jwt_required()
@admin_required
def update_admin_profile():
    data             = request.get_json()
    admin_id         = data.get('id')
    current_password = data.get('currentPassword', '').strip()
    new_username     = data.get('newUsername', '').strip()
    new_password     = data.get('newPassword', '').strip()

    if not admin_id or not current_password:
        return jsonify({'error': 'Current password is required.'}), 400
    if not new_username and not new_password:
        return jsonify({'error': 'Provide a new username or new password.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        # Fetch hashed password for verification — never compare plaintext
        cursor.execute(
            "SELECT id, password FROM team WHERE id = %s AND role = 'Admin'",
            (admin_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Current password is incorrect.'}), 401

        valid_password, should_rehash = verify_password(row[1], current_password)
        if not valid_password:
            return jsonify({'error': 'Current password is incorrect.'}), 401

        if should_rehash:
            cursor.execute('UPDATE team SET password = %s WHERE id = %s', (generate_password_hash(current_password), admin_id))
            conn.commit()

        if new_username:
            cursor.execute('SELECT id FROM team WHERE username = %s AND id != %s', (new_username, admin_id))
            if cursor.fetchone():
                return jsonify({'error': 'Username is already taken.'}), 409

        # Always hash the new password before storing
        hashed_new = generate_password_hash(new_password) if new_password else None

        if new_username and hashed_new:
            cursor.execute('UPDATE team SET username = %s, password = %s WHERE id = %s', (new_username, hashed_new, admin_id))
        elif new_username:
            cursor.execute('UPDATE team SET username = %s WHERE id = %s', (new_username, admin_id))
        else:
            cursor.execute('UPDATE team SET password = %s WHERE id = %s', (hashed_new, admin_id))

        conn.commit()

        cursor.execute('SELECT id, username, name, email, role, branch FROM team WHERE id = %s', (admin_id,))
        row = cursor.fetchone()
        user = {'id': row[0], 'username': row[1], 'name': row[2], 'email': row[3], 'role': row[4], 'branch': row[5]}
        return jsonify({'message': 'Profile updated successfully.', 'user': user}), 200
    finally:
        close_connection(conn)


# ─── Admin: Analytics ─────────────────────────────────────────────────────────

@app.route('/api/admin/analytics', methods=['GET'])
@jwt_required()
@admin_required
def admin_analytics():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()

        # Users per branch (exclude Headquarters — admin-only, not a sales branch)
        cursor.execute("SELECT branch, COUNT(*) AS count FROM team WHERE branch != 'Headquarters' GROUP BY branch ORDER BY branch")
        users_per_branch = rows_to_list(cursor)

        # Role distribution (exclude Headquarters admins from sales role stats)
        cursor.execute("SELECT role, COUNT(*) AS count FROM team WHERE branch != 'Headquarters' GROUP BY role ORDER BY role")
        role_distribution = rows_to_list(cursor)

        # Leads per branch (excluding filtered SR)
        cursor.execute('''
            SELECT branch, COUNT(*) AS total, SUM(status = "Converted") AS converted 
            FROM leads 
            WHERE 1=1
            GROUP BY branch ORDER BY branch
        ''')
        leads_per_branch = rows_to_list(cursor)

        # Deals per branch (via robust join, active only, excluding filtered SR)
        cursor.execute('''
            SELECT l.branch,
                   COUNT(d.id)              AS deal_count,
                   COALESCE(SUM(d.value),0) AS pipeline_value
            FROM deals d
            LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
            WHERE d.stage NOT IN ('Closed Won', 'Closed Lost')
            GROUP BY l.branch
            ORDER BY l.branch
        ''')
        deals_per_branch = rows_to_list(cursor)

        # Totals (branch staff only, excluding Headquarters admins)
        cursor.execute("SELECT COUNT(*) FROM team WHERE branch != 'Headquarters'")
        total_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM leads WHERE 1=1")
        total_leads = cursor.fetchone()[0]

        cursor.execute('''
            SELECT COUNT(*) 
            FROM deals d
            LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
            WHERE d.stage NOT IN ('Closed Won', 'Closed Lost')
        ''')
        active_deals = cursor.fetchone()[0]

        cursor.execute('''
            SELECT COALESCE(SUM(d.value),0) 
            FROM deals d
            LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
            WHERE d.stage NOT IN ('Closed Won', 'Closed Lost')
        ''')
        pipeline_value = float(cursor.fetchone()[0])

        # Recent audit log (last 20)
        cursor.execute('SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 20')
        audit_log = rows_to_list(cursor)

        return jsonify({
            'usersPerBranch':   users_per_branch,
            'roleDistribution': role_distribution,
            'leadsPerBranch':   leads_per_branch,
            'dealsPerBranch':   deals_per_branch,
            'totals': {
                'users':        total_users,
                'leads':        total_leads,
                'activeDeals':  active_deals,
                'pipelineValue': pipeline_value,
            },
            'auditLog': audit_log,
        })
    finally:
        close_connection(conn)


# ─── Admin: User Management ───────────────────────────────────────────────────

@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
@admin_required
def admin_get_users():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        branch = request.args.get('branch')
        if branch and branch != 'Headquarters':
            cursor.execute(
                "SELECT id, username, name, email, role, branch FROM team WHERE branch = %s AND branch != 'Headquarters' ORDER BY branch, name",
                (branch,)
            )
        else:
            cursor.execute(
                "SELECT id, username, name, email, role, branch FROM team WHERE branch != 'Headquarters' ORDER BY branch, name"
            )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/admin/users', methods=['POST'])
@jwt_required()
@admin_required
def admin_create_user():
    data = request.get_json()
    required = ['username', 'password', 'name', 'branch']
    if not all(data.get(k, '').strip() for k in required):
        return jsonify({'error': 'username, password, name, and branch are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        # Hash the password before storing — never store plaintext
        hashed_password = generate_password_hash(data['password'])
        cursor.execute(
            'INSERT INTO team (username, password, name, email, role, branch) VALUES (%s, %s, %s, %s, %s, %s)',
            (
                data['username'].strip(),
                hashed_password,
                data['name'].strip(),
                data.get('email', '').strip(),
                data.get('role', 'Sales Rep'),
                data['branch'],
            )
        )
        conn.commit()
        return jsonify({'message': 'User created', 'id': cursor.lastrowid}), 201
    except Exception as e:
        if 'Duplicate entry' in str(e):
            return jsonify({'error': 'Username already exists'}), 409
        # Log actual error securely, return generic message
        print(f"admin_create_user error: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to create user'}), 500
    finally:
        close_connection(conn)


@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def admin_update_user(user_id):
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM team WHERE id = %s', (user_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'User not found'}), 404

        fields, values = [], []
        # Only allow known safe columns — never pass col names from user input
        for col in ['name', 'email', 'role', 'branch', 'username']:
            if col in data:
                fields.append(f'{col} = %s')
                values.append(data[col])
        if data.get('password'):
            # Hash updated password before storing
            fields.append('password = %s')
            values.append(generate_password_hash(data['password']))

        if not fields:
            return jsonify({'error': 'No fields to update'}), 400

        values.append(user_id)
        cursor.execute(f'UPDATE team SET {", ".join(fields)} WHERE id = %s', values)
        conn.commit()
        return jsonify({'message': 'User updated'})
    finally:
        close_connection(conn)


@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def admin_delete_user(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM team WHERE id = %s', (user_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'User not found'}), 404
        cursor.execute('DELETE FROM team WHERE id = %s', (user_id,))
        conn.commit()
        return jsonify({'message': 'User deleted'})
    finally:
        close_connection(conn)


@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    return response


@app.route('/api/deals/<deal_id>/contacts', methods=['GET'])
@jwt_required()
def get_deal_contacts(deal_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''
            SELECT c.id, c.name, c.role, dc.role AS deal_role
            FROM contacts c
            INNER JOIN deal_contacts dc ON c.id = dc.contact_id
            WHERE dc.deal_id = %s
            ''',
            (deal_id,),
        )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/deals/<deal_id>/contacts', methods=['POST'])
@jwt_required()
def add_deal_contact(deal_id):
    data = request.get_json()
    contact_id = data.get('contactId')
    role = data.get('role', 'Primary')
    if not contact_id:
        return jsonify({'error': 'contactId is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO deal_contacts (deal_id, contact_id, role) VALUES (%s, %s, %s)',
            (deal_id, contact_id, role),
        )
        conn.commit()
        return jsonify({'message': 'Contact added to deal'}), 201
    finally:
        close_connection(conn)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200


from database.purge_legacy_columns import run_purge_migration

# Run non-destructive migration on startup
try:
    print("Checking database schema...")
    run_purge_migration()
except Exception as e:
    print(f"Warning: Startup migration failed: {e}")

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.getenv('FLASK_PORT', '5000'))
    app.run(debug=debug_mode, port=port)
