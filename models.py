from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    mobile = db.Column(db.String(15))
    area = db.Column(db.String(120))
    photo = db.Column(db.String(120))
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(10), nullable=False, default="citizen")  # citizen | admin
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    green_points = db.Column(db.Integer, nullable=False, default=0)
    quiz_done = db.Column(db.Boolean, nullable=False, default=False)
    complaints = db.relationship("Complaint", backref="user", lazy=True, order_by="Complaint.id.desc()")

    def set_password(self, pw: str) -> None:
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw: str) -> bool:
        return check_password_hash(self.password_hash, pw)


class Complaint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True)  # e.g. EN-2026-1001
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    category = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(150), nullable=False)
    priority = db.Column(db.String(10), nullable=False, default="Medium")
    status = db.Column(db.String(20), nullable=False, default="Submitted")
    photo = db.Column(db.String(120))
    admin_remark = db.Column(db.String(300), default="Pending review.")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def date(self) -> str:
        return self.created_at.strftime("%d %b %Y")
