from flask import Blueprint, request, session, redirect, render_template
import mysql.connector

user_bp = Blueprint('user', __name__)  # Create a Flask Blueprint for authentication

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="your_password",
        database="todolist",
        port=4306
    )

# Route: Register User
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

        return redirect('/login')  # Redirect to login after registration

    # ✅ CHANGE: Now renders login_register.html instead of register.html
    return render_template("login_register.html")

# Route: Login User
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

        if user and user[1] == password:  # Password check (plaintext, not secure)
            session['user_id'] = user[0]  # Store user ID in session
            return redirect('/')
        else:
            return "Invalid username or password!", 400

    # ✅ CHANGE: Now renders login_register.html instead of login.html
    return render_template("login_register.html")

# Route: Logout User
@user_bp.route('/logout')
def logout():
    session.pop('user_id', None)  # Remove user from session
    return redirect('/login')