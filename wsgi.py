"""
WSGI entrypoint for Gunicorn.

Gunicorn is started with: `gunicorn wsgi:app`
so this file *must* expose a module-level variable named `app`.
"""

from app import app  # imports the global `app` created at the bottom of app.py
