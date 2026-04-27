with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_count = content.count('@admin_required()')
content = content.replace('@admin_required()', '@jwt_required()\n@admin_required')
new_count = content.count('@admin_required()')

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Replaced {old_count} occurrences of @admin_required() -> @jwt_required() + @admin_required')
print(f'Remaining @admin_required() calls: {new_count}')
