"""
One-off script: re-hash any plaintext passwords in the users table.
Run once: python migrate_passwords.py
"""
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db_connection

connection = get_db_connection()
cursor = connection.cursor(dictionary=True)

cursor.execute("SELECT id, password FROM users WHERE password IS NOT NULL")
rows = cursor.fetchall()

updated = 0
for row in rows:
    pw = row['password']

    # Skip rows that are already valid werkzeug hashes
    try:
        check_password_hash(pw, "")  # dummy check just to see if it *parses* as a hash
        is_hashed = pw.startswith(("scrypt:", "pbkdf2:"))
    except Exception:
        is_hashed = False

    if not is_hashed:
        new_hash = generate_password_hash(pw)
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (new_hash, row['id']))
        updated += 1
        print(f"Re-hashed user id={row['id']}")

connection.commit()
cursor.close()
connection.close()

print(f"Done. {updated} row(s) updated.")