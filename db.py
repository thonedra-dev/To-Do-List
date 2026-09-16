"""
Shared DB connection + upload config.
Previously duplicated (with slightly different values!) in backend.py and user.py.
Centralized here so there's exactly one place to fix credentials, port, charset, etc.
"""
import mysql.connector

DB_CONFIG = dict(
    host="localhost",
    user="root",
    password="your_password",   # TODO: move to an environment variable before shipping
    database="todolist",
    port=4306,
    charset="utf8mb4",
)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def get_db_connection():
    conn = mysql.connector.connect(**DB_CONFIG)
    conn.set_charset_collation('utf8mb4', 'utf8mb4_unicode_ci')
    return conn


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def create_notification(cursor, user_id, notif_type, title, message=None, related_id=None):
    """The ONE place in the codebase that inserts into `notifications`."""
    cursor.execute("""
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (%s, %s, %s, %s, %s)
    """, (user_id, notif_type, title, message, related_id))
    return cursor.lastrowid