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