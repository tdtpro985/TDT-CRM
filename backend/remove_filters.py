import os
import re

def remove_filters(file_path):
    print(f"Processing {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We'll use multiple passes to be safe and thorough
    
    # 1. Standard AND clause with l.sr
    content = re.sub(r"\s+AND\s+\(l\.sr\s+IS\s+NULL\s+OR\s+LOWER\(TRIM\(l\.sr\)\)\s+!=\s+'manila\.tdtpowersteel'\)", "", content, flags=re.IGNORECASE)
    
    # 2. Standard AND clause with sr
    content = re.sub(r"\s+AND\s+\(sr\s+IS\s+NULL\s+OR\s+LOWER\(TRIM\(sr\)\)\s+!=\s+'manila\.tdtpowersteel'\)", "", content, flags=re.IGNORECASE)
    
    # 3. WHERE clause (replace with WHERE 1=1 to avoid breaking query structure if it's the only filter)
    content = re.sub(r"WHERE\s+\(l\.sr\s+IS\s+NULL\s+OR\s+LOWER\(TRIM\(l\.sr\)\)\s+!=\s+'manila\.tdtpowersteel'\)", "WHERE 1=1", content, flags=re.IGNORECASE)
    content = re.sub(r"WHERE\s+\(sr\s+IS\s+NULL\s+OR\s+LOWER\(TRIM\(sr\)\)\s+!=\s+'manila\.tdtpowersteel'\)", "WHERE 1=1", content, flags=re.IGNORECASE)
    
    # 4. JS/Python string list style (like where_clauses = [...])
    content = re.sub(r"\"\(l\.sr\s+IS\s+NULL\s+OR\s+LOWER\(TRIM\(l\.sr\)\)\s+!=\s+'manila\.tdtpowersteel'\)\"", "\"1=1\"", content, flags=re.IGNORECASE)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    files = [
        'app.py',
        'database/sync_pipeline.py'
    ]
    for f in files:
        if os.path.exists(f):
            remove_filters(f)
        else:
            print(f"Skipping {f}, not found.")
