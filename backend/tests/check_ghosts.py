import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

SPREADSHEET_ID = os.getenv('SPREADSHEET_ID', '1Q0PXxC_jY13bEz-RXo8go-g7_9RRqb9Acy5hRXeawAQ')
CREDENTIALS_FILE = os.getenv('GOOGLE_CREDENTIALS_JSON_PATH', 'credentials.json')

def check_ghosts():
    if not os.path.exists(CREDENTIALS_FILE):
        print('Credentials not found')
        return
    
    try:
        creds = service_account.Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
        service = build('sheets', 'v4', credentials=creds)
        
        sheet_metadata = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
        sheets = sheet_metadata.get('sheets', [])
        
        ghost_found = False
        for sheet in sheets:
            title = sheet.get('properties', {}).get('title')
            range_name = f"'{title}'!A:F"
            result = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, range=range_name).execute()
            rows = result.get('values', [])
            for row in rows:
                if len(row) > 4 and 'manila.tdtpowersteel' in str(row[4]).lower():
                    print(f"GHOST FOUND in sheet {title}: {row}")
                    ghost_found = True
        
        if not ghost_found:
            print('No manila.tdtpowersteel records found in Google Sheets.')
    except Exception as e:
        print(f"Error checking sheets: {e}")

if __name__ == '__main__':
    check_ghosts()
