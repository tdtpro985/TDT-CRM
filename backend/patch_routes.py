import re

with open('app.py', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if line.startswith('@app.route'):
        # Check which route
        if '/api/login' in line or '/api/admin/login' in line:
            pass # already handled
        elif '/api/admin/' in line or '/api/sync/gsheets' in line:
            new_lines.append('@admin_required()\n')
        else:
            new_lines.append('@jwt_required()\n')

with open('app.py', 'w') as f:
    f.writelines(new_lines)

print("Added decorators to app.py")
