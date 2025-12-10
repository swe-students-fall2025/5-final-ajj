"""
Routes package
"""
from .auth import auth_bp
from .groups import groups_bp
from .items import items_bp
from .ratings import ratings_bp

__all__ = ['auth_bp', 'groups_bp', 'items_bp', 'ratings_bp']