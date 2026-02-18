from flask import Flask, render_template, request, redirect, session, jsonify
import mysql.connector
from user import user_bp  # Import user authentication Blueprint
from datetime import datetime

app = Flask(__name__)
app.secret_key = "your_secret_key_here"  # Required for session management
app.register_blueprint(user_bp)  # Register authentication routes

# Function to connect to MySQL
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="your_password",
        database="todolist",
        port=4306  # For XAMPP
    )

# Route: Home Page - Fetch Tasks & Completed Tasks


@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect('/login')

    user_id = session['user_id']
    connection = get_db_connection()
    cursor = connection.cursor()

    # Fetch all columns to check for NULLs
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    prompts = []

    if user:
        username = user[1] #
        email = user[2] #
        profile_pic = user[7] #

        # Short, attractive prompts with emojis
        if email is None:
            prompts.append("Verify Email ⚡")
        
        # Check if age (4), gender (5), or position (3) is missing
        if None in (user[3], user[4], user[5]):
            prompts.append("Setup Profile 🛠️")
        
        missing_fields = []
        if user[3] is None: missing_fields.append('position')
        if user[4] is None: missing_fields.append('age')
        if user[5] is None: missing_fields.append('gender')
        if user[7] is None: missing_fields.append('pic')

    else:
        username = "Unknown"
        profile_pic = None

    cursor.close()
    connection.close()

    return render_template('homepage.html', username=username, profile_pic=profile_pic, prompts=prompts, missing_fields=missing_fields)

@app.route('/task_details')
def task_details():
    if 'user_id' not in session:
        return redirect('/login')

    user_id = session['user_id']
    table_type = request.args.get('table', 'tasks') 

    connection = get_db_connection()
    cursor = connection.cursor()

    # 1. Fetch Username
    cursor.execute("SELECT username FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    username = user[0] if user else "Unknown"

    # 2. Fetch Tasks (Raw data - no Python calculation)
    cursor.execute("SELECT id, task, completed, created_at, due_date FROM tasks WHERE user_id = %s", (user_id,))
    tasks = cursor.fetchall()

    # 3. Fetch Completed Tasks
    cursor.execute("SELECT task, completed_at FROM completed_tasks WHERE fid IN (SELECT id FROM tasks WHERE user_id = %s)", (user_id,))
    completed_tasks = cursor.fetchall()

    # 4. Fetch tasks with unfinished steps
    cursor.execute("""
        SELECT DISTINCT fid 
        FROM steps 
        WHERE status = 0 
        AND fid IN (SELECT id FROM tasks WHERE user_id = %s)
    """, (user_id,))
    tasks_with_unfinished_steps = set(row[0] for row in cursor.fetchall())

    cursor.close()
    connection.close()

    return render_template(
        'task_details.html', 
        username=username,
        tasks=tasks, # Passing raw tuples directly
        completed_tasks=completed_tasks,
        tasks_with_unfinished_steps=tasks_with_unfinished_steps,
        table_type=table_type
    )


@app.route('/add_task', methods=['POST'])
def add_task():
    if 'user_id' not in session:  # Ensure user is logged in
        return redirect('/login')

    task = request.form.get('task')  
    due_date = request.form.get('due_date')  # Get due date (can be empty)
    steps = request.form.getlist('steps[]')  # Get list of steps (if any)
    user_id = session['user_id']  # Get logged-in user's ID

    connection = get_db_connection()
    cursor = connection.cursor()

    # Insert Task
    if due_date:  
        cursor.execute("INSERT INTO tasks (task, completed, user_id, due_date) VALUES (%s, %s, %s, %s)", 
                       (task, 0, user_id, due_date))
    else:  
        cursor.execute("INSERT INTO tasks (task, completed, user_id) VALUES (%s, %s, %s)", 
                       (task, 0, user_id))

    task_id = cursor.lastrowid  # Get the ID of the newly inserted task

    # ✅ Fix: Now Fetch Task Name Again to Store in `steps`
    cursor.execute("SELECT task FROM tasks WHERE id = %s", (task_id,))
    task_name = cursor.fetchone()[0]  

    # Insert Steps (if any)
    for step in steps:
        step_data = step.split("|")  # Extract step description & difficulty
        if len(step_data) == 2:
            step_description, difficulty = step_data
            cursor.execute("INSERT INTO steps (fid, step_description, difficulty, status, task) VALUES (%s, %s, %s, %s, %s)",
                           (task_id, step_description, difficulty, 0, task_name))  # ✅ Fix: Insert Task Name

    connection.commit()
    cursor.close()
    connection.close()

    return redirect('/')


# ✅ Place the new "Mark as Complete" route right here
@app.route('/complete/<int:task_id>', methods=['POST'])
def complete_task(task_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    # Update the task to mark it as completed
    cursor.execute("UPDATE tasks SET completed = 1 WHERE id = %s", (task_id,))
    connection.commit()

    # Move the task to completed_tasks table
    cursor.execute("INSERT INTO completed_tasks (fid, task, completed_at) SELECT id, task, NOW() FROM tasks WHERE id = %s", (task_id,))
    connection.commit()

    cursor.close()
    connection.close()

    # Redirect to feedback page
    return redirect(f'/feedback/{task_id}')


# Route: Step Setup Page
@app.route('/setup_step/<int:fid>')
def setup_step(fid):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT task FROM tasks WHERE id = %s", (fid,))
    task_name = cursor.fetchone()[0]

    cursor.execute("SELECT * FROM steps WHERE fid = %s", (fid,))
    steps = cursor.fetchall()

    cursor.close()
    connection.close()

    return render_template('step_setup.html', fid=fid, task_name=task_name, steps=steps)

# Route: Insert Step
@app.route('/add_step/<int:fid>', methods=['POST'])
def add_step(fid):
    step_description = request.form.get('step_description')
    difficulty = request.form.get('difficulty')

    if step_description and difficulty:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Fetch task name based on fid
        cursor.execute("SELECT task FROM tasks WHERE id = %s", (fid,))
        task_name = cursor.fetchone()[0]  # Extract task name

        # Insert step with task name
        cursor.execute("INSERT INTO steps (fid, step_description, difficulty, status, task) VALUES (%s, %s, %s, %s, %s)",
                       (fid, step_description, difficulty, 0, task_name))
        connection.commit()
        cursor.close()
        connection.close()

    return redirect(f'/setup_step/{fid}')


# Route: Mark a Step as Complete
@app.route('/complete_step/<int:step_id>', methods=['POST'])
def complete_step(step_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    # Update the step status to mark it as completed
    cursor.execute("UPDATE steps SET status = 1 WHERE sid = %s", (step_id,))
    connection.commit()

    cursor.close()
    connection.close()

    # Redirect back to the step setup page
    return redirect(request.referrer)  # Redirects back to step_setup.html


# Route: Feedback Page
@app.route('/feedback/<int:task_id>')
def feedback(task_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    # Fetch task creation time
    cursor.execute("SELECT created_at FROM tasks WHERE id = %s", (task_id,))
    result = cursor.fetchone()
    created_at = result[0] if result else None

    # Fetch task completion time
    cursor.execute("SELECT completed_at FROM completed_tasks WHERE fid = %s", (task_id,))
    result = cursor.fetchone()
    completed_at = result[0] if result else None

    cursor.close()
    connection.close()

    # If timestamps are missing, return error
    if not created_at or not completed_at:
        return "Error: Missing timestamps for this task.", 400

    # ✅ NO NEED TO CONVERT! MySQL already returns datetime objects!
    # Calculate time difference in hours
    time_difference = (completed_at - created_at).total_seconds() / 3600

    # Determine feedback rating
    if time_difference < 2:
        rating = "Excellent"
        icon = "✅"
    elif time_difference < 6:
        rating = "Good"
        icon = "👍"
    elif time_difference < 24:
        rating = "Normal"
        icon = "😐"
    else:
        rating = "Need Work"
        icon = "⚠️"

    return render_template("feedback.html", 
                           rating=rating, 
                           icon=icon, 
                           created_at=created_at, 
                           completed_at=completed_at, 
                           time_difference=round(time_difference, 2))



@app.route('/save_profile_setup', methods=['POST'])
def save_profile_setup():
    """
    Homepage profile-setup popup: saves position, age, gender, and/or profile_pic.
    All fields are optional — only updates non-null values.
    """
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id   = session['user_id']
    position  = request.form.get('position')   or None
    age_raw   = request.form.get('age')        or None
    gender    = request.form.get('gender')     or None
    pic_file  = request.files.get('profile_pic')

    age = None
    if age_raw:
        try:
            age = int(age_raw)
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid age value'}), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        # Build dynamic SET clause — only update what was provided
        updates = []
        params  = []

        if position is not None:
            updates.append("position = %s")
            params.append(position)
        if age is not None:
            updates.append("age = %s")
            params.append(age)
        if gender is not None:
            updates.append("gender = %s")
            params.append(gender)

        # Handle profile picture upload (re-using user.py's UPLOAD_FOLDER convention)
        if pic_file and pic_file.filename:
            allowed = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
            ext = pic_file.filename.rsplit('.', 1)[-1].lower() if '.' in pic_file.filename else ''
            if ext in allowed:
                import os
                from werkzeug.utils import secure_filename
                upload_folder = 'static/uploads/profile_pics'
                os.makedirs(upload_folder, exist_ok=True)
                filename = secure_filename(pic_file.filename)
                unique_name = f"{user_id}_setup_{filename}"
                pic_file.save(os.path.join(upload_folder, unique_name))
                db_path = f"uploads/profile_pics/{unique_name}"
                updates.append("profile_pic = %s")
                params.append(db_path)

        if updates:
            sql = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
            params.append(user_id)
            cursor.execute(sql, tuple(params))
            connection.commit()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    app.run(debug=True, port=5000)