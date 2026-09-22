from flask import Flask, request, session, jsonify
from flask_cors import CORS
from user import user_bp
import json
import os
from werkzeug.utils import secure_filename

from db import get_db_connection, ALLOWED_EXTENSIONS, create_notification

app = Flask(__name__)
app.secret_key = "your_secret_key_here"  # TODO: move to env var before shipping

# --- CORS + session cookie config for the React SPA ---
# The Vite dev server runs on a different port (5173) than Flask (5000),
# which browsers treat as a different origin. Cookies won't cross that
# boundary by default, so both sides need explicit config:
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",   # "None" + Secure=True only if you move to HTTPS
    SESSION_COOKIE_SECURE=False,     # set True once you're on HTTPS in production
)

app.register_blueprint(user_bp)


# ══════════════════════════════════════════════════════════════════════════
# GET /dashboard_data — unchanged, was already JSON in the original.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/dashboard_data')
def dashboard_data():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, task, description, completed, due_date, importance, related, created_at
        FROM tasks WHERE user_id = %s
    """, (user_id,))
    tasks = cursor.fetchall()

    for t in tasks:
        cursor.execute("""
            SELECT sid, step_description, difficulty, status
            FROM steps WHERE fid = %s
        """, (t['id'],))
        t['steps'] = cursor.fetchall()
        t['created_at'] = str(t['created_at'])
        if t['due_date']:
            t['due_date'] = str(t['due_date'])

    cursor.close()
    connection.close()

    return jsonify({'success': True, 'tasks': tasks})


# ══════════════════════════════════════════════════════════════════════════
# GET /home_data — NEW route replacing the old `index()` page render.
# The old `/` route computed username/profile_pic/prompts/missing_fields
# and handed them to Jinja. React needs the same data via fetch on mount.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/home_data')
def home_data():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()

    prompts = []
    missing_fields = []

    if user:
        username = user[1]
        email = user[2]
        profile_pic = user[7]

        if email is None:
            prompts.append("Verify Email ⚡")

        if None in (user[3], user[4], user[5]):
            prompts.append("Setup Profile 🛠️")

        if user[3] is None: missing_fields.append('position')
        if user[4] is None: missing_fields.append('age')
        if user[5] is None: missing_fields.append('gender')
        if user[7] is None: missing_fields.append('pic')
    else:
        username = "Unknown"
        profile_pic = None

    if user:
        cursor.execute("SELECT dismissed_prompts FROM users WHERE id = %s", (user_id,))
        d_row = cursor.fetchone()
        dismissed = json.loads(d_row[0]) if d_row and d_row[0] else []
        prompts = [p for p in prompts if not any(p.startswith(d) for d in dismissed)]

    cursor.close()
    connection.close()

    return jsonify({
        'success': True,
        'username': username,
        'profile_pic': profile_pic,
        'prompts': prompts,
        'missing_fields': missing_fields
    })

# ══════════════════════════════════════════════════════════════════════════
# POST /api/dismiss_prompt — permanently dismiss a home-page prompt bubble
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/dismiss_prompt', methods=['POST'])
def dismiss_prompt():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    data = request.get_json(silent=True) or {}
    prompt_key = data.get('prompt_key')
    if not prompt_key:
        return jsonify({'success': False, 'message': 'prompt_key is required'}), 400

    user_id = session['user_id']
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT dismissed_prompts FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        dismissed = json.loads(row[0]) if row and row[0] else []
        if prompt_key not in dismissed:
            dismissed.append(prompt_key)
        cursor.execute(
            "UPDATE users SET dismissed_prompts = %s WHERE id = %s",
            (json.dumps(dismissed), user_id)
        )
        connection.commit()
        return jsonify({'success': True, 'dismissed_prompts': dismissed})
    finally:
        cursor.close()
        connection.close()

# ══════════════════════════════════════════════════════════════════════════
# GET /task_details_data — replaces task_details(). Was: render_template
# with raw tuples + a `table_type` query param that picked a template.
# Now: one JSON payload with everything; React decides what to show.
# The `table` query param is kept (optional) in case you still want the
# API to filter server-side, but it's no longer required for two templates
# to exist — there's only one route now.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/task_details_data')
def task_details_data():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT username FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    username = user['username'] if user else "Unknown"

    cursor.execute(
        "SELECT id, task, completed, created_at, due_date FROM tasks WHERE user_id = %s",
        (user_id,)
    )
    tasks = cursor.fetchall()
    for t in tasks:
        t['created_at'] = str(t['created_at'])
        if t['due_date']:
            t['due_date'] = str(t['due_date'])

    cursor.execute(
        "SELECT task, completed_at FROM completed_tasks WHERE fid IN (SELECT id FROM tasks WHERE user_id = %s)",
        (user_id,)
    )
    completed_tasks = cursor.fetchall()
    for c in completed_tasks:
        if c.get('completed_at'):
            c['completed_at'] = str(c['completed_at'])

    cursor.execute("""
        SELECT DISTINCT fid
        FROM steps
        WHERE status = 0
        AND fid IN (SELECT id FROM tasks WHERE user_id = %s)
    """, (user_id,))
    tasks_with_unfinished_steps = [row['fid'] for row in cursor.fetchall()]

    cursor.close()
    connection.close()

    return jsonify({
        'success': True,
        'username': username,
        'tasks': tasks,
        'completed_tasks': completed_tasks,
        'tasks_with_unfinished_steps': tasks_with_unfinished_steps
    })


# ══════════════════════════════════════════════════════════════════════════
# POST /api/add_task — was: form POST -> redirect('/'). Now: JSON in, JSON out.
# React sends the same field names via FormData (steps[] included), gets
# the new task back so it can update local state without a full refetch.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/add_task', methods=['POST'])
def add_task():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    task = request.form.get('task')
    description = request.form.get('description', '')
    due_date = request.form.get('due_date')
    steps = request.form.getlist('steps[]')
    user_id = session['user_id']
    importance = request.form.get('importance', 'Medium')
    related = request.form.get('related', 'Other')

    if not task:
        return jsonify({'success': False, 'message': 'Task name is required'}), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        if due_date:
            cursor.execute(
                "INSERT INTO tasks (task, description, completed, user_id, due_date, importance, related) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (task, description, 0, user_id, due_date, importance, related)
            )
        else:
            cursor.execute(
                "INSERT INTO tasks (task, description, completed, user_id, importance, related) VALUES (%s, %s, %s, %s, %s, %s)",
                (task, description, 0, user_id, importance, related)
            )

        task_id = cursor.lastrowid

        cursor.execute("SELECT task FROM tasks WHERE id = %s", (task_id,))
        task_name = cursor.fetchone()[0]

        inserted_steps = []
        for step in steps:
            step_data = step.split("|")
            if len(step_data) == 2:
                step_description, difficulty = step_data
                cursor.execute(
                    "INSERT INTO steps (fid, step_description, difficulty, status, task) VALUES (%s, %s, %s, %s, %s)",
                    (task_id, step_description, difficulty, 0, task_name)
                )
                inserted_steps.append({
                    'sid': cursor.lastrowid,
                    'step_description': step_description,
                    'difficulty': difficulty,
                    'status': 0
                })

        connection.commit()

        return jsonify({
            'success': True,
            'task': {
                'id': task_id,
                'task': task_name,
                'description': description,
                'completed': 0,
                'due_date': due_date,
                'importance': importance,
                'related': related,
                'steps': inserted_steps
            }
        })
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# POST /api/complete/<int:task_id> — unchanged, was already JSON.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/complete/<int:task_id>', methods=['POST'])
def complete_task(task_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("UPDATE tasks SET completed = 1 WHERE id = %s", (task_id,))
        connection.commit()

        cursor.execute(
            "INSERT INTO completed_tasks (fid, task, completed_at) SELECT id, task, NOW() FROM tasks WHERE id = %s",
            (task_id,)
        )
        connection.commit()

        return jsonify({'success': True})
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# GET /api/setup_step_data/<int:fid> — replaces setup_step() page render.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/setup_step_data/<int:fid>')
def setup_step_data(fid):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT task FROM tasks WHERE id = %s", (fid,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'success': False, 'message': 'Task not found'}), 404
        task_name = row['task']

        cursor.execute("SELECT * FROM steps WHERE fid = %s", (fid,))
        steps = cursor.fetchall()

        return jsonify({'success': True, 'fid': fid, 'task_name': task_name, 'steps': steps})
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# POST /add_step/<fid> — was: form POST -> redirect back to setup_step page.
# Now: JSON in/out, returns the created step so React can append it locally.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/add_step/<int:fid>', methods=['POST'])
def add_step(fid):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    step_description = request.form.get('step_description')
    difficulty = request.form.get('difficulty')

    if not step_description or not difficulty:
        return jsonify({'success': False, 'message': 'step_description and difficulty are required'}), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT task FROM tasks WHERE id = %s", (fid,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'success': False, 'message': 'Task not found'}), 404
        task_name = row[0]

        cursor.execute(
            "INSERT INTO steps (fid, step_description, difficulty, status, task) VALUES (%s, %s, %s, %s, %s)",
            (fid, step_description, difficulty, 0, task_name)
        )
        connection.commit()

        return jsonify({
            'success': True,
            'step': {
                'sid': cursor.lastrowid,
                'step_description': step_description,
                'difficulty': difficulty,
                'status': 0
            }
        })
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# POST /complete_step/<id> — was: redirect(request.referrer), which doesn't
# make sense at all for an SPA (there's no "referring page" to bounce back
# to). Now: JSON confirmation, React updates its own local state.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/complete_step/<int:step_id>', methods=['POST'])
def complete_step(step_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("UPDATE steps SET status = 1 WHERE sid = %s", (step_id,))
        connection.commit()
        return jsonify({'success': True})
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# GET /api/calendar_tasks — returns every task belonging to the logged-in
# user that HAS a due_date set, for plotting on the Calendar page.
# Steps are intentionally NOT included here (keeps this endpoint light —
# the frontend fetches steps for one task at a time, on click, via the
# existing /api/setup_step_data/<fid>).
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/calendar_tasks')
def calendar_tasks():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """SELECT id, task, description, completed, due_date, importance, related
               FROM tasks
               WHERE user_id = %s AND due_date IS NOT NULL
               ORDER BY due_date ASC""",
            (user_id,)
        )
        tasks = cursor.fetchall()

        # due_date comes back as a datetime.date from the driver — make it
        # JSON-safe and predictable for the frontend (YYYY-MM-DD, matches
        # what <input type="date"> / the calendar grid keys expect).
        for t in tasks:
            if t.get('due_date') is not None:
                t['due_date'] = t['due_date'].isoformat()

        return jsonify({'success': True, 'tasks': tasks})
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# GET /feedback/<task_id> — was: render_template, and returned a raw HTML
# error string ("Error: ...", 400) on failure. Now: JSON both paths.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/feedback/<int:task_id>')
def feedback(task_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT created_at FROM tasks WHERE id = %s", (task_id,))
        result = cursor.fetchone()
        created_at = result[0] if result else None

        cursor.execute("SELECT completed_at FROM completed_tasks WHERE fid = %s", (task_id,))
        result = cursor.fetchone()
        completed_at = result[0] if result else None

        if not created_at or not completed_at:
            return jsonify({'success': False, 'message': 'Missing timestamps for this task.'}), 400

        time_difference = (completed_at - created_at).total_seconds() / 3600

        if time_difference < 2:
            rating, icon = "Excellent", "✅"
        elif time_difference < 6:
            rating, icon = "Good", "👍"
        elif time_difference < 24:
            rating, icon = "Normal", "😐"
        else:
            rating, icon = "Need Work", "⚠️"

        return jsonify({
            'success': True,
            'rating': rating,
            'icon': icon,
            'created_at': str(created_at),
            'completed_at': str(completed_at),
            'time_difference': round(time_difference, 2)
        })
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# POST /save_profile_setup — unchanged, was already JSON.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/save_profile_setup', methods=['POST'])
def save_profile_setup():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    position = request.form.get('position') or None
    age_raw = request.form.get('age') or None
    gender = request.form.get('gender') or None
    pic_file = request.files.get('profile_pic')

    age = None
    if age_raw:
        try:
            age = int(age_raw)
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid age value'}), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        updates = []
        params = []

        if position is not None:
            updates.append("position = %s")
            params.append(position)
        if age is not None:
            updates.append("age = %s")
            params.append(age)
        if gender is not None:
            updates.append("gender = %s")
            params.append(gender)

        if pic_file and pic_file.filename:
            ext = pic_file.filename.rsplit('.', 1)[-1].lower() if '.' in pic_file.filename else ''
            if ext in ALLOWED_EXTENSIONS:
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
        connection.rollback()
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
    filename = secure_filename(file.filename)
    unique_name = f"{prefix}_{filename}"
    file.save(os.path.join(folder, unique_name))
    return f"uploads/{subfolder}/{unique_name}"


@app.route('/api/search_user_by_email')
def search_user_by_email():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    email = request.args.get('email', '').strip()
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400

    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT id, username, email, profile_pic, position FROM users WHERE email = %s",
            (email,)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        return jsonify({
            'success': True,
            'user': {
                'id': user[0],
                'username': user[1],
                'email': user[2],
                'profile_pic': user[3],
                'position': user[4]
            }
        })
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# GET /api/notifications — list the logged-in user's notifications
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/notifications')
def get_notifications():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, type, title, message, related_id, is_read, created_at
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 100
        """, (session['user_id'],))
        rows = cursor.fetchall()
        for r in rows:
            r['created_at'] = str(r['created_at'])
            r['is_read'] = bool(r['is_read'])

        cursor.execute(
            "SELECT COUNT(*) AS n FROM notifications WHERE user_id = %s AND is_read = 0",
            (session['user_id'],)
        )
        unread = cursor.fetchone()['n']

        return jsonify({'success': True, 'notifications': rows, 'unread_count': unread})
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# POST /api/mark_notification_read/<id>
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/mark_notification_read/<int:notification_id>', methods=['POST'])
def mark_notification_read(notification_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = %s AND user_id = %s",
            (notification_id, session['user_id'])
        )
        connection.commit()
        return jsonify({'success': True})
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# POST /api/mark_all_notifications_read
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/mark_all_notifications_read', methods=['POST'])
def mark_all_notifications_read():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = %s",
            (session['user_id'],)
        )
        connection.commit()
        return jsonify({'success': True})
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# POST /api/generate_due_notifications
#   Call this from a cron job / scheduler (once every few hours is fine).
#   It scans tasks due within the next 24h and creates one notification per
#   (user, task) pair — deduped so it doesn't spam on every run.
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/generate_due_notifications', methods=['POST'])
def generate_due_notifications():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        # Tasks due within the next 24 hours, not completed
        cursor.execute("""
            SELECT id, user_id, task, due_date
            FROM tasks
            WHERE completed = 0
              AND due_date IS NOT NULL
              AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        """)
        due_tasks = cursor.fetchall()

        created = 0
        for t in due_tasks:
            # Dedup: one 'task_due_soon' notification per task, ever
            cursor.execute("""
                SELECT id FROM notifications
                WHERE user_id = %s AND type = 'task_due_soon' AND related_id = %s
                LIMIT 1
            """, (t['user_id'], t['id']))
            if cursor.fetchone():
                continue

            create_notification(
                cursor,
                t['user_id'],
                'task_due_soon',
                "Task Due Soon",
                f"Your task \"{t['task']}\" is due on {t['due_date']}.",
                t['id']
            )
            created += 1

        connection.commit()
        return jsonify({'success': True, 'created': created})
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


# ══════════════════════════════════════════════════════════════════════════
# ── ROUTE MAP CHANGELOG (old -> new) ─────────────────────────────────────
#   GET  /                    -> GET  /home_data
#   GET  /task_details        -> GET  /task_details_data   (table_type param dropped)
#   GET  /setup_step/<fid>    -> GET  /setup_step_data/<fid>
#   GET  /project_setup       -> GET  /project_setup_page  (now near-vestigial)
#   GET  /notifications_page  -> GET  /notifications_page_data
#   POST /add_task            -> same URL, JSON response instead of redirect
#   POST /add_step/<fid>      -> same URL, JSON response instead of redirect
#   POST /complete_step/<id>  -> same URL, JSON response instead of referrer redirect
#   GET  /feedback/<id>       -> same URL, JSON response instead of HTML/template
#   Everything else           -> unchanged URL, was already JSON
#
#   NEW: GET /me (user.py)    -> session check for the SPA on page load
# ══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    app.run(debug=True, port=5000)