import os
import json
import html
from google.oauth2 import service_account
from googleapiclient.discovery import build
from database.database import get_db_connection, close_connection
from datetime import datetime
import uuid

# Configuration
SPREADSHEET_ID = os.getenv('SPREADSHEET_ID', '1Q0PXxC_jY13bEz-RXo8go-g7_9RRqb9Acy5hRXeawAQ')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_CRED_PATH = os.path.join(_SCRIPT_DIR, 'credentials.json')
CREDENTIALS_FILE = os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON_PATH') or _DEFAULT_CRED_PATH


def get_sheets_service():
    # Final resolution of path: if relative, make it relative to script dir
    path = CREDENTIALS_FILE
    if not os.path.isabs(path):
        path = os.path.join(_SCRIPT_DIR, path)

    if not os.path.exists(path):
        return None, f"Google credentials not found at {path}. Check your .env file."
    
    try:
        creds = service_account.Credentials.from_service_account_file(path, scopes=SCOPES)
        return build('sheets', 'v4', credentials=creds), None
    except Exception as e:
        return None, str(e)

def sanitize_input(text):
    if not isinstance(text, str):
        return text
    return html.escape(text.strip())

def sync_from_sheets():
    """
    Pulls data from all tabs in the Google Sheet and updates the local MySQL database.
    """
    service, err = get_sheets_service()
    if err:
        return {"error": err}
    
    sheet_metadata = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    sheets = sheet_metadata.get('sheets', [])
    
    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}
    
    try:
        cursor = conn.cursor()
        total_synced = 0
        
        for sheet in sheets:
            title = sheet.get('properties', {}).get('title')
            # Fetch all rows from this sheet
            result = service.spreadsheets().values().get(
                spreadsheetId=SPREADSHEET_ID,
                range=f"'{title}'!A2:Z"  # Start from row 2 to skip headers
            ).execute()
            
            rows = result.get('values', [])
            if not rows:
                continue
                
            for row in rows:
                if len(row) < 1: continue
                
                # Mapping (based on the common structure observed)
                # 0: Customer Name, 1: Contact Number, 2: Address, 3: Region, 4: SR, 5: Branch
                customer_name = sanitize_input(row[0]) if len(row) > 0 else ''
                contact_num = sanitize_input(row[1]) if len(row) > 1 else ''
                address = sanitize_input(row[2]) if len(row) > 2 else ''
                region = sanitize_input(row[3]) if len(row) > 3 else ''
                sr = sanitize_input(row[4]) if len(row) > 4 else ''
                branch = sanitize_input(row[5]) if len(row) > 5 else sanitize_input(title.split('-')[-1].strip())  # Fallback to sheet name if branch col is empty
                
                if not customer_name: continue
                
                # Find owner_id from team table
                cursor.execute("SELECT id FROM team WHERE name = %s OR username = %s", (sr, sr))
                team_member = cursor.fetchone()
                owner_id = team_member[0] if team_member else None

                # Check if lead already exists (by name and contact to be safe)
                cursor.execute(
                    "SELECT id FROM leads WHERE customer_name = %s AND contact_num = %s",
                    (customer_name, contact_num)
                )
                if cursor.fetchone():
                    continue  # Lead already exists
                
                # 1. Insert new lead
                lead_id = str(uuid.uuid4())
                created_at = datetime.now()
                
                cursor.execute(
                    """INSERT INTO leads (id, customer_name, contact_num, address, region, owner_id, branch, status, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (lead_id, customer_name, contact_num, address, region, owner_id, branch, 'New', created_at)
                )
                
                # 2. Automatically create a Company record
                cursor.execute(
                    """INSERT INTO companies (id, name, city, owner_id, status)
                       VALUES (%s, %s, %s, %s, %s)
                       ON DUPLICATE KEY UPDATE name = VALUES(name), owner_id = VALUES(owner_id)""",
                    (lead_id, customer_name, region, owner_id, 'Active')
                )
                
                # 3. Automatically create a Contact record
                contact_id = str(uuid.uuid4())
                cursor.execute(
                    """INSERT INTO contacts (id, name, company_id, owner_id, phone, status)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (contact_id, customer_name, lead_id, owner_id, contact_num, 'Active')
                )
                
                if total_synced % 100 == 0:
                    conn.commit()
                
                total_synced += 1
            
            conn.commit()
        
        return {"success": True, "synced_count": total_synced}
        
    finally:
        close_connection(conn)

def sync_to_sheets(lead_data):
    """
    Appends a new lead to the appropriate branch tab in Google Sheets.
    """
    service, err = get_sheets_service()
    if err:
        raise Exception(err)
    
    # Identify which tab to use based on branch
    target_branch = lead_data.get('branch', 'General')
    
    # 0. Resolve owner name from ownerId if sr is missing
    sr_name = lead_data.get('sr', '')
    owner_id = lead_data.get('ownerId')
    if not sr_name and owner_id:
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM team WHERE id = %s", (owner_id,))
                row = cursor.fetchone()
                if row:
                    sr_name = row[0]
            finally:
                close_connection(conn)

    # Try to find a sheet name that contains the branch name
    sheet_metadata = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    sheets = sheet_metadata.get('sheets', [])
    
    sheet_title = None
    for s in sheets:
        t = s.get('properties', {}).get('title')
        if target_branch.lower() in t.lower():
            sheet_title = t
            break
    
    if not sheet_title:
        # If no specific branch sheet is found, use the first sheet or a default
        sheet_title = sheets[0].get('properties', {}).get('title') if sheets else "Sheet1"

    # Prepare row data
    # Format: Customer Name, Contact Number, Address, Region, SR, Branch
    values = [[
        lead_data.get('customerName', ''),
        lead_data.get('contactNum', ''),
        lead_data.get('address', ''),
        lead_data.get('region', ''),
        sr_name,
        lead_data.get('branch', '')
    ]]
    
    body = {
        'values': values
    }
    
    result = service.spreadsheets().values().append(
        spreadsheetId=SPREADSHEET_ID,
        range=f"'{sheet_title}'!A1",
        valueInputOption='USER_ENTERED',
        insertDataOption='INSERT_ROWS',
        body=body
    ).execute()
    
    return result

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    # Re-evaluate CREDENTIALS_FILE after loading .env
    CREDENTIALS_FILE = os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON_PATH') or _DEFAULT_CRED_PATH
    print("Starting Google Sheets Sync...")
    result = sync_from_sheets()
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print(f"Success! Synced {result.get('synced_count', 0)} records.")
