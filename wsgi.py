"""
WSGI entrypoint for Gunicorn.

Gunicorn is started with: `gunicorn wsgi:app`
so this file *must* expose a module-level variable named `app`.
"""


# This is the object Gunicorn looks for when you run `gunicorn wsgi:app`
app = create_app(config_name)
