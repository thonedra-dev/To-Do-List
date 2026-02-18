from flask import Blueprint, request, session, redirect, render_template, jsonify, url_for
import mysql.connector
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from werkzeug.utils import secure_filename
import requests
import os

user_bp = Blueprint('user', __name__)  # Create a Flask Blueprint for authentication

# --- CONFIGURATION ---
# ⚠️ REPLACE THIS WITH YOUR REAL APP PASSWORD
SENDER_EMAIL = "thonedra.dev@gmail.com"
SENDER_PASSWORD = "wxeg zgna kvhd ugfc" 
UPLOAD_FOLDER = 'static/uploads/profile_pics'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="your_password",  # Assuming empty password for XAMPP default
        database="todolist",
        port=4306
    )

# --- STANDARD ROUTES ---

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@user_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        profile_pic = request.files.get('profile_pic')
        
        # Handle profile picture upload
        profile_pic_path = None
        if profile_pic and profile_pic.filename != '' and allowed_file(profile_pic.filename):
            # Create upload folder if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            # Secure the filename and make it unique
            filename = secure_filename(profile_pic.filename)
            # Add username prefix to avoid conflicts
            unique_filename = f"{username}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            
            # Save the file
            profile_pic.save(filepath)
            # Store relative path for database
            profile_pic_path = f"uploads/profile_pics/{unique_filename}"

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check if username exists
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return "Username already taken!", 400

        # Insert into users table with profile_pic
        cursor.execute(
            "INSERT INTO users (username, password, profile_pic) VALUES (%s, %s, %s)",
            (username, password, profile_pic_path)
        )
        connection.commit()

        cursor.close()
        connection.close()

        return redirect('/login') 

    return render_template("login_register.html")

@user_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT id, password FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()

        cursor.close()
        connection.close()

        if user and user[1] == password:
            session['user_id'] = user[0]
            return redirect('/')
        else:
            return "Invalid username or password!", 400

    return render_template("login_register.html")

@user_bp.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect('/login')


# --- GOOGLE AUTH & OTP ROUTES (NEW!) ---

@user_bp.route('/send_verification_otp', methods=['POST'])
def send_verification_otp():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'})

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("DELETE FROM otp_verifications WHERE verified = 1 OR created_at < NOW() - INTERVAL 1 HOUR")
    connection.commit()

    try:
        # Save to database (verified=0 by default)
        sql = "INSERT INTO otp_verifications (email_address, otp_code) VALUES (%s, %s)"
        cursor.execute(sql, (email, otp_code))
        connection.commit()

        # Send the Email
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


# 2. Verify the OTP
@user_bp.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    user_otp = data.get('otp')

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        # Look for the LATEST unverified OTP for this specific email
        # We order by otp_id DESC to get the most recent one sent
        sql = """
            SELECT otp_id FROM otp_verifications 
            WHERE email_address = %s AND otp_code = %s AND verified = 0 
            ORDER BY otp_id DESC LIMIT 1
        """
        cursor.execute(sql, (email, user_otp))
        result = cursor.fetchone()

        if result:
            otp_id = result[0]
            # Success! Mark it as verified so it can't be reused
            cursor.execute("UPDATE otp_verifications SET verified = 1 WHERE otp_id = %s", (otp_id,))
            connection.commit()
            return jsonify({'success': True})
        else:
            # Code was wrong or already used
            return jsonify({'success': False, 'message': 'Invalid or expired code'})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        cursor.close()
        connection.close()


# 3. Finalize Google Registration
@user_bp.route('/google_register', methods=['POST'])
def google_register():
    # This comes from the "Finalize Account" form
    username = request.form.get('google_username')
    email = request.form.get('google_email')
    google_profile_pic_url = request.form.get('google_profile_pic')
    
    if not username or not email:
        return "Error: Missing data", 400

    profile_pic_path = None
    
    # Download and save Google profile picture if available
    if google_profile_pic_url and google_profile_pic_url != '':
        try:
            # Create upload folder if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            # Download the image from Google
            response = requests.get(google_profile_pic_url, timeout=10)
            if response.status_code == 200:
                # Generate filename
                filename = f"{username}_google_profile.jpg"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                
                # Save the image
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                # Store relative path for database
                profile_pic_path = f"uploads/profile_pics/{filename}"
        except Exception as e:
            print(f"Error downloading Google profile picture: {e}")
            # Continue without profile picture if download fails

    connection = get_db_connection()
    cursor = connection.cursor()

    # Check if username exists
    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    if cursor.fetchone():
        cursor.close()
        connection.close()
        return "Username already taken! Please go back and choose another.", 400

    try:
        # Insert Google User with email and profile_pic
        # Password, Age, Gender, Position will be NULL
        cursor.execute(
            "INSERT INTO users (username, email, password, profile_pic) VALUES (%s, %s, NULL, %s)",
            (username, email, profile_pic_path)
        )
        
        connection.commit()
        user_id = cursor.lastrowid  # Get the new ID
        
        # Log them in automatically
        session['user_id'] = user_id
        
    except Exception as e:
        print(f"Database Error: {e}")
        return f"Database Error: {e}", 500
    finally:
        cursor.close()
        connection.close()

    return redirect('/')

@user_bp.route('/check_google_user', methods=['POST'])
def check_google_user():
    data = request.get_json()
    email = data.get('email')
    
    connection = get_db_connection()
    cursor = connection.cursor()
    
    # Look for the email in the users table
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    
    if user:
        # User exists! Log them in immediately
        session['user_id'] = user[0]
        cursor.close()
        connection.close()
        return jsonify({'exists': True})
    
    # User doesn't exist
    cursor.close()
    connection.close()
    return jsonify({'exists': False})

# --- Add this helper function somewhere in user.py (e.g., before update_profile) ---
# --- Place this helper function above the update_profile route ---
def send_security_alert(to_email, username):
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "Security Alert: Email Address Changed"
        body = f"Hello {username},\n\nYour account email address was just changed. If this was you, you can ignore this message.\n\nIf you did not authorize this change, please contact support immediately."
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"Failed to send security alert: {e}")

@user_bp.route('/profile')
def user_profile():
    if 'user_id' not in session:
        return redirect(url_for('user.login'))

    user_id = session['user_id']
    connection = get_db_connection()
    # Using dictionary=True allows us to access columns by name (e.g., user['username'])
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return redirect(url_for('user.login'))

        return render_template('user_profile.html', user=user)
    finally:
        cursor.close()
        connection.close()

# ==============================================================================
# NEW ROUTE: Send OTP to OLD EMAIL for verification before changing email
# ==============================================================================
@user_bp.route('/verify_old_email_google', methods=['POST'])
def verify_old_email_google():
    """
    Verify that the user owns the old email by checking if they can 
    sign in with Google using that email address.
    """
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
        # Get the user's current email
        cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user or not user['email']:
            return jsonify({'success': False, 'message': 'No email found'})
        
        current_email = user['email']
        
        # Verify that the Google email matches the current email
        if google_email.lower() != current_email.lower():
            return jsonify({'success': False, 'message': 'Email does not match your current email'})
        
        # Success! They verified via Google
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Error verifying old email with Google: {e}")
        return jsonify({'success': False, 'message': str(e)})
    finally:
        cursor.close()
        connection.close()


# ==============================================================================
# UPDATED ROUTE: Modified update_profile with two-step email verification
# ==============================================================================
@user_bp.route('/homepage_save_email', methods=['POST'])
def homepage_save_email():
    """
    Called after OTP is verified on the homepage.
    Saves the verified email address to the logged-in user's record.
    """
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
        # Make sure this email is not already used by another account
        cursor.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, user_id))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'This email is already linked to another account.'})

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
    
    # Get text data from the form
    new_username = request.form.get('username')
    new_email = request.form.get('email')
    new_gender = request.form.get('gender')
    new_position = request.form.get('position')
    
    # Get verification status from Google Sign-In (for OLD email)
    old_email_verified = request.form.get('old_email_verified') == 'true'
    
    # Get OTP code for NEW email
    new_email_otp = request.form.get('new_email_otp')
    
    # Get the file data for profile picture
    file = request.files.get('profile_pic')
    
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    
    try:
        # 1. Fetch CURRENT user data to compare changes
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        current_user = cursor.fetchone()
        
        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        current_email = current_user['email']
        
        # 2. SECURITY LOGIC: If the email address is being changed
        if new_email != current_email and new_email:
            # Step 1: Check if old email was verified via Google Sign-In
            if current_email and not old_email_verified:
                return jsonify({'success': False, 'message': 'Old email verification required'}), 400
            
            # Step 2: Verify NEW email OTP code
            if not new_email_otp:
                return jsonify({'success': False, 'message': 'New email verification required'}), 400
            
            # Verify the NEW email OTP using your existing logic
            cursor.execute("""
                SELECT otp_id FROM otp_verifications 
                WHERE email_address = %s AND otp_code = %s AND verified = 0 
                ORDER BY otp_id DESC LIMIT 1
            """, (new_email, new_email_otp))
            
            new_otp_result = cursor.fetchone()
            
            if not new_otp_result:
                return jsonify({'success': False, 'message': 'Invalid verification code for new email'}), 400
            
            # Mark the NEW email OTP as used
            cursor.execute("UPDATE otp_verifications SET verified = 1 WHERE otp_id = %s", (new_otp_result['otp_id'],))
            
            # 3. Send security alert to OLD email if it exists
            if current_email:
                send_security_alert(current_email, current_user['username'])

        # 4. Update the basic user info
        query = """
            UPDATE users 
            SET username = %s, email = %s, gender = %s, position = %s 
            WHERE id = %s
        """
        cursor.execute(query, (new_username, new_email, new_gender, new_position, user_id))
        
        # 5. Handle Profile Picture Upload
        image_url = None
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{user_id}_{int(random.random()*1000)}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            
            if not os.path.exists(UPLOAD_FOLDER):
                os.makedirs(UPLOAD_FOLDER)
                
            file.save(filepath)
            db_path = f"uploads/profile_pics/{unique_filename}"
            
            # Update the profile_pic path in the database
            cursor.execute("UPDATE users SET profile_pic = %s WHERE id = %s", (db_path, user_id))
            image_url = url_for('static', filename=db_path)

        connection.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Profile Updated Successfully!',
            'new_image_url': image_url 
        })

    except Exception as e:
        print(f"Update Error: {e}")
        return jsonify({'success': False, 'message': f'Database Error: {str(e)}'}), 500
    finally:
        cursor.close()
        connection.close()