# E Nagrik

E Nagrik is a Flask-based waste reporting and civic engagement platform for citizens and municipal admins. Citizens can register, submit waste issues with photos, track complaint status, and earn green points through awareness quizzes. Admins can review complaints, update statuses, and manage user accounts.

## Features

- Citizen registration and login
- Waste complaint reporting with photo upload
- AI-based waste classification using Gemini and a local ONNX fallback model
- Complaint tracking and status updates
- Green points and quiz-based engagement
- Admin dashboard for monitoring and managing reports
- Secure session handling and basic anti-abuse protections

## Tech Stack

- Python 3
- Flask
- Flask-SQLAlchemy
- SQLite
- Pillow, NumPy, ONNX Runtime
- Gemini API integration for image validation and classification

## Project Structure

- `app.py` — main Flask application and route definitions
- `models.py` — database models for users and complaints
- `data.py` — static app data such as categories, statuses, and badge rules
- `gemini_api.py` — Google Gemini API wrapper for analysis and validation
- `ai_waste.py` — local on-device waste detection fallback using ONNX
- `static/` — CSS, JS, and uploaded images
- `templates/` — Jinja HTML templates for citizen and admin pages
- `enagrik.db` — SQLite database file generated at runtime
- `requirements.txt` — Python dependency list

## Setup

### 1. Create a virtual environment

On Windows:

```powershell
python -m venv venv
venv\Scripts\activate
```

On macOS/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the app

```bash
python app.py
```

The application will run on:

```text
http://127.0.0.1:5001
```

## Configuration

The app uses environment variables for configuration:

- `SECRET_KEY` — Flask session secret, default: `dev-only-change-me`
- `ENABLE_HTTPS` — set to `1` to enable secure cookies and HSTS
- `ADMIN_EMAIL` — admin email, default: `enagrik@gmail.com`
- `ADMIN_PASSWORD` — admin password, default: `admin@enagrik`
- `GEMINI_API_KEY` — Google AI Studio key for Gemini features
- `GEMINI_MODEL` — optional model override

## Default Accounts

On first run, the app creates the database and seeds default users if no users exist.

- Citizen: `aarav@example.com` / `citizen123`
- Admin: `enagrik@gmail.com` / `admin@enagrik`

## Notes

- The SQLite database file is created automatically in the project root as `enagrik.db`.
- Uploaded complaint images are stored in `static/uploads`.
- The app tries Gemini first for AI analysis and falls back to the local ONNX model if the cloud service is unavailable.
- The local on-device model may download required files automatically on first use.

## Development Tips

- Use a real secret key in production instead of the default development value.
- Set `ENABLE_HTTPS=1` when running the app behind HTTPS.
- Keep the Gemini API key in environment variables instead of hardcoding it in source files.
