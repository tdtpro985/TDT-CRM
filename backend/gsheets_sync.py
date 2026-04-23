import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from database.database import get_db_connection, close_connection
from datetime import datetime
import uuid

# Configuration
CREDENTIALS_FILE = 'credentials.json'
SPREADSHEET_ID = '1Q0PXxC_jY13bEz-RXo8go-g7_9RRqb9Acy5hRXeawAQ'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_sheets_service():
    if not os.path.exists(CREDENTIALS_FILE):
        raise FileNotFoundError(f"{CREDENTIALS_FILE} not found in backend directory.")
    
    creds = service_account.Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
    return build('sheets', 'v4', credentials=creds)

def sync_from_sheets():
    """
    Pulls data from all tabs in the Google Sheet and updates the local MySQL database.
    """
    service = get_sheets_service()
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
                customer_name = row[0] if len(row) > 0 else ''
                contact_num = row[1] if len(row) > 1 else ''
                address = row[2] if len(row) > 2 else ''
                region = row[3] if len(row) > 3 else ''
                sr = row[4] if len(row) > 4 else ''
                branch = row[5] if len(row) > 5 else title.split('-')[-1].strip()  # Fallback to sheet name if branch col is empty
                
                if not customer_name: continue
                
                # Check if lead already exists (by name and contact to be safe)
                cursor.execute(
                    "SELECT id FROM leads WHERE customer_name = %s AND contact_num = %s",
                    (customer_name, contact_num)
                )
                if cursor.fetchone():
                    continue  # Lead already exists
                
                # Insert new lead
                lead_id = str(uuid.uuid4())
                created_at = datetime.now()
                
                cursor.execute(
                    """INSERT INTO leads (id, customer_name, contact_num, address, region, sr, branch, status, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (lead_id, customer_name, contact_num, address, region, sr, branch, 'New', created_at)
                )
                total_synced += 1
        
        conn.commit()
        return {"success": True, "synced_count": total_synced}
        
    finally:
        close_connection(conn)

def sync_to_sheets(lead_data):
    """
    Appends a new lead to the appropriate branch tab in Google Sheets.
    """
    service = get_sheets_service()
    
    # Identify which tab to use based on branch
    target_branch = lead_data.get('branch', 'General')
    
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
        lead_data.get('sr', ''),
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
