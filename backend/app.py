import os
import uuid
import traceback
from functools import wraps
from importlib import import_module
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from datetime import timedelta, date, datetime
import json
from dotenv import load_dotenv

load_dotenv()

from database.database import get_db_connection, close_connection
from database.sync_pipeline import fill_pipeline
from gsheets_sync import sync_from_sheets

def ensure_schema():
    conn = get_db_connection()
    if not conn:
        print("Schema verification failed: could not connect to database.")
        return
    try:
        cursor = conn.cursor()
        # Ensure lost_reason column exists in deals table
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = database() AND TABLE_NAME = 'deals' AND COLUMN_NAME = 'lost_reason'
        """)
        if cursor.fetchone()[0] == 0:
            print("Adding missing 'lost_reason' column to 'deals' table...")
            cursor.execute("ALTER TABLE deals ADD COLUMN lost_reason VARCHAR(255) NULL")
            conn.commit()

        # Ensure probability_manual column exists in deals table
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = database() AND TABLE_NAME = 'deals' AND COLUMN_NAME = 'probability_manual'
        """)
        if cursor.fetchone()[0] == 0:
            print("Adding missing 'probability_manual' column to 'deals' table...")
            cursor.execute("ALTER TABLE deals ADD COLUMN probability_manual BOOLEAN DEFAULT FALSE")
            conn.commit()
    except Exception as e:
        print(f"Error during schema verification: {e}")
    finally:
        close_connection(conn)

ensure_schema()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {
    "origins": os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "allow_headers": ["Content-Type", "Authorization"]
}})

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)  # 8-hour sessions
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB upload limit
jwt = JWTManager(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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
    'Qualified':       20,
    'New Opportunity': 40,
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


REGION_BRANCHES = {
    'Central':     ['Manila', 'Palawan', 'Legazpi', 'Cavite', 'Batangas'],
    'North Luzon': ['Ilocos', 'Isabela'],
    'Vis&Min':     ['Gensan', 'Iloilo', 'Cebu', 'Davao', 'CDO'],
}


ROLE_RANK = {
    'Admin': 100,
    'Head of Sales': 80,
    'Regional Sales Manager': 60,
    'Sales Representative': 40,
}


def can_assign(claims, current_user_id, target_id, target_role):
    """
    Check if current user can assign to target_role (strictly below).
    Self-assignment is always allowed.
    """
    # Self-assignment is always allowed
    if str(target_id) == str(current_user_id):
        return True
    
    user_rank = ROLE_RANK.get(claims.get('role', ''), 0)
    target_rank = ROLE_RANK.get(target_role, 0)
    
    # Admin can assign to anyone
    if claims.get('role') == 'Admin':
        return True
    
    return user_rank > target_rank


def build_scope(claims, requested_branch, col='LOWER(TRIM(l.branch))', requested_region=''):
    """
    Returns (where_parts, restrict_owner, params) for role-based data filtering.
    where_parts: SQL fragment list using `col` for branch matching.
    restrict_owner: True only for Sales Representative — callers add own-alias owner_id filter.
    params: positional values for where_parts.
    """
    role        = claims.get('role', 'Sales Rep')
    user_region = claims.get('region', '')
    user_branch = claims.get('branch', '')

    if role == 'Sales Representative':
        return ([f'{col} = %s'], True, [normalize_branch(user_branch)])

    if role == 'Regional Sales Manager':
        region_branches = REGION_BRANCHES.get(user_region, [])
        allowed = [normalize_branch(b) for b in region_branches]
        req = normalize_branch(requested_branch)
        if req and req in allowed:
            return ([f'{col} = %s'], False, [req])
        if allowed:
            ph = ', '.join(['%s'] * len(allowed))
            return ([f'{col} IN ({ph})'], False, allowed)
        return (['1=0'], False, [])

    if role in ('Head of Sales', 'Admin'):
        if has_branch_filter(requested_branch):
            return ([f'{col} = %s'], False, [normalize_branch(requested_branch)])
        if requested_region and requested_region in REGION_BRANCHES:
            region_branches = [normalize_branch(b) for b in REGION_BRANCHES[requested_region]]
            ph = ', '.join(['%s'] * len(region_branches))
            return ([f'{col} IN ({ph})'], False, region_branches)
        return ([], False, [])

    # Default: branch accounts ('Sales Rep') and any unrecognised role
    if has_branch_filter(requested_branch):
        return ([f'{col} = %s'], False, [normalize_branch(requested_branch)])
    return ([], False, [])


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
        region = request.args.get('region', '')

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
        
        claims = get_jwt()
        user_id = get_jwt_identity()
        scope_parts, restrict_owner, scope_params = build_scope(claims, branch, requested_region=region)
        where_clauses = ["1=1"] + list(scope_parts)
        params = list(scope_params)
        if restrict_owner:
            where_clauses.append("l.owner_id = %s")
            params.append(user_id)

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
                       a.deal_id AS dealId, a.due_date AS dueDate, a.priority, a.status, a.notes,
                       a.created_at AS createdAt, a.stage
                FROM activities a
                LEFT JOIN team t ON a.owner_id = t.id
                WHERE a.deal_id IN ({format_strings})
                ORDER BY a.created_at DESC
            """, tuple(deal_ids))
            activities = rows_to_list(cursor)
            
        # 4. Fetch contacts for this company
        cursor.execute(
            """SELECT id, name, role, email, phone
               FROM contacts
               WHERE company_id = %s
               ORDER BY name""",
            (customer_id,)
        )
        contacts = rows_to_list(cursor)

        # 5. Fetch audit log for these deals and contacts
        audit_logs = []
        if deal_ids or contacts:
            d_format = ','.join(['%s'] * len(deal_ids)) if deal_ids else "''"
            c_format = ','.join(['%s'] * len(contacts)) if contacts else "''"
            
            contact_ids = [c['id'] for c in contacts]
            
            sql = f"""
                SELECT id, entity_type AS entityType, entity_id AS entityId, action, old_value AS oldValue, new_value AS newValue, changed_at AS changedAt
                FROM audit_log
                WHERE (entity_type = 'deal' AND entity_id IN ({d_format}))
                   OR (entity_type = 'contact' AND entity_id IN ({c_format}))
                ORDER BY changed_at DESC
            """
            
            params = tuple(deal_ids + contact_ids)
            cursor.execute(sql, params)
            audit_logs = rows_to_list(cursor)

        return jsonify({
            'customer': customer_data,
            'deals': deals,
            'activities': activities,
            'auditLogs': audit_logs,
            'contacts': contacts,
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
        branch = request.args.get('branch', '')
        claims = get_jwt()
        role = claims.get('role', 'Sales Rep')
        user_region = claims.get('region', '')
        user_branch = claims.get('branch', '')

        if role == 'Sales Representative':
            cursor.execute(
                'SELECT id, name, role, branch, region FROM team WHERE branch = %s AND role = "Sales Representative" ORDER BY name',
                (user_branch,),
            )
        elif role == 'Regional Sales Manager':
            region_branches = REGION_BRANCHES.get(user_region, [])
            req = normalize_branch(branch)
            allowed_normalized = [normalize_branch(b) for b in region_branches]
            # RSM can only assign to SR
            target_role = 'Sales Representative'
            if req and req in allowed_normalized:
                match = next((b for b in region_branches if normalize_branch(b) == req), None)
                cursor.execute(
                    'SELECT id, name, role, branch, region FROM team WHERE branch = %s AND role = %s ORDER BY name',
                    (match, target_role),
                )
            elif region_branches:
                ph = ', '.join(['%s'] * len(region_branches))
                cursor.execute(
                    f'SELECT id, name, role, branch, region FROM team WHERE branch IN ({ph}) AND role = %s ORDER BY name',
                    tuple(region_branches + [target_role]),
                )
            else:
                cursor.execute('SELECT id, name, role, branch, region FROM team WHERE 1=0')
        elif role == 'Head of Sales':
            # HoS can assign to RSM and SR
            target_roles = ('Regional Sales Manager', 'Sales Representative')
            ph_roles = ', '.join(['%s'] * len(target_roles))
            if branch and branch != 'Headquarters':
                cursor.execute(
                    f'SELECT id, name, role, branch, region FROM team WHERE branch = %s AND role IN ({ph_roles}) ORDER BY name',
                    (branch, *target_roles),
                )
            else:
                cursor.execute(f'SELECT id, name, role, branch, region FROM team WHERE role IN ({ph_roles}) ORDER BY name', target_roles)
        else:
            if branch and branch != 'Headquarters':
                cursor.execute(
                    'SELECT id, name, role, branch, region FROM team WHERE branch = %s ORDER BY name',
                    (branch,),
                )
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
        region = request.args.get('region', '')
        claims = get_jwt()
        user_id = get_jwt_identity()
        scope_parts, restrict_owner, scope_params = build_scope(claims, branch, requested_region=region)
        where_parts = list(scope_parts)
        params = list(scope_params)
        if restrict_owner:
            where_parts.append('c.owner_id = %s')
            params.append(user_id)
        where_sql = 'WHERE ' + ' AND '.join(where_parts) if where_parts else ''
        cursor.execute(f'''
            SELECT c.id, c.name, c.industry, c.website, c.city, t.name AS owner, c.owner_id AS ownerId, c.status, c.created_at
            FROM companies c
            LEFT JOIN team t ON c.owner_id = t.id
            LEFT JOIN leads l ON l.id = c.id
            {where_sql}
            ORDER BY c.name
        ''', tuple(params))
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
        region = request.args.get('region', '')
        claims = get_jwt()
        user_id = get_jwt_identity()
        scope_parts, restrict_owner, scope_params = build_scope(claims, branch, requested_region=region)
        where_parts = list(scope_parts)
        params = list(scope_params)
        if restrict_owner:
            where_parts.append('c.owner_id = %s')
            params.append(user_id)
        where_sql = 'WHERE ' + ' AND '.join(where_parts) if where_parts else ''
        cursor.execute(f'''
            SELECT c.id, c.name, c.company_id AS companyId, c.role, t.name AS owner, c.owner_id AS ownerId,
                   c.email, c.phone, c.last_touch AS lastTouch, c.status, c.created_at
            FROM contacts c
            LEFT JOIN team t ON c.owner_id = t.id
            LEFT JOIN leads l ON l.id = c.company_id
            {where_sql}
            ORDER BY c.name
        ''', tuple(params))
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/contacts', methods=['POST'])
@jwt_required()
def create_contact():
    data = request.get_json()
    if not all(k in data for k in ['id', 'name']):
        return jsonify({'error': 'id and name are required'}), 400
    if not data.get('email') and not data.get('phone'):
        return jsonify({'error': 'email or phone is required'}), 400

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
        log_audit(conn, 'contact', data['id'], 'contact_created', None, data['name'])
        conn.commit()
        return jsonify({'message': 'Contact created', 'id': data['id']}), 201
    finally:
        close_connection(conn)


@app.route('/api/contacts/<contact_id>', methods=['PUT'])
@jwt_required()
def update_contact(contact_id):
    data = request.get_json()
    name = data.get('name')
    role = data.get('role')
    email = data.get('email')
    phone = data.get('phone')

    if not name:
        return jsonify({'error': 'name is required'}), 400
    if not email and not phone:
        return jsonify({'error': 'email or phone is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT name, role, email, phone FROM contacts WHERE id = %s", (contact_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Contact not found'}), 404

        old_name, old_role, old_email, old_phone = row

        updates = []
        params = []
        if name != old_name:
            updates.append('name = %s')
            params.append(name)
        if role != old_role:
            updates.append('role = %s')
            params.append(role)
        if email != old_email:
            updates.append('email = %s')
            params.append(email)
        if phone != old_phone:
            updates.append('phone = %s')
            params.append(phone)

        if updates:
            params.append(contact_id)
            cursor.execute(f'UPDATE contacts SET {", ".join(updates)} WHERE id = %s', params)
            log_audit(conn, 'contact', contact_id, 'update',
                      json.dumps({'name': old_name, 'role': old_role, 'email': old_email, 'phone': old_phone}),
                      json.dumps({'name': name, 'role': role, 'email': email, 'phone': phone}))
            conn.commit()

        return jsonify({'message': 'Contact updated', 'id': contact_id})
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
        region = request.args.get('region', '')
        claims = get_jwt()
        user_id = get_jwt_identity()
        scope_parts, restrict_owner, scope_params = build_scope(claims, branch, requested_region=region)
        where_parts = list(scope_parts)
        params = list(scope_params)
        if restrict_owner:
            where_parts.append('l.owner_id = %s')
            params.append(user_id)
        where_sql = 'WHERE ' + ' AND '.join(where_parts) if where_parts else ''
        cursor.execute(f'''
            SELECT l.id, l.customer_name AS customerName, l.contact_num AS contactNum,
                   l.address, l.region, t.name AS sr, l.owner_id AS ownerId, l.branch, l.status, l.created_at AS createdAt
            FROM leads l
            LEFT JOIN team t ON l.owner_id = t.id
            {where_sql}
            ORDER BY l.created_at DESC
        ''', tuple(params))
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
            cursor.execute('SELECT branch, region, role FROM team WHERE id = %s', (owner_id,))
            team_row = cursor.fetchone()
            if not team_row:
                return jsonify({'error': 'Assigned owner not found in team'}), 400
            
            token_claims = get_jwt()
            token_role = token_claims.get('role', '')
            user_id = get_jwt_identity()

            # Role hierarchy check
            if not can_assign(token_claims, user_id, owner_id, team_row[2]):
                return jsonify({'error': f'Cannot assign lead to a user with equal or higher role ({team_row[2]})'}), 403

            if token_role not in ('Admin', 'Head of Sales'):
                if token_role == 'Regional Sales Manager':
                    rsm_region = token_claims.get('region', '')
                    allowed = [normalize_branch(b) for b in REGION_BRANCHES.get(rsm_region, [])]
                    if normalize_branch(branch) not in allowed:
                        return jsonify({'error': f'Branch ({branch}) is outside your region scope'}), 403
                elif normalize_branch(team_row[0]) != normalize_branch(branch):
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
                data.get('createdAt') or date.today(),
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


@app.route('/api/leads/<lead_id>/reassign', methods=['PATCH'])
@jwt_required()
def reassign_lead(lead_id):
    claims = get_jwt()
    role = claims.get('role', '')
    if role not in ('Head of Sales', 'Regional Sales Manager'):
        return jsonify({'error': 'Insufficient permissions to reassign leads'}), 403

    data = request.get_json()
    new_owner_id = data.get('newOwnerId')
    if not new_owner_id:
        return jsonify({'error': 'newOwnerId is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT owner_id, branch FROM leads WHERE id = %s', (lead_id,))
        lead_row = cursor.fetchone()
        if not lead_row:
            return jsonify({'error': 'Lead not found'}), 404
        old_owner_id, lead_branch = lead_row

        cursor.execute('SELECT branch, region, role FROM team WHERE id = %s', (new_owner_id,))
        new_owner_row = cursor.fetchone()
        if not new_owner_row:
            return jsonify({'error': 'New owner not found in team'}), 400
        new_owner_branch, new_owner_region, new_owner_role = new_owner_row

        # Role hierarchy check
        user_id = get_jwt_identity()
        if not can_assign(claims, user_id, new_owner_id, new_owner_role):
            return jsonify({'error': f'Cannot reassign to a user with equal or higher role ({new_owner_role})'}), 403

        # RSM can only reassign within their region
        if role == 'Regional Sales Manager':
            user_region = claims.get('region', '')
            allowed = [normalize_branch(b) for b in REGION_BRANCHES.get(user_region, [])]
            if normalize_branch(new_owner_branch) not in allowed:
                return jsonify({'error': f'New owner branch ({new_owner_branch}) is outside your region'}), 403

        cursor.execute('UPDATE leads SET owner_id = %s WHERE id = %s', (new_owner_id, lead_id))
        cursor.execute('UPDATE companies SET owner_id = %s WHERE id = %s', (new_owner_id, lead_id))
        log_audit(conn, 'lead', lead_id, 'reassign', str(old_owner_id), str(new_owner_id))
        conn.commit()
        return jsonify({'message': 'Lead reassigned successfully'})
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
        region = request.args.get('region', '')
        claims = get_jwt()
        user_id = get_jwt_identity()
        scope_parts, restrict_owner, scope_params = build_scope(claims, branch, requested_region=region)
        where_parts = list(scope_parts) + ['l.branch IS NOT NULL']
        params = list(scope_params)
        if restrict_owner:
            where_parts.append('d.owner_id = %s')
            params.append(user_id)
        where_sql = 'WHERE ' + ' AND '.join(where_parts)
        cursor.execute(f'''
            SELECT d.id, d.name, d.company_id AS companyId, d.contact_id AS contactId,
                   d.lead_id AS leadId, d.stage, d.value, d.close_date AS closeDate,
                   d.probability, t.name AS owner, d.owner_id AS ownerId, d.created_at,
                   d.lost_reason AS lostReason,
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
            {where_sql}
            ORDER BY urgencyScore DESC, d.created_at DESC
        ''', tuple(params))
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/deals', methods=['POST'])
@jwt_required()
def create_deal():
    data = request.get_json()
    if not all(k in data for k in ['id', 'name']):
        return jsonify({'error': 'id and name are required'}), 400

    stage = data.get('stage', 'Qualified')
    probability = STAGE_PROBABILITY.get(stage, 20)

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        owner_id = data.get('ownerId')
        
        # Validation for owner_id branch mismatch
        if owner_id:
            cursor.execute('SELECT branch, role FROM team WHERE id = %s', (owner_id,))
            team_row = cursor.fetchone()
            if not team_row:
                return jsonify({'error': 'Assigned owner not found in team'}), 400
            
            token_claims = get_jwt()
            user_id = get_jwt_identity()

            # Role hierarchy check
            if not can_assign(token_claims, user_id, owner_id, team_row[1]):
                return jsonify({'error': f'Cannot assign deal to a user with equal or higher role ({team_row[1]})'}), 403

            # If leadId is provided, check branch against lead's branch
            lead_id = data.get('leadId')
            if lead_id:
                cursor.execute('SELECT branch FROM leads WHERE id = %s', (lead_id,))
                lead_row = cursor.fetchone()
                if lead_row:
                    if team_row[0] != lead_row[0]:
                        token_claims = get_jwt()
                        token_role = token_claims.get('role', '')
                        if token_role not in ('Admin', 'Head of Sales'):
                            if token_role == 'Regional Sales Manager':
                                rsm_region = token_claims.get('region', '')
                                allowed = [normalize_branch(b) for b in REGION_BRANCHES.get(rsm_region, [])]
                                if normalize_branch(lead_row[0]) not in allowed:
                                    return jsonify({'error': f'Lead branch ({lead_row[0]}) is outside your region scope'}), 403
                            else:
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
        log_audit(conn, 'deal', data['id'], 'deal_created', None, stage)
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
        cursor.execute('SELECT stage, value, close_date, owner_id, lead_id, probability, probability_manual FROM deals WHERE id = %s', (deal_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Deal not found'}), 404

        old_stage, old_value, old_close, old_owner_id, lead_id, old_probability, old_probability_manual = row

        claims = get_jwt()
        user_id = get_jwt_identity()
        if claims.get('role') != 'Admin' and str(old_owner_id) != str(user_id):
            return jsonify({'error': 'Only the assigned SR can update this deal'}), 403
        
        updates = []
        params = []
        
        probability = data.get('probability')
        if probability is not None and probability != old_probability:
            updates.append('probability = %s')
            params.append(probability)
            updates.append('probability_manual = TRUE')
            log_audit(conn, 'deal', deal_id, 'probability_change', str(old_probability), str(probability))
        
        if new_stage:
            if probability is not None:
                # Both probability and stage sent — stage updated, probability already set above
                updates.append('stage = %s')
                params.append(new_stage)
            elif old_probability_manual:
                # SR manually set probability before — preserve it
                updates.append('stage = %s')
                params.append(new_stage)
            else:
                # Auto-assign probability from stage
                new_probability = STAGE_PROBABILITY.get(new_stage, 20)
                updates.append('stage = %s, probability = %s')
                params.extend([new_stage, new_probability])
                updates.append('probability_manual = FALSE')
            log_audit(conn, 'deal', deal_id, 'stage_change', old_stage, new_stage)
        
        if new_value is not None and float(new_value) != float(old_value):
            updates.append('value = %s')
            params.append(new_value)
            log_audit(conn, 'deal', deal_id, 'value_change', str(old_value), str(new_value))
            
        if new_close and str(new_close) != str(old_close):
            updates.append('close_date = %s')
            params.append(new_close)
            log_audit(conn, 'deal', deal_id, 'close_date_change', str(old_close), str(new_close))

        if data.get('ownerId'):
            new_owner_id = data.get('ownerId')
            cursor.execute('SELECT role FROM team WHERE id = %s', (new_owner_id,))
            target_row = cursor.fetchone()
            if target_row and not can_assign(claims, user_id, new_owner_id, target_row[0]):
                return jsonify({'error': f'Cannot assign deal to a user with equal or higher role ({target_row[0]})'}), 403

            updates.append('owner_id = %s')
            params.append(new_owner_id)
            log_audit(conn, 'deal', deal_id, 'owner_id_change', str(old_owner_id), str(new_owner_id))

        lost_reason = data.get('lostReason')
        if new_stage == 'Closed Lost' and lost_reason:
            updates.append('lost_reason = %s')
            params.append(lost_reason)
            log_audit(conn, 'deal', deal_id, 'lost_reason', None, lost_reason)

        if not updates:
            return jsonify({'message': 'No updates provided'}), 400

        params.append(deal_id)
        cursor.execute(f'UPDATE deals SET {", ".join(updates)} WHERE id = %s', params)
        conn.commit()

        # Log activity for edit-detail changes (value, closeDate, probability)
        editor_name = 'Unknown'
        cursor.execute('SELECT name FROM team WHERE id = %s', (user_id,))
        user_row = cursor.fetchone()
        if user_row:
            editor_name = user_row[0]

        today_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        change_desc = []
        if new_value is not None and float(new_value) != float(old_value):
            change_desc.append(f'value to {new_value}')
        if new_close and str(new_close) != str(old_close):
            change_desc.append(f'close date to {new_close}')
        if probability is not None and probability != old_probability:
            change_desc.append(f'probability to {probability}%')

        new_activity = None
        if change_desc:
            activity_id = f'update-{deal_id}-{int(datetime.now().timestamp())}'
            if len(change_desc) == 1:
                subject = f'{editor_name} updated deal {change_desc[0]}'
            else:
                subject = f'{editor_name} updated: {", ".join(change_desc)}'
            cursor.execute(
                """INSERT INTO activities (id, subject, type, deal_id, status, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (activity_id, subject, 'Update', deal_id, 'Completed', today_str),
            )
            conn.commit()
            new_activity = {
                'id': activity_id,
                'subject': subject,
                'title': subject,
                'type': 'Update',
                'dealId': deal_id,
                'status': 'Completed',
                'dueDate': None,
                'priority': 'Medium',
                'companyName': '',
                'contact': '',
                'notes': None,
                'created_at': today_str,
            }

        if new_stage:
            is_closed = new_stage in ('Closed Won', 'Closed Lost')
            if is_closed and lead_id:
                cursor.execute('SELECT branch FROM leads WHERE id = %s', (lead_id,))
                lead_row = cursor.fetchone()
                if lead_row:
                    fill_pipeline(conn, branch=lead_row[0])
                    conn.commit()

        result = {'message': 'Deal updated successfully'}
        if new_activity:
            result['activity'] = new_activity
        return jsonify(result)
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
        region = request.args.get('region', '')
        claims = get_jwt()
        user_id = get_jwt_identity()
        scope_parts, restrict_owner, scope_params = build_scope(claims, branch, requested_region=region)
        where_parts = list(scope_parts)
        params = list(scope_params)
        if restrict_owner:
            where_parts.append('a.owner_id = %s')
            params.append(user_id)
        where_sql = 'WHERE ' + ' AND '.join(where_parts) if where_parts else 'WHERE 1=1'
        cursor.execute(f'''
            SELECT a.id, a.subject, a.type, t.name AS owner, a.owner_id AS ownerId, a.deal_id AS dealId,
                   a.due_date AS dueDate, a.priority, a.status, a.notes, a.created_at, a.stage,
                   a.contact_name, d.name AS dealName,
                   COALESCE(c.name, l.customer_name, '') AS companyName
            FROM activities a
            LEFT JOIN team t ON a.owner_id = t.id
            LEFT JOIN deals d ON d.id = a.deal_id
            LEFT JOIN companies c ON d.company_id = c.id
            LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
            {where_sql}
            ORDER BY
                CASE
                    WHEN a.status IN ('Open', 'Reopened') AND a.due_date < CURDATE() THEN 1
                    WHEN a.status IN ('Open', 'Reopened') AND a.priority = 'High' THEN 2
                    WHEN a.status IN ('Open', 'Reopened') AND a.due_date = CURDATE() THEN 3
                    WHEN a.status IN ('Open', 'Reopened') THEN 4
                    ELSE 5
                END,
                a.due_date ASC
        ''', tuple(params))
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

        # Security: Resolve owner ID by name if provided, instead of trusting raw ID
        # This prevents vulnerability of frontend manipulating database IDs
        final_owner_id = data.get('ownerId')
        owner_name = data.get('owner') # Frontend sends name string here
        
        if owner_name:
            cursor.execute("SELECT id FROM team WHERE name = %s", (owner_name,))
            row = cursor.fetchone()
            if row:
                final_owner_id = row[0]

        cursor.execute(
            """INSERT INTO activities (id, subject, type, owner_id, deal_id, due_date, priority, status, notes, stage, contact_name)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data['id'],
                data['subject'],
                data.get('type', 'Follow-up'),
                final_owner_id,
                data.get('dealId') or None,
                data.get('dueDate') or None,
                data.get('priority', 'Medium'),
                data.get('status', 'Open'),
                data.get('notes'),
                data.get('stage'),
                data.get('contact'),
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

        # Trigger deal lastTouch update by logging a deal audit entry
        cursor.execute('SELECT deal_id, subject FROM activities WHERE id = %s', (activity_id,))
        d_row = cursor.fetchone()
        deal_id = d_row[0] if d_row else None
        task_name = d_row[1] if d_row else 'task'

        if deal_id:
            # We use task_name as the entity_type or pass it in notes if schema allowed, 
            # but since we want it on the frontend, let's include it in old_value or similar?
            # Actually, the cleanest way without schema change is to put it in a specific format in the audit log.
            # However, the frontend currently expects old_value/new_value to be the statuses.
            # Let's change the action name or similar? No, let's just use the task name.
            log_audit(conn, 'deal', deal_id, f'task_status:{task_name}', old_status, new_status)

        conn.commit()
        return jsonify({'message': 'Activity status updated', 'dealId': deal_id})
    finally:
        close_connection(conn)


# ─── Deal Audit Logs ─────────────────────────────────────────────────────────

@app.route('/api/deals/<deal_id>/audit', methods=['GET'])
@jwt_required()
def get_deal_audit_logs(deal_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, entity_type AS entityType, entity_id AS entityId, action,
                   old_value AS oldValue, new_value AS newValue, changed_at AS changedAt
            FROM audit_log
            WHERE entity_type = 'deal' AND entity_id = %s
            ORDER BY changed_at DESC
        """, (deal_id,))
        return jsonify(rows_to_list(cursor))
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
        region = request.args.get('region', '')
        claims = get_jwt()
        user_id = get_jwt_identity()

        # Branch scope for joined-leads queries (l alias) and direct leads queries
        scope_parts, restrict_owner, scope_params = build_scope(claims, branch, requested_region=region)
        direct_parts, _, direct_params = build_scope(claims, branch, col='LOWER(TRIM(branch))', requested_region=region)

        # Build WHERE fragments for joined (deals+leads) and direct (leads) queries
        deal_where = list(scope_parts) + ['l.branch IS NOT NULL']
        deal_params = list(scope_params)
        if restrict_owner:
            deal_where.append('d.owner_id = %s')
            deal_params.append(user_id)
        deal_where_sql = 'WHERE ' + ' AND '.join(deal_where)

        lead_where = ["DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')"] + list(direct_parts)
        lead_params = list(direct_params)
        if restrict_owner:
            lead_where.append('owner_id = %s')
            lead_params.append(user_id)

        cursor.execute(
            "SELECT COUNT(*) FROM leads WHERE " + " AND ".join(lead_where),
            tuple(lead_params),
        )
        new_leads = cursor.fetchone()[0]

        cursor.execute(f'''
            SELECT COUNT(*) FROM deals d
            LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
            {deal_where_sql} AND d.stage NOT IN ('Closed Won', 'Closed Lost')
        ''', tuple(deal_params))
        active_deals = cursor.fetchone()[0]

        cursor.execute(f'''
            SELECT d.stage, COUNT(*) AS count, SUM(d.value) AS value
            FROM deals d
            LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
            {deal_where_sql}
            GROUP BY d.stage
        ''', tuple(deal_params))
        deals_per_stage = rows_to_list(cursor)

        total_leads_where = ['1=1'] + list(direct_parts)
        total_leads_params = list(direct_params)
        if restrict_owner:
            total_leads_where.append('owner_id = %s')
            total_leads_params.append(user_id)

        cursor.execute(
            'SELECT COUNT(*) FROM leads WHERE ' + ' AND '.join(total_leads_where),
            tuple(total_leads_params),
        )
        total_leads = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM leads WHERE status = 'Converted' AND " + ' AND '.join(total_leads_where),
            tuple(total_leads_params),
        )
        converted = cursor.fetchone()[0]
        conversion_rate = round((converted / total_leads * 100), 1) if total_leads else 0

        cursor.execute(f'''
            SELECT COALESCE(SUM(d.value), 0) FROM deals d
            LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
            {deal_where_sql} AND d.stage NOT IN ('Closed Won', 'Closed Lost')
        ''', tuple(deal_params))
        pipeline_value = float(cursor.fetchone()[0])

        return jsonify({
            'newLeads':       new_leads,
            'activeDeals':    active_deals,
            'dealsPerStage':  deals_per_stage,
            'conversionRate': conversion_rate,
            'pipelineValue':  pipeline_value,
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
    branch_filter = request.args.get('branch', '').strip()
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()

        # Users per branch (exclude Headquarters — admin-only, not a sales branch)
        if branch_filter:
            cursor.execute("SELECT branch, COUNT(*) AS count FROM team WHERE branch != 'Headquarters' AND branch = %s GROUP BY branch ORDER BY branch", (branch_filter,))
        else:
            cursor.execute("SELECT branch, COUNT(*) AS count FROM team WHERE branch != 'Headquarters' GROUP BY branch ORDER BY branch")
        users_per_branch = rows_to_list(cursor)

        # Role distribution
        if branch_filter:
            cursor.execute("SELECT role, COUNT(*) AS count FROM team WHERE branch != 'Headquarters' AND branch = %s GROUP BY role ORDER BY role", (branch_filter,))
        else:
            cursor.execute("SELECT role, COUNT(*) AS count FROM team WHERE branch != 'Headquarters' GROUP BY role ORDER BY role")
        role_distribution = rows_to_list(cursor)

        # Leads per branch
        if branch_filter:
            cursor.execute('SELECT branch, COUNT(*) AS total, SUM(status = "Converted") AS converted FROM leads WHERE branch = %s GROUP BY branch ORDER BY branch', (branch_filter,))
        else:
            cursor.execute('SELECT branch, COUNT(*) AS total, SUM(status = "Converted") AS converted FROM leads WHERE 1=1 GROUP BY branch ORDER BY branch')
        leads_per_branch = rows_to_list(cursor)

        # Deals per branch (via robust join, active only)
        if branch_filter:
            cursor.execute('''
                SELECT l.branch,
                       COUNT(d.id)              AS deal_count,
                       COALESCE(SUM(d.value),0) AS pipeline_value
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE d.stage NOT IN ('Closed Won', 'Closed Lost') AND l.branch = %s
                GROUP BY l.branch
                ORDER BY l.branch
            ''', (branch_filter,))
        else:
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

        # Totals
        if branch_filter:
            cursor.execute("SELECT COUNT(*) FROM team WHERE branch != 'Headquarters' AND branch = %s", (branch_filter,))
        else:
            cursor.execute("SELECT COUNT(*) FROM team WHERE branch != 'Headquarters'")
        total_users = cursor.fetchone()[0]

        if branch_filter:
            cursor.execute("SELECT COUNT(*) FROM leads WHERE branch = %s", (branch_filter,))
        else:
            cursor.execute("SELECT COUNT(*) FROM leads WHERE 1=1")
        total_leads = cursor.fetchone()[0]

        if branch_filter:
            cursor.execute('''
                SELECT COUNT(*)
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE d.stage NOT IN ('Closed Won', 'Closed Lost') AND l.branch = %s
            ''', (branch_filter,))
        else:
            cursor.execute('''
                SELECT COUNT(*)
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE d.stage NOT IN ('Closed Won', 'Closed Lost')
            ''')
        active_deals = cursor.fetchone()[0]

        if branch_filter:
            cursor.execute('''
                SELECT COALESCE(SUM(d.value),0)
                FROM deals d
                LEFT JOIN leads l ON (d.lead_id = l.id OR d.company_id = l.id)
                WHERE d.stage NOT IN ('Closed Won', 'Closed Lost') AND l.branch = %s
            ''', (branch_filter,))
        else:
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


# ─── Deal Attachments ─────────────────────────────────────────────────────────

@app.route('/api/deals/<deal_id>/attachments', methods=['POST'])
@jwt_required()
def upload_deal_attachment(deal_id):
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if file.content_type not in ('application/pdf', 'application/octet-stream') and not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are allowed'}), 400

    safe_name = secure_filename(file.filename)
    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}_{safe_name}"
    file.save(os.path.join(UPLOAD_FOLDER, stored_name))

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO deal_attachments (id, deal_id, filename, label) VALUES (%s, %s, %s, %s)',
            (file_id, deal_id, stored_name, safe_name),
        )
        conn.commit()
        return jsonify({'id': file_id, 'filename': stored_name, 'label': safe_name}), 201
    finally:
        close_connection(conn)


@app.route('/api/deals/<deal_id>/attachments', methods=['GET'])
@jwt_required()
def get_deal_attachments(deal_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, filename, label, uploaded_at FROM deal_attachments WHERE deal_id = %s ORDER BY uploaded_at DESC',
            (deal_id,),
        )
        return jsonify(rows_to_list(cursor))
    finally:
        close_connection(conn)


@app.route('/api/uploads/<filename>', methods=['GET'])
@jwt_required()
def serve_attachment(filename):
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)


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
            SELECT c.id, c.name, c.role, c.email, c.phone, dc.role AS deal_role
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



if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.getenv('FLASK_PORT', '5000'))
    app.run(debug=debug_mode, port=port)
