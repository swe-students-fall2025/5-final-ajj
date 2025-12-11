import os
from app import create_app

# Choose config based on FLASK_ENV, default to "production"
config_name = os.getenv("FLASK_ENV", "production")

# This is the object Gunicorn looks for when you run `gunicorn wsgi:app`
app = create_app(config_name)
