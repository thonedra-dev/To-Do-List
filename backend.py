from flask import Flask, render_template, request, redirect, session
import mysql.connector
from user import user_bp  # Import user authentication Blueprint

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
from datetime import datetime

@app.route('/')
def index():
    if 'user_id' not in session:  # Check if user is logged in
        return redirect('/login')  # Redirect to login if not

    user_id = session['user_id']

    connection = get_db_connection()
    cursor = connection.cursor()

    # Fetch the logged-in user's username
    cursor.execute("SELECT username FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    username = user[0] if user else "Unknown"

    # Fetch tasks assigned to the logged-in user, including due_date
    cursor.execute("SELECT id, task, completed, created_at, due_date FROM tasks WHERE user_id = %s", (user_id,))
    tasks = cursor.fetchall()

    # Fetch completed tasks
    cursor.execute("SELECT task, completed_at FROM completed_tasks WHERE fid IN (SELECT id FROM tasks WHERE user_id = %s)", (user_id,))
    completed_tasks = cursor.fetchall()

    # Fetch tasks with unfinished steps
    cursor.execute("""
        SELECT DISTINCT fid 
        FROM steps 
        WHERE status = 0 
        AND fid IN (SELECT id FROM tasks WHERE user_id = %s)
    """, (user_id,))
    tasks_with_unfinished_steps = set(row[0] for row in cursor.fetchall())

    # ✅ Calculate time remaining for each task
    tasks_with_remaining_time = []
    today = datetime.now().date()

    for task in tasks:
        task_id, task_name, completed, created_at, due_date = task
        if due_date:
            due_date_obj = datetime.strptime(str(due_date), "%Y-%m-%d").date()
            remaining_days = (due_date_obj - today).days
            if remaining_days < 0:
                time_remaining = "Overdue"
            else:
                time_remaining = f"{remaining_days} days left"
        else:
            time_remaining = "No Due Date"

        # ✅ Pass all data correctly
        tasks_with_remaining_time.append((task_id, task_name, completed, created_at, due_date, time_remaining))

    cursor.close()
    connection.close()

    # ✅ Pass everything to `user_setup.html`
    return render_template(
        'user_setup.html', 
        username=username,
        tasks=tasks_with_remaining_time,  # Now includes `time_remaining`
        completed_tasks=completed_tasks,
        tasks_with_unfinished_steps=tasks_with_unfinished_steps
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



if __name__ == "__main__":
    app.run(debug=True, port=5000)
