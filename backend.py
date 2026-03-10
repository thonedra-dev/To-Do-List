from flask import Flask, render_template, request, redirect, session, jsonify
import mysql.connector
from user import user_bp  # Import user authentication Blueprint
from datetime import datetime
import json   # add at the top of backend.py if not already present
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "your_secret_key_here"  # Required for session management
app.register_blueprint(user_bp)  # Register authentication routes

# Function to connect to MySQL
def get_db_connection():
    conn = mysql.connector.connect(
        host="localhost", user="root",
        password="your_password", database="todolist",
        port=4306, charset='utf8mb4'   # ← add this
    )
    conn.set_charset_collation('utf8mb4', 'utf8mb4_unicode_ci')  # ← add this
    return conn

# Route: Home Page - Fetch Tasks & Completed Tasks
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


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


def save_upload(file, subfolder, prefix):
    """Helper: saves an uploaded file, returns the db-ready relative path or None."""
    if not file or not file.filename:
        return None
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return None
    folder = os.path.join('static', 'uploads', subfolder)
    os.makedirs(folder, exist_ok=True)
    filename    = secure_filename(file.filename)
    unique_name = f"{prefix}_{filename}"
    file.save(os.path.join(folder, unique_name))
    return f"uploads/{subfolder}/{unique_name}"


# ══════════════════════════════════════════════════════════════════════════════
# ROUTE 1 — Search user by email
# GET /search_user_by_email?email=someone@example.com
# Used by the project-setup form so the leader can look up potential members.
# Returns a small JSON card: id, username, email, profile_pic, position.
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/search_user_by_email')
def search_user_by_email():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    email = request.args.get('email', '').strip()
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400

    connection = get_db_connection()
    cursor     = connection.cursor()
    cursor.execute(
        "SELECT id, username, email, profile_pic, position FROM users WHERE email = %s",
        (email,)
    )
    user = cursor.fetchone()
    cursor.close()
    connection.close()

    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    return jsonify({
        'success': True,
        'user': {
            'id':          user[0],
            'username':    user[1],
            'email':       user[2],
            'profile_pic': user[3],
            'position':    user[4]
        }
    })


# ══════════════════════════════════════════════════════════════════════════════
# ROUTE 2 — Create project  (the big one)
# POST /project_setup   multipart/form-data
#
# Form fields expected:
#   project_name        (str)
#   description         (str)
#   project_cover_pic   (file, optional)
#   sections_data       (JSON string — see shape below)
#   section_pic_0 …     (file, optional, one per section index)
#
# sections_data shape:
# [
#   {
#     "section_description": "Design the UI",
#     "assignees": [
#       { "user_id": 3, "duty_description": "Wireframes", "role": "Designer" }
#     ]
#   }
# ]
#
# What this route does (in order):
#   1. Fetch leader info for notification message
#   2. Save cover pic → INSERT projects → get project_id
#   3. For each section:
#        Save section pic → INSERT project_sections → get section_id
#        For each assignee:
#          INSERT section_assignees (acceptance_status = 0)
#          INSERT notifications     (formatted invitation message)
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/project_setup', methods=['POST'])
def project_setup():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    leader_id = session['user_id']

    # ── Collect form fields ──────────────────────────────────────────────────
    project_name = request.form.get('project_name', '').strip() or None
    description  = request.form.get('description',  '').strip() or None
    cover_file   = request.files.get('project_cover_pic')

    sections_raw = request.form.get('sections_data', '').strip()
    if not sections_raw:
        return jsonify({'success': False, 'message': 'sections_data is required'}), 400

    try:
        sections = json.loads(sections_raw)
    except json.JSONDecodeError:
        return jsonify({'success': False, 'message': 'Invalid sections_data JSON'}), 400

    if not isinstance(sections, list) or len(sections) == 0:
        return jsonify({'success': False, 'message': 'At least one section is required'}), 400

    # Every section must have at least one assignee
    for i, sec in enumerate(sections):
        if not sec.get('assignees'):
            return jsonify({
                'success': False,
                'message': f'Section {i + 1} must have at least one assignee.'
            }), 400

    connection = get_db_connection()
    cursor     = connection.cursor()

    try:
        # ── Step 1: Fetch leader info (used in notification messages) ────────
        cursor.execute(
            "SELECT username, email, position FROM users WHERE id = %s",
            (leader_id,)
        )
        leader = cursor.fetchone()
        leader_name     = leader[0] if leader else "Unknown"
        leader_email    = leader[1] if leader else "—"
        leader_position = leader[2] if leader else "—"

        # ── Step 2: Save cover pic & insert project ──────────────────────────
        cover_path = save_upload(cover_file, 'project_covers', f"{leader_id}_cover")

        cursor.execute(
            """
            INSERT INTO projects (leader_id, project_name, description, project_cover_pic, status)
            VALUES (%s, %s, %s, %s, 'Pending')
            """,
            (leader_id, project_name, description, cover_path)
        )
        connection.commit()
        project_id = cursor.lastrowid

        cover_display = (
            f"\n  📸 Cover     : /{cover_path}" if cover_path else ""
        )

        # ── Step 3: Sections loop ────────────────────────────────────────────
        for idx, sec in enumerate(sections):
            section_description = sec.get('section_description', '').strip() or None
            assignees           = sec.get('assignees', [])

            sec_pic_path = save_upload(
                request.files.get(f'section_pic_{idx}'),
                'section_pics',
                f"{project_id}_sec{idx}"
            )

            cursor.execute(
                """
                INSERT INTO project_sections (project_id, section_description, section_picture, status)
                VALUES (%s, %s, %s, 'Pending')
                """,
                (project_id, section_description, sec_pic_path)
            )
            connection.commit()
            section_id = cursor.lastrowid

            # ── Step 4: Assignees + notifications ────────────────────────────
            for member in assignees:
                member_user_id   = member.get('user_id')
                duty_description = member.get('duty_description', '').strip() or None
                role             = member.get('role', '').strip() or None

                if not member_user_id:
                    continue

                # Insert pending assignee row
                cursor.execute(
                    """
                    INSERT INTO section_assignees
                        (section_id, user_id, duty_description, role, acceptance_status)
                    VALUES (%s, %s, %s, %s, 0)
                    """,
                    (section_id, member_user_id, duty_description, role)
                )

                # Build formatted notification message
                notification_message = (
                    f"🚀 Project Invitation\n"
                    f"{'─' * 38}\n"
                    f"  📌 Project   : {project_name or 'Untitled'}\n"
                    f"  📝 About     : {description or 'No description provided.'}"
                    f"{cover_display}\n"
                    f"{'─' * 38}\n"
                    f"  📂 Your Section  : {section_description or 'Not specified'}\n"
                    f"  🎯 Your Role     : {role or 'Not specified'}\n"
                    f"  📋 Your Duties   : {duty_description or 'Not specified'}\n"
                    f"{'─' * 38}\n"
                    f"  👤 Invited by : {leader_name}\n"
                    f"  📧 Email      : {leader_email}\n"
                    f"  💼 Position   : {leader_position or 'Not specified'}\n"
                    f"{'─' * 38}\n"
                    f"Please respond using [ Accept ] or [ Deny ] below."
                )

                cursor.execute(
                    "INSERT INTO notifications (user_id, message, section_id) VALUES (%s, %s, %s)",
                    (member_user_id, notification_message, section_id)
                )

            connection.commit()

        return jsonify({'success': True, 'project_id': project_id})

    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

    finally:
        cursor.close()
        connection.close()

@app.route('/project_setup')
def project_setup_page():
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('project_setup.html')

# ══════════════════════════════════════════════════════════════════════════════
# ROUTE 3 — Fetch notifications for the logged-in user
# GET /notifications
# Returns all notifications newest-first.
# Each item carries the noti_id which the frontend passes to /respond_invitation.
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/notifications')
def get_notifications():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id    = session['user_id']
    connection = get_db_connection()
    cursor     = connection.cursor()

    cursor.execute(
    """
    SELECT n.noti_id, n.message, n.created_at,
           n.section_id, sa.acceptance_status
    FROM notifications n
    LEFT JOIN section_assignees sa
           ON sa.section_id = n.section_id
          AND sa.user_id = n.user_id
    WHERE n.user_id = %s
    ORDER BY n.created_at DESC
    """,
    (user_id,)
)
    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    notifications = [
        {
            'noti_id':           row[0],
            'message':           row[1],
            'created_at':        str(row[2]),
            'section_id':        row[3],   # needed for the respond button
            'acceptance_status': row[4]    # 0=pending, 1=accepted, 2=denied
        }
        for row in rows
    ]
    return jsonify({'success': True, 'notifications': notifications})


@app.route('/notifications_page')
def notifications_page():
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('notifications.html')


# ══════════════════════════════════════════════════════════════════════════════
# ROUTE 4 — Respond to an invitation  (Accept or Deny)
# POST /respond_invitation
#
# Form fields:
#   section_id   (int)
#   response     "accept" | "deny"
#
# Rules:
#   - Only the invited user themselves can respond.
#   - accept → acceptance_status = 1
#   - deny   → acceptance_status = 2
#     (row is kept so the leader can later see who declined vs who is pending)
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/respond_invitation', methods=['POST'])
def respond_invitation():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id    = session['user_id']
    section_id = request.form.get('section_id', type=int)
    response   = request.form.get('response', '').strip().lower()

    if not section_id or response not in ('accept', 'deny'):
        return jsonify({'success': False, 'message': 'Invalid section_id or response'}), 400

    new_status = 1 if response == 'accept' else 2

    connection = get_db_connection()
    cursor     = connection.cursor()

    try:
        # Confirm the row exists and belongs to the current user
        cursor.execute(
            """
            SELECT acceptance_status FROM section_assignees
            WHERE section_id = %s AND user_id = %s
            """,
            (section_id, user_id)
        )
        row = cursor.fetchone()

        if not row:
            return jsonify({'success': False, 'message': 'Invitation not found'}), 404

        if row[0] != 0:
            return jsonify({'success': False, 'message': 'You have already responded to this invitation'}), 409

        cursor.execute(
            """
            UPDATE section_assignees
            SET    acceptance_status = %s
            WHERE  section_id = %s AND user_id = %s
            """,
            (new_status, section_id, user_id)
        )
        connection.commit()

        label = "accepted" if new_status == 1 else "denied"
        return jsonify({'success': True, 'message': f'Invitation {label} successfully.'})

    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════════
# ── DOCUMENTATION ─────────────────────────────────────────────────────────────
#
#  HELPER
#  ──────
#  save_upload(file, subfolder, prefix)
#    Validates the file extension, saves to static/uploads/<subfolder>/,
#    and returns the relative path string for storing in the DB.
#    Returns None if no file was sent or the extension is invalid.
#    Used by both /project_setup cover pic and per-section pictures.
#
#
#  ROUTE 1 — GET /search_user_by_email?email=...
#  ──────────────────────────────────────────────
#  Live lookup while the leader builds the form. Returns the user's
#  id, username, email, profile_pic, and position so the UI can render
#  a small confirmation card before adding them to a section.
#
#
#  ROUTE 2 — POST /project_setup  (multipart/form-data)
#  ──────────────────────────────────────────────────────
#  The core creation route. Strict execution order:
#    1. Fetch leader's name / email / position  →  used in every notification.
#    2. Save cover pic  →  INSERT projects  →  capture project_id.
#    3. Loop sections (sections_data JSON string):
#         Save section pic  →  INSERT project_sections  →  capture section_id.
#         Loop assignees:
#           INSERT section_assignees  (acceptance_status = 0, i.e. pending)
#           INSERT notifications      (pre-formatted invitation message with
#                                      project name, description, cover link,
#                                      section info, role, duties, leader info)
#  The entire operation is inside try/except with rollback() so nothing is
#  left half-saved if anything fails mid-way.
#  Returns { success: true, project_id: N } on success.
#
#
#  ROUTE 3 — GET /notifications
#  ─────────────────────────────
#  Returns all notifications for the logged-in user, newest first.
#  Each item includes noti_id, message, created_at, section_id, and
#  acceptance_status so the frontend knows whether to show the
#  [ Accept ] / [ Deny ] buttons or a "Already responded" label.
#
#
#  ROUTE 4 — POST /respond_invitation
#  ────────────────────────────────────
#  Called when the user taps [ Accept ] or [ Deny ].
#  Fields: section_id (int), response ("accept" | "deny").
#  Validates ownership and that the user hasn't already responded,
#  then sets acceptance_status to 1 (accepted) or 2 (denied).
#  The row is never deleted — this lets the project leader later query
#  who accepted, who denied, and who is still pending (status = 0).
#
#
#  acceptance_status  reference:
#    0 = Pending   (invited, no response yet)
#    1 = Accepted
#    2 = Denied
#
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    app.run(debug=True, port=5000)