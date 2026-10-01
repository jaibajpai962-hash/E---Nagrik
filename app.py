import io
import json
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, abort, flash, jsonify, redirect, render_template, request, session, url_for
from dotenv import load_dotenv
from markupsafe import Markup
from sqlalchemy import func, text

import ai_waste
import data
import gemini_api
from models import Complaint, User, db

load_dotenv()

BASE = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("SECRET_KEY", "change-me-in-production"),
    SQLALCHEMY_DATABASE_URI="sqlite:///" + os.path.join(BASE, "enagrik.db"),
    MAX_CONTENT_LENGTH=3 * 1024 * 1024,
    # hardened session cookie (set ENABLE_HTTPS=1 when serving over https)
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("ENABLE_HTTPS", "0").lower() in ("1", "true", "yes"),
)
UPLOAD_DIR = os.path.join(BASE, "static", "uploads")
ALLOWED = {"png", "jpg", "jpeg", "gif", "webp"}
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "enagrik@gmail.com").strip().lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me-admin-password").strip()
db.init_app(app)


# ---------- helpers ----------
def current_user():
    uid = session.get("uid")
    return db.session.get(User, uid) if uid else None


def role_required(role):
    def deco(f):
        @wraps(f)
        def wrapper(*a, **k):
            u = current_user()
            if not u or not u.is_active or u.role != role:
                return redirect(url_for("login"))
            return f(*a, **k)
        return wrapper
    return deco


def login_required(f):
    @wraps(f)
    def wrapper(*a, **k):
        if not current_user():
            return redirect(url_for("login"))
        return f(*a, **k)
    return wrapper


# ---------- account protection ----------
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCK_SECONDS = 15 * 60
_login_attempts = {}  # client ip -> {"count": int, "until": float}


def client_ip():
    forwarded = request.headers.get("X-Forwarded-For", "")
    return (forwarded.split(",")[0].strip() or request.remote_addr or "unknown")


def lock_remaining(ip):
    """Seconds left on this client's login lock (0 = not locked)."""
    entry = _login_attempts.get(ip)
    if not entry:
        return 0
    if entry["until"] > time.time():
        return int(entry["until"] - time.time()) + 1
    if entry["until"]:  # lock expired -> start over
        _login_attempts.pop(ip, None)
    return 0


def record_failure(ip):
    entry = _login_attempts.setdefault(ip, {"count": 0, "until": 0.0})
    entry["count"] += 1
    if entry["count"] >= LOGIN_MAX_ATTEMPTS:
        entry["until"] = time.time() + LOGIN_LOCK_SECONDS
    return entry["count"]


def clear_failures(ip):
    _login_attempts.pop(ip, None)


def rotate_session():
    """Issue a fresh session (and CSRF token) right after authentication."""
    session.clear()
    session["csrf"] = secrets.token_hex(16)


def password_problem(pw):
    """Server-side password policy for new signups (None = acceptable)."""
    if len(pw) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Za-z]", pw):
        return "Password must include at least one letter."
    if not re.search(r"\d", pw):
        return "Password must include at least one number."
    return None


@app.after_request
def security_headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    resp.headers.setdefault("Permissions-Policy", "camera=(self), geolocation=(self)")
    if request.environ.get("wsgi.url_scheme") == "https":
        resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return resp


@app.errorhandler(413)
def request_too_large(e):
    """Oversized upload: JSON for the AI API, a clean page for regular form posts."""
    if request.path.startswith("/api/"):
        return jsonify(success=False, error="Image is too large. Maximum upload size is 3 MB."), 413
    return ("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>413 - File too large</title>"
            "<body style=\"font:15px system-ui;padding:2rem;color:#101A15\">"
            "<h1>413 - File too large</h1><p>The upload exceeds the 3 MB limit. Please choose a smaller file.</p>"
            "</body></html>"), 413, {"Content-Type": "text/html; charset=utf-8"}


@app.errorhandler(400)
def bad_request(e):
    if "Invalid CSRF token" not in str(e):
        return e
    if request.path.startswith("/api/"):
        return jsonify(success=False, error="Something went wrong. Please try again."), 400
    if request.path == "/register":
        recovery_url = url_for("register")
    elif request.path == "/login" and request.args.get("admin") == "1":
        recovery_url = url_for("login", admin="1")
    else:
        recovery_url = url_for("login")
    return render_template("error.html", recovery_url=recovery_url), 400


def create_complaint(user, category, title, description, location, priority, status="Submitted", remark="Pending review.", photo=None, when=None):
    c = Complaint(code="tmp", user_id=user.id, category=category, title=title, description=description, location=location,
                  priority=priority, status=status, admin_remark=remark, photo=photo, created_at=when or datetime.utcnow())
    db.session.add(c)
    db.session.flush()
    c.code = f"EN-2026-{1000 + c.id}"
    return c


def _report_text(value):
    return " ".join(value.split()).casefold()


def seed():
    """Fresh install: only the two login accounts — no default complaints or points."""
    db.drop_all()
    db.create_all()
    a = User(name="User", email="aarav@example.com", mobile="9876543210", area="Sector 12", role="citizen", green_points=0)
    a.set_password("citizen123")
    m = User(name="Municipal Admin", email=ADMIN_EMAIL, role="admin")
    m.set_password(ADMIN_PASSWORD)
    db.session.add_all([a, m])
    db.session.commit()


def ensure_admin_account():
    admin = User.query.filter_by(email=ADMIN_EMAIL).first()
    if not admin:
        admin = User.query.filter_by(email="admin@enagrik.in", role="admin").first()
        if admin:
            admin.email = ADMIN_EMAIL
            admin.set_password(ADMIN_PASSWORD)
    if not admin:
        admin = User(name="Municipal Admin", email=ADMIN_EMAIL, role="admin")
        admin.set_password(ADMIN_PASSWORD)
        db.session.add(admin)
    elif admin.role != "admin":
        raise RuntimeError(f"Configured admin email belongs to a non-admin user: {ADMIN_EMAIL}")
    db.session.commit()


def ensure_user_photo_column():
    columns = db.session.execute(text("PRAGMA table_info(user)")).fetchall()
    if not any(row[1] == "photo" for row in columns):
        db.session.execute(text("ALTER TABLE user ADD COLUMN photo VARCHAR(120)"))
        db.session.commit()


def ensure_user_active_column():
    columns = db.session.execute(text("PRAGMA table_info(user)")).fetchall()
    if not any(row[1] == "is_active" for row in columns):
        db.session.execute(text("ALTER TABLE user ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))
        db.session.commit()


app.jinja_env.globals["csrf_input"] = lambda: Markup(f'<input type="hidden" name="csrf" value="{session.get("csrf", "")}">')


@app.before_request
def csrf_protect():
    session.setdefault("csrf", secrets.token_hex(16))
    if request.method == "POST":
        token = request.form.get("csrf") or request.headers.get("X-CSRF", "")
        if not secrets.compare_digest(token, session["csrf"]):
            abort(400, "Invalid CSRF token")


@app.context_processor
def inject():
    return {"user": current_user(), "STATUSES": data.STATUSES}


# ---------- auth ----------
@app.route("/")
def index():
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    admin_mode = request.args.get("admin") == "1"
    if request.method == "POST":
        ip = client_ip()
        wait = lock_remaining(ip)
        if wait:  # brute-force protection: same message, no account details leaked
            flash(f"Too many login attempts. Try again in {max(1, -(-wait // 60))} minute(s).", "error")
            return render_template("login.html", admin_mode=admin_mode), 429
        u = User.query.filter_by(email=request.form.get("email", "").strip().lower()).first()
        if u and u.is_active and (not admin_mode or u.role == "admin") and u.check_password(request.form.get("password", "")):
            clear_failures(ip)
            rotate_session()          # new session id -> blocks session fixation
            session["uid"] = u.id
            flash(f"Logged in as {u.name}", "success")
            return redirect(url_for("admin_dashboard" if u.role == "admin" else "dashboard"))
        record_failure(ip)
        flash("Invalid email or password.", "error")  # generic: never reveals if the email exists
    return render_template("login.html", admin_mode=admin_mode)


@app.post("/demo-login/citizen")
def demo_citizen_login():
    wait = lock_remaining(client_ip())
    if wait:
        flash("Too many login attempts. Try again in a few minutes.", "error")
        return redirect(url_for("login"))
    u = User.query.filter_by(email="aarav@example.com", role="citizen").first_or_404()
    rotate_session()
    session["uid"] = u.id
    flash("Logged in as Citizen", "success")
    return redirect(url_for("dashboard"))


@app.route("/register", methods=["GET", "POST"])
def register():
    f = request.form
    if request.method == "POST":
        name, email, mobile, area = (f.get(k, "").strip() for k in ("name", "email", "mobile", "area"))
        pw, pw2 = f.get("password", ""), f.get("password2", "")
        errors = []
        if len(name) < 2: errors.append("Enter your full name.")
        if "@" not in email or "." not in email: errors.append("Enter a valid email.")
        if not (mobile.isdigit() and len(mobile) == 10): errors.append("Mobile number must be 10 digits.")
        problem = password_problem(pw)
        if problem: errors.append(problem)
        if pw != pw2: errors.append("Passwords do not match.")
        if not area: errors.append("Enter your area or address.")
        if not errors and User.query.filter_by(email=email.lower()).first(): errors.append("This email is already registered.")
        if errors:
            for e in errors: flash(e, "error")
        else:
            u = User(name=name, email=email.lower(), mobile=mobile, area=area, role="citizen")
            u.set_password(pw)
            db.session.add(u)
            db.session.commit()
            rotate_session()
            session["uid"] = u.id
            flash("Account created successfully", "success")
            return redirect(url_for("dashboard"))
    return render_template("register.html", f=f)


@app.post("/logout")
def logout():
    session.pop("uid", None)
    return redirect(url_for("login"))


@app.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    u = current_user()
    f = request.form
    if request.method == "POST":
        name = f.get("name", "").strip()
        email = f.get("email", "").strip().lower()
        password = f.get("password", "")
        errors = []
        if len(name) < 2:
            errors.append("Enter your full name.")
        if "@" not in email or "." not in email:
            errors.append("Enter a valid email.")
        if User.query.filter(User.email == email, User.id != u.id).first():
            errors.append("This email is already registered.")
        if password:
            problem = password_problem(password)
            if problem:
                errors.append(problem)
        upload = request.files.get("photo")
        remove_photo = f.get("remove_photo") == "1"
        new_photo = None
        if upload and upload.filename:
            ext = upload.filename.rsplit(".", 1)[-1].lower()
            if ext not in ALLOWED:
                errors.append("Profile photo must be PNG, JPG, GIF or WEBP.")
            else:
                new_photo = f"{uuid.uuid4().hex}.{ext}"
        if errors:
            for error in errors:
                flash(error, "error")
        else:
            old_photo = u.photo
            if new_photo:
                upload.save(os.path.join(UPLOAD_DIR, new_photo))
                u.photo = new_photo
            elif remove_photo:
                u.photo = None
            u.name = name
            u.email = email
            if password:
                u.set_password(password)
            db.session.commit()
            if (new_photo or remove_photo) and old_photo:
                try:
                    os.remove(os.path.join(UPLOAD_DIR, old_photo))
                except OSError:
                    pass
            flash("Profile updated successfully.", "success")
            return redirect(url_for("profile"))
    return render_template("profile.html", profile_user=u)


# ---------- citizen ----------
@app.route("/citizen/dashboard")
@role_required("citizen")
def dashboard():
    u = current_user()
    mine = u.complaints
    stats = {"total": len(mine), "pending": sum(c.status in ("Submitted", "Under Review") for c in mine),
             "resolved": sum(c.status == "Resolved" for c in mine)}
    return render_template("citizen/dashboard.html", recent=mine[:3], stats=stats, badge=data.get_badge(u.green_points))


@app.route("/citizen/report-issue", methods=["GET", "POST"])
@role_required("citizen")
def report_issue():
    u = current_user()
    f = request.form
    if request.method == "POST":
        v = {k: f.get(k, "").strip() for k in ("category", "title", "description", "location", "priority")}
        errors = []
        if v["category"] not in data.CATEGORIES: errors.append("Select an issue category.")
        if len(v["title"]) < 5: errors.append("Title must be at least 5 characters.")
        if len(v["description"]) < 10: errors.append("Description must be at least 10 characters.")
        if not v["location"]: errors.append("Enter the location or area.")
        if v["priority"] not in data.PRIORITIES: errors.append("Select a priority.")
        photo = None
        photo_bytes = None
        photo_mime = "image/jpeg"
        file = request.files.get("photo")
        if file and file.filename:
            ext = file.filename.rsplit(".", 1)[-1].lower()
            if ext not in ALLOWED: errors.append("Photo must be PNG, JPG, GIF or WEBP.")
            else:
                photo = f"{uuid.uuid4().hex}.{ext}"
                photo_bytes = file.read()
                photo_mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
        if errors:
            for e in errors: flash(e, "error")
        else:
            cutoff = datetime.utcnow() - timedelta(days=7)
            recent = Complaint.query.filter(
                Complaint.user_id == u.id,
                Complaint.created_at >= cutoff,
            ).all()
            duplicate = next((c for c in recent if (
                _report_text(c.category) == _report_text(v["category"])
                and _report_text(c.title) == _report_text(v["title"])
                and _report_text(c.description) == _report_text(v["description"])
                and _report_text(c.location) == _report_text(v["location"])
            )), None)
            if duplicate:
                flash("This report was already sent recently. Please try again after 7 days.", "error")
                return render_template("citizen/report.html", f=f, done=None,
                                       categories=data.CATEGORIES, priorities=data.PRIORITIES)
            try:
                review = gemini_api.validate_report(
                    v["category"], v["title"], v["description"], v["location"],
                    image_bytes=photo_bytes, mime_type=photo_mime,
                )
            except Exception:
                flash("We could not verify this report right now. Please try again.", "error")
                return render_template("citizen/report.html", f=f, done=None,
                                       categories=data.CATEGORIES, priorities=data.PRIORITIES), 503
            if not review["valid"]:
                rejected = create_complaint(
                    u, photo=None, status="Rejected",
                    remark="Rejected by Gemini: irrelevant or invalid waste report.", **v
                )
                db.session.commit()
                flash("This report was rejected because it was not relevant to waste management.", "error")
                return render_template("citizen/report.html", f=f, done=None,
                                       categories=data.CATEGORIES, priorities=data.PRIORITIES)
            if photo:
                with open(os.path.join(UPLOAD_DIR, photo), "wb") as saved_photo:
                    saved_photo.write(photo_bytes)
            c = create_complaint(u, photo=photo, **v)
            u.green_points += 5
            db.session.commit()
            return redirect(url_for("report_issue", done=c.code))
    done = Complaint.query.filter_by(code=request.args.get("done", ""), user_id=u.id).first()
    return render_template("citizen/report.html", f=f, done=done, categories=data.CATEGORIES, priorities=data.PRIORITIES)


@app.route("/citizen/complaints")
@role_required("citizen")
def my_complaints():
    q, flt = request.args.get("q", "").strip(), request.args.get("status", "All")
    query = Complaint.query.filter_by(user_id=current_user().id)
    if flt == "Pending": query = query.filter(Complaint.status.in_(["Submitted", "Under Review"]))
    elif flt in ("In Progress", "Resolved", "Rejected"): query = query.filter_by(status=flt)
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(Complaint.code.ilike(like), Complaint.category.ilike(like), Complaint.location.ilike(like), Complaint.title.ilike(like)))
    return render_template("citizen/complaints.html", complaints=query.order_by(Complaint.id.desc()).all(), q=q, flt=flt,
                           filters=["All", "Pending", "In Progress", "Resolved", "Rejected"])


@app.route("/citizen/complaints/<code>")
@role_required("citizen")
def complaint_detail(code):
    c = Complaint.query.filter_by(code=code, user_id=current_user().id).first_or_404()
    return render_template("citizen/detail.html", c=c, step=data.STATUSES.index(c.status))


@app.post("/citizen/complaints/<code>/delete")
@role_required("citizen")
def delete_complaint(code):
    c = Complaint.query.filter_by(code=code, user_id=current_user().id).first_or_404()
    if c.photo:
        try:
            os.remove(os.path.join(UPLOAD_DIR, c.photo))
        except OSError:
            pass
    db.session.delete(c)
    db.session.commit()
    flash("Complaint deleted.", "success")
    return redirect(url_for("my_complaints"))


def _valid_quiz(pool):
    """True if pool looks like a usable question set (4 options + int answer each)."""
    return isinstance(pool, list) and bool(pool) and all(
        isinstance(x, dict) and x.get("q") and isinstance(x.get("options"), list)
        and len(x["options"]) == 4 and isinstance(x.get("answer"), int) for x in pool)


QUIZ_FILE = os.path.join(BASE, "quiz_data.json")


def _write_quiz_file(pool):
    payload = {
        "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "source": "gemini",
        "count": len(pool),
        "questions": pool,
    }
    tmp = QUIZ_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp, QUIZ_FILE)


def _read_quiz_file():
    try:
        with open(QUIZ_FILE, encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError):
        return None
    pool = raw.get("questions") if isinstance(raw, dict) else raw
    return pool if _valid_quiz(pool) else None


def _current_quiz(allow_generate=True, fresh=False):
    cached = session.get("ai_quiz")
    cached = cached if _valid_quiz(cached) else None
    if not allow_generate:
        return cached or data.QUIZ
    if cached and not fresh:
        return cached

    prev = cached or _read_quiz_file()
    avoid = [x["q"] for x in prev] if prev else []

    pool = None
    try:
        pool = gemini_api.generate_quiz(len(data.QUIZ), avoid=avoid)
    except Exception:
        if fresh:
            session.pop("ai_quiz", None)
            session.pop("ai_quiz_at", None)
            raise
        pool = cached or _read_quiz_file()
        if pool is None:
            session.pop("ai_quiz", None)
            session.pop("ai_quiz_at", None)
            return data.QUIZ
    else:
        try:
            _write_quiz_file(pool)
        except OSError as e:
            app.logger.warning("could not write %s: %s", QUIZ_FILE, e)

    session["ai_quiz"] = pool
    session["ai_quiz_at"] = time.time()
    return pool


@app.route("/citizen/green-score")
@role_required("citizen")
def green_score():
    u = current_user()
    pool = session.get("ai_quiz")
    if not _valid_quiz(pool):
        pool = data.QUIZ
    quiz = [{"q": x["q"], "options": x["options"]} for x in pool]
    return render_template("citizen/green_score.html", badge=data.get_badge(u.green_points), quiz=quiz,
                           earn=data.EARN, badges=data.BADGES, tips=data.TIPS)


@app.get("/citizen/quiz/questions")
@role_required("citizen")
def quiz_questions():
    fresh = request.args.get("fresh") == "1"
    try:
        pool = _current_quiz(fresh=fresh)
    except Exception as e:
        app.logger.warning("fresh Gemini quiz unavailable: %s", e)
        return jsonify(error="A new quiz could not be generated. Please try again."), 503
    ai = _valid_quiz(pool) and pool is not data.QUIZ
    return jsonify(questions=[{"q": x["q"], "options": x["options"]} for x in pool],
                   source="gemini" if ai else "standard",
                   count=len(pool), fresh=fresh)


@app.post("/citizen/quiz")
@role_required("citizen")
def quiz_submit():
    u = current_user()
    pool = _current_quiz(allow_generate=False)
    answers = (request.get_json(silent=True) or {}).get("answers", [])
    score = sum(1 for i, x in enumerate(pool) if i < len(answers) and answers[i] == x["answer"])
    awarded = score > 0
    already = False
    earned = score
    if earned:
        u.green_points += earned
        u.quiz_done = True
        db.session.commit()
    return jsonify(score=score, total=len(pool), earned=earned, awarded=awarded,
                   already=already, points=u.green_points)


# ---------- ai waste detection ----------
@app.post("/api/ai/waste-detect")
def ai_waste_detect():
    """Classify an uploaded waste image into one of the smart-segregation categories."""
    u = current_user()
    if not u or u.role != "citizen":
        return jsonify(success=False, error="Sign in as a citizen to use the AI waste detector."), 401
    file = (request.files or {}).get("image")
    if not file or not file.filename:
        return jsonify(success=False, error="No image uploaded. Choose an image first."), 400
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED:
        return jsonify(success=False, error="Unsupported image format. Use PNG, JPG, GIF or WEBP."), 400
    raw = file.read()
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    # 1st choice: Gemini (cloud, accurate). Fallback: the on-device ONNX model.
    try:
        result = gemini_api.analyze_image(raw, mime)
    except gemini_api.GeminiError:
        try:
            result = ai_waste.analyze(io.BytesIO(raw))
            result["source"] = "on-device"
        except ai_waste.ImageError:
            return jsonify(success=False, error="Unable to analyze the uploaded image."), 400
        except ai_waste.ModelUnavailable:
            return jsonify(success=False, error="AI model is not available on this server right now. Please try again later."), 503
        except Exception:
            return jsonify(success=False, error="Unable to analyze the uploaded image."), 500
    except Exception:
        return jsonify(success=False, error="Unable to analyze the uploaded image."), 500
    return jsonify(result)


# ---------- admin ----------
@app.route("/admin/dashboard")
@role_required("admin")
def admin_dashboard():
    count = lambda *cond: Complaint.query.filter(*cond).count()
    stats = {"total": count(), "pending": count(Complaint.status.in_(["Submitted", "Under Review"])),
             "progress": count(Complaint.status == "In Progress"), "resolved": count(Complaint.status == "Resolved")}
    issues = db.session.query(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category) \
        .order_by(func.count(Complaint.id).desc()).limit(4).all()
    return render_template("admin/dashboard.html", stats=stats, issues=issues,
                           recent=Complaint.query.order_by(Complaint.id.desc()).limit(5).all())


@app.route("/admin/complaints")
@role_required("admin")
def admin_complaints():
    q, flt = request.args.get("q", "").strip(), request.args.get("status", "All")
    query = Complaint.query.join(User)
    if flt in data.STATUSES: query = query.filter(Complaint.status == flt)
    if q: query = query.filter(db.or_(Complaint.code.ilike(f"%{q}%"), User.name.ilike(f"%{q}%")))
    return render_template("admin/complaints.html", complaints=query.order_by(Complaint.id.desc()).all(), q=q, flt=flt,
                           open_code=request.args.get("open", ""))


@app.route("/admin/users")
@role_required("admin")
def admin_users():
    q = request.args.get("q", "").strip()
    query = User.query
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(User.name.ilike(like), User.email.ilike(like),
                                    User.mobile.ilike(like), User.area.ilike(like)))
    users = query.order_by(User.id.desc()).all()
    return render_template("admin/users.html", users=users, q=q)


@app.post("/admin/users/<int:user_id>/toggle-status")
@role_required("admin")
def admin_toggle_user_status(user_id):
    target = User.query.get_or_404(user_id)
    if target.id == current_user().id or target.role == "admin":
        flash("Admin accounts cannot be suspended from this page.", "error")
    else:
        target.is_active = not target.is_active
        db.session.commit()
        flash(f"User account {'activated' if target.is_active else 'suspended'}.", "success")
    return redirect(url_for("admin_users"))


@app.post("/admin/users/<int:user_id>/delete")
@role_required("admin")
def admin_delete_user(user_id):
    target = User.query.get_or_404(user_id)
    if target.id == current_user().id or target.role == "admin":
        flash("Admin accounts cannot be deleted from this page.", "error")
        return redirect(url_for("admin_users"))
    for complaint in list(target.complaints):
        if complaint.photo:
            try:
                os.remove(os.path.join(UPLOAD_DIR, complaint.photo))
            except OSError:
                pass
        db.session.delete(complaint)
    db.session.flush()
    if target.photo:
        try:
            os.remove(os.path.join(UPLOAD_DIR, target.photo))
        except OSError:
            pass
    db.session.delete(target)
    db.session.commit()
    flash("User account deleted.", "success")
    return redirect(url_for("admin_users"))


@app.post("/admin/complaints/<code>/update")
@role_required("admin")
def admin_update(code):
    c = Complaint.query.filter_by(code=code).first_or_404()
    status = request.form.get("status", "")
    if status not in data.STATUSES: abort(400)
    c.status = status
    c.admin_remark = request.form.get("remark", "").strip()[:300]
    db.session.commit()
    flash("Complaint updated successfully.", "success")
    return redirect(url_for("admin_complaints"))


with app.app_context():
    db.create_all()
    ensure_user_photo_column()
    ensure_user_active_column()
    if not User.query.first():
        seed()
    else:
        ensure_admin_account()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
