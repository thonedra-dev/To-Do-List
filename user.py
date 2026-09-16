from flask import Blueprint, request, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import os
import json

from db import get_db_connection, allowed_file, ALLOWED_EXTENSIONS

user_bp = Blueprint('user', __name__, url_prefix='/api')

import string

def generate_unique_connection_code(cursor):
    """Generate a unique AB12345-style code (2 capitals + 5 digits)."""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase, k=2)) + \
               ''.join(random.choices(string.digits, k=5))
        cursor.execute("SELECT id FROM users WHERE connection_code = %s", (code,))
        if not cursor.fetchone():
            return code

# --- CONFIGURATION ---
with open("client_secret.json", "r") as f:
    config = json.load(f)

SENDER_EMAIL = config["app"]["sender_email"]
SENDER_PASSWORD = config["app"]["sender_password"]
UPLOAD_FOLDER = config["app"]["upload_folder"]

# ══════════════════════════════════════════════════════════════════════════
# POST /register
# Was: form POST -> redirect. Now: JSON in (multipart, since a file can ride
# along), JSON out. React sends FormData, same as the old <form> did.
# ══════════════════════════════════════════════════════════════════════════
@user_bp.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    password = request.form.get('password')
    profile_pic = request.files.get('profile_pic')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required'}), 400

    profile_pic_path = None
    if profile_pic and profile_pic.filename != '' and allowed_file(profile_pic.filename):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = secure_filename(profile_pic.filename)
        unique_filename = f"{username}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        profile_pic.save(filepath)
        profile_pic_path = f"uploads/profile_pics/{unique_filename}"

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Username already taken!'}), 409

        hashed_password = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO users (username, password, profile_pic) VALUES (%s, %s, %s)",
            (username, hashed_password, profile_pic_path)
        )
        connection.commit()
        user_id = cursor.lastrowid

        # Log them in immediately, same as before
        session['user_id'] = user_id

        return jsonify({'success': True, 'user_id': user_id, 'username': username})
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        connection.close()
    


# ══════════════════════════════════════════════════════════════════════════
# POST /login
# Was: form POST -> redirect or raw HTML error string. Now: JSON both ways.
# ══════════════════════════════════════════════════════════════════════════
@user_bp.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    print(f"DEBUG login: username={username!r} password={password!r} form={dict(request.form)}")  # ADD THIS

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required'}), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id, password FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        print(f"DEBUG login: user_row={user!r}")  # ADD THIS

        if not user:
            return jsonify({'success': False, 'message': 'Invalid username or password'}), 401

        stored_hash = user[1]
        password_ok = False
        if stored_hash:
            try:
                password_ok = check_password_hash(stored_hash, password)
            except Exception as e:
                print(f"DEBUG login: check_password_hash raised: {e!r}")  # ADD THIS
                password_ok = False

        print(f"DEBUG login: password_ok={password_ok}")  # ADD THIS

        if not password_ok:
            return jsonify({'success': False, 'message': 'Invalid username or password'}), 401

        session['user_id'] = user[0]
        return jsonify({'success': True, 'user_id': user[0]})
    finally:
        cursor.close()
        connection.close()

# ══════════════════════════════════════════════════════════════════════════
# POST /logout  (was GET -> redirect; POST is more correct for a mutation,
# and matches how React will call it: fetch('/logout', {method:'POST'}))
# ══════════════════════════════════════════════════════════════════════════
@user_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True})


# ══════════════════════════════════════════════════════════════════════════
# GET /me — NEW route. The SPA needs a way to check "am I logged in?" on
# page load (React has no session access of its own). Nothing in the old
# code covered this because Jinja could just check session server-side
# before rendering. This is the equivalent for a client that starts blank.
# ══════════════════════════════════════════════════════════════════════════
@user_bp.route('/me')
def me():
    if 'user_id' not in session:
        return jsonify({'success': False, 'authenticated': False}), 401

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, username, email, position, age, gender, profile_pic, connection_code FROM users WHERE id = %s",
            (session['user_id'],)
        )
        user = cursor.fetchone()
        if not user:
            session.pop('user_id', None)
            return jsonify({'success': False, 'authenticated': False}), 401
        return jsonify({'success': True, 'authenticated': True, 'user': user})
    finally:
        cursor.close()
        connection.close()


# --- GOOGLE AUTH & OTP ROUTES (already JSON in the original — kept as-is,
#     with imports/config pointed at the shared db module) ---

@user_bp.route('/send_verification_otp', methods=['POST'])
def send_verification_otp():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'success': False, 'message': 'Email is required'})

    otp_code = str(random.randint(100000, 999999))

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("DELETE FROM otp_verifications WHERE verified = 1 OR created_at < NOW() - INTERVAL 1 HOUR")
    connection.commit()

    try:
        cursor.execute(
            "INSERT INTO otp_verifications (email_address, otp_code) VALUES (%s, %s)",
            (email, otp_code)
        )
        connection.commit()

        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = email
        msg['Subject'] = "Task Manager Verification"
        body = f"Your verification code is: {otp_code}"
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        cursor.close()
        connection.close()


@user_bp.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    user_otp = data.get('otp')

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT otp_id FROM otp_verifications
            WHERE email_address = %s AND otp_code = %s AND verified = 0
            ORDER BY otp_id DESC LIMIT 1
            """,
            (email, user_otp)
        )
        result = cursor.fetchone()

        if result:
            otp_id = result[0]
            cursor.execute("UPDATE otp_verifications SET verified = 1 WHERE otp_id = %s", (otp_id,))
            connection.commit()
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Invalid or expired code'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# POST /google_register
# Was: form POST -> redirect or raw HTML error strings. Now: JSON in/out.
# Note: still multipart-compatible since the original used request.form —
# React will send a normal FormData/urlencoded POST, no file involved here.
# ══════════════════════════════════════════════════════════════════════════
@user_bp.route('/google_register', methods=['POST'])
def google_register():
    username = request.form.get('google_username')
    email = request.form.get('google_email')
    google_profile_pic_url = request.form.get('google_profile_pic')

    if not username or not email:
        return jsonify({'success': False, 'message': 'Missing data'}), 400

    profile_pic_path = None

    if google_profile_pic_url:
        try:
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            response = requests.get(google_profile_pic_url, timeout=10)
            if response.status_code == 200:
                filename = f"{username}_google_profile.jpg"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                profile_pic_path = f"uploads/profile_pics/{filename}"
        except Exception as e:
            print(f"Error downloading Google profile picture: {e}")

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Username already taken! Please choose another.'}), 409

        # Google-registered users have no password — NULL, same as before.
        code = generate_unique_connection_code(cursor)
        cursor.execute(
            "INSERT INTO users (username, email, password, profile_pic, connection_code) VALUES (%s, %s, NULL, %s, %s)",
            (username, email, profile_pic_path, code)
        )
        connection.commit()
        user_id = cursor.lastrowid
        session['user_id'] = user_id

        return jsonify({'success': True, 'user_id': user_id})
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': f'Database Error: {e}'}), 500
    finally:
        cursor.close()
        connection.close()


@user_bp.route('/check_google_user', methods=['POST'])
def check_google_user():
    data = request.get_json()
    email = data.get('email')

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user:
            session['user_id'] = user[0]
            return jsonify({'exists': True})

        return jsonify({'exists': False})
    finally:
        cursor.close()
        connection.close()


def send_security_alert(to_email, username):
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "Security Alert: Email Address Changed"
        body = (
            f"Hello {username},\n\n"
            "Your account email address was just changed. If this was you, you can ignore this message.\n\n"
            "If you did not authorize this change, please contact support immediately."
        )
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"Failed to send security alert: {e}")


# ══════════════════════════════════════════════════════════════════════════
# GET /profile  (was: render_template('user_profile.html', user=user))
# Now: JSON. React's ProfilePage fetches this on mount instead of receiving
# server-rendered {{ user.* }} values.
# ══════════════════════════════════════════════════════════════════════════
@user_bp.route('/profile')
def user_profile():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Drop the password hash before it ever leaves the server
        user.pop('password', None)

        return jsonify({'success': True, 'user': user})
    finally:
        cursor.close()
        connection.close()


@user_bp.route('/verify_old_email_google', methods=['POST'])
def verify_old_email_google():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    data = request.get_json()
    google_email = data.get('email')

    if not google_email:
        return jsonify({'success': False, 'message': 'Email is required'})

    user_id = session['user_id']
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user or not user['email']:
            return jsonify({'success': False, 'message': 'No email found'})

        current_email = user['email']

        if google_email.lower() != current_email.lower():
            return jsonify({'success': False, 'message': 'Email does not match your current email'})

        return jsonify({'success': True})
    except Exception as e:
        print(f"Error verifying old email with Google: {e}")
        return jsonify({'success': False, 'message': str(e)})
    finally:
        cursor.close()
        connection.close()


@user_bp.route('/homepage_save_email', methods=['POST'])
def homepage_save_email():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'success': False, 'message': 'Email is required'})

    user_id = session['user_id']
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, user_id))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'This email is already linked to another account.'})

        cursor.execute("SELECT connection_code FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        needs_code = row and not row[0]

        if needs_code:
            code = generate_unique_connection_code(cursor)
            cursor.execute("UPDATE users SET email = %s, connection_code = %s WHERE id = %s", (email, code, user_id))
        else:
            cursor.execute("UPDATE users SET email = %s WHERE id = %s", (email, user_id))

        connection.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        cursor.close()
        connection.close()


@user_bp.route('/update_profile', methods=['POST'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id = session['user_id']

    new_username = request.form.get('username')
    new_email = request.form.get('email') or None
    new_gender = request.form.get('gender')
    new_position = request.form.get('position')

    old_email_verified = request.form.get('old_email_verified') == 'true'
    new_email_otp = request.form.get('new_email_otp')

    file = request.files.get('profile_pic')

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        current_user = cursor.fetchone()

        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        current_email = current_user['email']

        if new_email != current_email and new_email:
            if current_email and not old_email_verified:
                return jsonify({'success': False, 'message': 'Old email verification required'}), 400

            if not new_email_otp:
                return jsonify({'success': False, 'message': 'New email verification required'}), 400

            cursor.execute("""
                SELECT otp_id FROM otp_verifications
                WHERE email_address = %s AND otp_code = %s AND verified = 0
                ORDER BY otp_id DESC LIMIT 1
            """, (new_email, new_email_otp))

            new_otp_result = cursor.fetchone()

            if not new_otp_result:
                return jsonify({'success': False, 'message': 'Invalid verification code for new email'}), 400

            cursor.execute("UPDATE otp_verifications SET verified = 1 WHERE otp_id = %s", (new_otp_result['otp_id'],))

            if current_email:
                send_security_alert(current_email, current_user['username'])

            if not current_user.get('connection_code'):
                new_code = generate_unique_connection_code(cursor)
                cursor.execute("UPDATE users SET connection_code = %s WHERE id = %s", (new_code, user_id))

        query = """
            UPDATE users
            SET username = %s, email = %s, gender = %s, position = %s
            WHERE id = %s
        """
        cursor.execute(query, (new_username, new_email, new_gender, new_position, user_id))

        # Handle profile picture upload — return a path, not url_for(), since
        # there's no Jinja context to build it in anymore. React prepends the
        # Flask origin itself (see note in backend.py).
        image_path = None
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{user_id}_{int(random.random()*1000)}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)

            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            file.save(filepath)
            db_path = f"uploads/profile_pics/{unique_filename}"

            cursor.execute("UPDATE users SET profile_pic = %s WHERE id = %s", (db_path, user_id))
            image_path = db_path  # e.g. "uploads/profile_pics/3_412_avatar.jpg"

        connection.commit()

        return jsonify({
            'success': True,
            'message': 'Profile Updated Successfully!',
            'new_image_path': image_path
        })
    except Exception as e:
        connection.rollback()
        print(f"Update Error: {e}")
        return jsonify({'success': False, 'message': f'Database Error: {str(e)}'}), 500
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# PROJECT CREATION — ProjectCreator.jsx (new schema: projects + project_members)
# Replaces the old /api/project_setup in backend.py (never actually used).
# ══════════════════════════════════════════════════════════════════════════

def save_project_image(file, project_id):
    """Saves the project cover image, returns db-ready relative path or None."""
    if not file or not file.filename:
        return None
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return None
    folder = os.path.join('static', 'uploads', 'project_images')
    os.makedirs(folder, exist_ok=True)
    filename = secure_filename(file.filename)
    unique_name = f"{project_id}_{filename}"
    file.save(os.path.join(folder, unique_name))
    return f"uploads/project_images/{unique_name}"


@user_bp.route('/search_user_by_code')
def search_user_by_code():
    """Collaborator lookup for ProjectCreator.jsx — connection_code only."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    code = request.args.get('connection_code', '').strip().upper()
    if not code:
        return jsonify({'success': False, 'message': 'connection_code is required'}), 400

    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT id, username, profile_pic FROM users WHERE connection_code = %s",
            (code,)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({'success': False, 'message': 'No user found with that code'}), 404

        if user[0] == session['user_id']:
            return jsonify({'success': False, 'message': "That's your own code"}), 400

        return jsonify({
            'success': True,
            'user': {'id': user[0], 'username': user[1], 'profile_pic': user[2]}
        })
    finally:
        cursor.close()
        connection.close()


@user_bp.route('/create_project', methods=['POST'])
def create_project():
    """
    Creates a project from ProjectCreator.jsx.
    Expects multipart/form-data:
      - project_name (str, required)
      - description (str, optional)
      - project_image (file, optional)
      - collaborator_ids (JSON array of user ids, optional)
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    owner_id = session['user_id']
    project_name = request.form.get('project_name', '').strip()
    description = request.form.get('description', '').strip() or None
    image_file = request.files.get('project_image')

    if not project_name:
        return jsonify({'success': False, 'message': 'project_name is required'}), 400

    collaborator_ids_raw = request.form.get('collaborator_ids', '[]')
    try:
        collaborator_ids = json.loads(collaborator_ids_raw)
        if not isinstance(collaborator_ids, list):
            collaborator_ids = []
    except json.JSONDecodeError:
        collaborator_ids = []

    # Dedup + never allow adding yourself as a "member" row twice
    collaborator_ids = list({int(uid) for uid in collaborator_ids if str(uid).isdigit() and int(uid) != owner_id})

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            "INSERT INTO projects (name, description, owner_id) VALUES (%s, %s, %s)",
            (project_name, description, owner_id)
        )
        connection.commit()
        project_id = cursor.lastrowid

        if image_file and image_file.filename:
            image_path = save_project_image(image_file, project_id)
            if image_path:
                cursor.execute(
                    "UPDATE projects SET project_image = %s WHERE id = %s",
                    (image_path, project_id)
                )
                connection.commit()

        # Owner is always a member too
        member_ids = [owner_id] + collaborator_ids
        for uid in member_ids:
            cursor.execute(
                "INSERT IGNORE INTO project_members (project_id, user_id) VALUES (%s, %s)",
                (project_id, uid)
            )
        connection.commit()

        return jsonify({'success': True, 'project_id': project_id})
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': f'Database Error: {e}'}), 500
    finally:
        cursor.close()
        connection.close()
