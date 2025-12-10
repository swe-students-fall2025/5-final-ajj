"""
Main Flask application with Flask-Login
"""
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from flask_login import LoginManager, login_required, current_user
import os
from dotenv import load_dotenv

load_dotenv()  # make sure MONGO_URI, SECRET_KEY, etc. are loaded

from config import config
from utils.db import db, init_db, get_db_stats
from models.user import User
from models.group import Group
from models.item import Item

# Import blueprints
from routes.auth import auth_bp
from routes.groups import groups_bp
from routes.items import items_bp
from routes.ratings import ratings_bp


def create_app(config_name=None):
    """
    Application factory
    
    Args:
        config_name (str): Configuration name (development, production, testing)
        
    Returns:
        Flask: Configured Flask application
    """
    app = Flask(__name__, static_folder='static', static_url_path='')
    
    # Load configuration
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app.config.from_object(config[config_name])
    
    # Initialize CORS with proper settings
    CORS(app, 
         supports_credentials=True,
         origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'],
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         expose_headers=['Content-Type'])
    
    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page'
    
    @login_manager.user_loader
    def load_user(user_id):
        """Load user by ID - required by Flask-Login"""
        return User.find_by_id(user_id)
    
    @login_manager.unauthorized_handler
    def unauthorized():
        """Handle unauthorized access"""
        return jsonify({'error': 'Authentication required'}), 401
    
    # Initialize database
    with app.app_context():
        try:
            init_db()
        except Exception as e:
            print(f"Warning: Database initialization failed: {e}")
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(groups_bp, url_prefix='/api')
    app.register_blueprint(items_bp, url_prefix='/api')
    app.register_blueprint(ratings_bp, url_prefix='/api')
    
    TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), 'templates')
    # Serve static files (HTML, CSS, JS)
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/login.html')
    def login_page():
        return render_template('login.html')

    @app.route('/register.html')
    def register_page():
        return render_template('register.html')

    @app.route('/home.html')
    def home_page():
        return render_template('home.html')

    @app.route('/discover.html')
    def discover_page():
        return render_template('discover.html')

    @app.route('/group.html')
    def group_page():
        # group id is passed as ?id=... in the query string; JS reads it.
        return render_template('group.html')

    @app.route('/create-group.html')
    def create_group_page():
        return render_template('create-group.html')
    
    
    # API root route
    @app.route('/api')
    def api_index():
        return jsonify({
            'name': 'RankIt API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'groups': '/api/groups',
                'items': '/api/items',
                'health': '/api/health',
                'docs': '/api/docs'
            }
        }), 200
    
    # Health check
    @app.route('/api/health')
    def health_check():
        """Health check for monitoring"""
        try:
            stats = get_db_stats()
            return jsonify({
                'status': 'healthy',
                'database': 'connected',
                'stats': stats
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected',
                'error': str(e)
            }), 503
    
    # API Documentation
    @app.route('/api/docs')
    def api_docs():
        """API documentation"""
        return jsonify({
            'auth': {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'Login user',
                'POST /api/auth/logout': 'Logout user',
                'GET /api/auth/me': 'Get current user',
                'GET /api/auth/check': 'Check authentication status'
            },
            'groups': {
                'POST /api/groups': 'Create group',
                'GET /api/groups': 'Get all groups',
                'GET /api/groups/:id': 'Get group details',
                'POST /api/groups/:id/join': 'Join group',
                'POST /api/groups/:id/leave': 'Leave group',
                'GET /api/me/groups': 'Get user groups'
            },
            'items': {
                'POST /api/groups/:id/items': 'Add item to group',
                'GET /api/groups/:id/items': 'Get group items',
                'GET /api/items/:id': 'Get item details',
                'DELETE /api/items/:id': 'Delete item (admin)'
            },
            'ratings': {
                'POST /api/items/:id/rate': 'Rate item (1-5 stars)',
                'GET /api/groups/:id/leaderboard': 'Get group leaderboard'
            }
        }), 200
    
    # Error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request'}), 400
    
    @app.errorhandler(401)
    def unauthorized_error(error):
        return jsonify({'error': 'Unauthorized'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Forbidden'}), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app


# Create app instance
app = create_app()


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])
