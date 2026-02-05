from flask import Blueprint, request, session, redirect, render_template, jsonify, url_for
import mysql.connector
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

user_bp = Blueprint('user', __name__)  # Create a Flask Blueprint for authentication

# --- CONFIGURATION ---
# ⚠️ REPLACE THIS WITH YOUR REAL APP PASSWORD
SENDER_EMAIL = "thonedra.dev@gmail.com"
SENDER_PASSWORD = "wxeg zgna kvhd ugfc" 

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="your_password",  # Assuming empty password for XAMPP default
        database="todolist",
        port=4306
    )

# --- STANDARD ROUTES ---

@user_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        position = request.form.get('position')
        age = request.form.get('age')
        gender = request.form.get('gender')
        password = request.form.get('password')

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check if username exists
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return "Username already taken!", 400

        # Insert into users table
        cursor.execute("INSERT INTO users (username, position, age, gender, password) VALUES (%s, %s, %s, %s, %s)",
                       (username, position, age, gender, password))
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
    
    if not username or not email:
        return "Error: Missing data", 400

    connection = get_db_connection()
    cursor = connection.cursor()

    # Check if username exists
    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    if cursor.fetchone():
        cursor.close()
        connection.close()
        return "Username already taken! Please go back and choose another.", 400

    # Insert Google User (Password, Age, Gender, Position will be NULL)
    # Note: We are not storing the email in the DB based on your schema image 
    # (unless you added an email column recently). 
    # If you DON'T have an email column, we just store the username.
    # If you DO have an email column, uncomment the email part below.
    
    try:
        # ASSUMPTION: You have an 'email' column. If not, remove "email" from query.
        # Based on your image, you only showed: id, username, position, age, gender, password.
        # I will insert just what your table has.
        
        cursor.execute("INSERT INTO users (username, email, position, age, gender, password) VALUES (%s, %s, NULL, NULL, NULL, NULL)",
                       (username,email))
        
        connection.commit()
        user_id = cursor.lastrowid # Get the new ID
        
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