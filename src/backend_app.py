import os
import sqlite3
import hashlib
import hmac
import secrets
from flask import Flask, jsonify, request, session

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("FLASK_ENV") == "production",
)

DB_PATH = os.environ.get("KEDAR_DB", "kedar_users.db")
ADMIN_NAME = os.environ.get("KEDAR_ADMIN_NAME", "admin")
ADMIN_PASSWORD = os.environ.get("KEDAR_ADMIN_PASSWORD")

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db()
    conn.execute("""CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )""")
    conn.commit()
    conn.close()

def hash_password(password):
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return f"scrypt$16384$8$1${salt.hex()}${derived.hex()}"

def verify_password(password, stored):
    try:
        scheme, n, r, p, salt_hex, digest_hex = stored.split("$")
        if scheme != "scrypt":
            return False
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=bytes.fromhex(salt_hex),
            n=int(n), r=int(r), p=int(p)
        )
        return hmac.compare_digest(derived.hex(), digest_hex)
    except (ValueError, TypeError):
        return False

@app.after_request
def cors(response):
    origin = request.headers.get("Origin")
    if origin in {"http://localhost:5173", "http://127.0.0.1:5173"}:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response

@app.route("/api/<path:_path>", methods=["OPTIONS"])
def options(_path):
    response = jsonify(ok=True)
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

@app.post("/api/customer/login")
def customer_login():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    password = str(data.get("password", ""))

    if not name or not email or not phone or not password:
        return jsonify(message="Please fill in all fields."), 400
    if len(password) < 8:
        return jsonify(message="Password must be at least 8 characters."), 400

    conn = db()
    user = conn.execute("SELECT * FROM customers WHERE email = ?", (email,)).fetchone()
    if user:
        if not verify_password(password, user["password_hash"]):
            conn.close()
            return jsonify(message="Incorrect email or password."), 401
    else:
        conn.execute(
            "INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
            (name, email, phone, hash_password(password))
        )
        conn.commit()
    conn.close()

    session["customer_id"] = email
    return jsonify(ok=True, message="Login successful")

@app.post("/api/admin/login")
def admin_login():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    password = str(data.get("password", ""))
    if not ADMIN_PASSWORD:
        return jsonify(message="Admin password is not configured on the server."), 500
    if not hmac.compare_digest(name, ADMIN_NAME) or not hmac.compare_digest(password, ADMIN_PASSWORD):
        return jsonify(message="Incorrect admin name or password."), 401
    session["is_admin"] = True
    return jsonify(ok=True, message="Login successful")

@app.get("/api/session")
def current_session():
    return jsonify(customer=bool(session.get("customer_id")), admin=bool(session.get("is_admin")))

if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=True)
