from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'tdt_crm')
        )
        return conn
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def fetch_with_camel_case(cursor):
    rows = cursor.fetchall()
    # Map snake_case to camelCase for frontend
    mappings = {
        'due_date': 'dueDate',
        'close_date': 'closeDate',
        'last_touch': 'lastTouch',
        'company_id': 'companyId',
        'contact_id': 'contactId',
        'deal_id': 'dealId',
        'company_name': 'companyName',
        'contact_name': 'contactName'
    }
    
    result = []
    for row in rows:
        new_row = {}
        for k, v in row.items():
            new_key = mappings.get(k, k)
            new_row[new_key] = v
        result.append(new_row)
    return result

# Companies endpoints
@app.route('/api/companies', methods=['GET'])
def get_companies():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM companies")
    data = fetch_with_camel_case(cursor)
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/companies', methods=['POST'])
def create_company():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO companies (id, name, industry, website, owner, last_touch)
        VALUES (%s, %s, %s, %s, %s, %s)
    ''', (data.get('id'), data.get('name'), data.get('industry'), data.get('website'), 
          data.get('owner'), data.get('lastTouch', '')))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "id": data.get('id')}), 201

# Deals endpoints
@app.route('/api/deals', methods=['GET'])
def get_deals():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Join with company and contact to get names for display convenience
    cursor.execute('''
        SELECT d.*, c.name as company_name, cont.name as contact_name 
        FROM deals d
        LEFT JOIN companies c ON d.company_id = c.id
        LEFT JOIN contacts cont ON d.contact_id = cont.id
    ''')
    data = fetch_with_camel_case(cursor)
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/deals', methods=['POST'])
def create_deal():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO deals (id, name, company_id, contact_id, owner, stage, value, close_date, priority, source, last_touch)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ''', (data.get('id'), data.get('name'), data.get('companyId'), data.get('contactId'), data.get('owner'), 
          data.get('stage'), data.get('value'), data.get('closeDate'), data.get('priority'), 
          data.get('source', ''), data.get('lastTouch', '')))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "id": data.get('id')}), 201

@app.route('/api/deals/<deal_id>', methods=['PUT'])
def update_deal(deal_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE deals 
        SET name=%s, company_id=%s, contact_id=%s, owner=%s, stage=%s, value=%s, close_date=%s, priority=%s, source=%s, last_touch=%s
        WHERE id=%s
    ''', (data.get('name'), data.get('companyId'), data.get('contactId'), data.get('owner'), data.get('stage'), data.get('value'),
          data.get('closeDate'), data.get('priority'), data.get('source', ''),
          data.get('lastTouch', ''), deal_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "id": deal_id})

# Contacts endpoints
@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT c.*, comp.name as company_name 
        FROM contacts c
        LEFT JOIN companies comp ON c.company_id = comp.id
    ''')
    data = fetch_with_camel_case(cursor)
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/contacts', methods=['POST'])
def create_contact():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO contacts (id, name, company_id, role, owner, email, phone, status, last_touch)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    ''', (data.get('id'), data.get('name'), data.get('companyId'), data.get('role'), data.get('owner'),
          data.get('email'), data.get('phone'), data.get('status'), data.get('lastTouch', '')))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "id": data.get('id')}), 201

# Activities endpoints
@app.route('/api/activities', methods=['GET'])
def get_activities():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT a.*, d.name as deal_name 
        FROM activities a
        LEFT JOIN deals d ON a.deal_id = d.id
    ''')
    data = fetch_with_camel_case(cursor)
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/activities', methods=['POST'])
def create_activity():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO activities (id, type, subject, owner, due_date, status, deal_id, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ''', (data.get('id'), data.get('type'), data.get('subject'), data.get('owner'), data.get('dueDate'),
          data.get('status'), data.get('dealId'), data.get('notes')))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "id": data.get('id')}), 201

@app.route('/api/dashboard/kpis', methods=['GET'])
def dashboard_kpis():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    
    # 1. New Leads
    cursor.execute("SELECT COUNT(*) as count FROM contacts WHERE status = 'Lead'")
    new_leads = cursor.fetchone()['count']
    
    # 2. Active Deals
    cursor.execute("SELECT COUNT(*) as count FROM deals WHERE stage != 'Closed Won' AND stage != 'Closed Lost'")
    active_deals = cursor.fetchone()['count']
    
    # 3. Deals per Stage
    cursor.execute("SELECT stage, COUNT(*) as count, SUM(value) as total_value FROM deals GROUP BY stage")
    deals_per_stage = cursor.fetchall()
    
    # 4. Conversion Rate
    cursor.execute("SELECT COUNT(*) as count FROM deals")
    total_deals = cursor.fetchone()['count']
    cursor.execute("SELECT COUNT(*) as count FROM deals WHERE stage = 'Closed Won'")
    closed_won_deals = cursor.fetchone()['count']
    conversion_rate = (closed_won_deals / total_deals * 100) if total_deals > 0 else 0
    
    # 5. Pipeline Value
    cursor.execute("SELECT SUM(value) as sum_value FROM deals WHERE stage != 'Closed Won' AND stage != 'Closed Lost'")
    row = cursor.fetchone()
    pipeline_value = row['sum_value'] if row['sum_value'] else 0
    
    cursor.close()
    conn.close()
    
    return jsonify({
        "newLeads": new_leads,
        "activeDeals": active_deals,
        "dealsPerStage": deals_per_stage,
        "conversionRate": round(conversion_rate, 2),
        "pipelineValue": float(pipeline_value) if pipeline_value else 0.0
    })

@app.route('/api/team', methods=['GET'])
def get_team():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/reports', methods=['GET'])
def get_reports():
    return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, port=5000)
