"""
Authentication routes using Flask-Login
"""
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models.user import User
from utils.validators import validate_email, validate_password, validate_username, sanitize_input

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register new user
    
    Frontend: register.html
    Request: POST /api/auth/register
    Body: {username, email, password}
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        # Extract inputs
        username = sanitize_input(data.get('username', ''), max_length=30)
        email = sanitize_input(data.get('email', ''), max_length=100)
        password = data.get('password', '')
        
        # Validate username
        valid_username, username_error = validate_username(username)
        if not valid_username:
            return jsonify({'error': username_error}), 400
        
        # Validate email
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password
        valid_password, password_error = validate_password(password)
        if not valid_password:
            return jsonify({'error': password_error}), 400
        
        # Create user
        try:
            user = User.create(username, email, password)
            
            # Auto-login after registration
            login_user(user, remember=True)
            
            return jsonify({
                'message': 'Account created successfully',
                'user': user.to_dict()
            }), 201
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 409
            
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login user
    
    Frontend: login.html
    Request: POST /api/auth/login
    Body: {email, password}
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        email = sanitize_input(data.get('email', ''))
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        # Find user
        user = User.find_by_email(email)
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Verify password
        if not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Login with Flask-Login
        login_user(user, remember=True)
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """
    Logout current user
    
    Frontend: navbar logout button
    Request: POST /api/auth/logout
    """
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """
    Get current authenticated user
    
    Frontend: All authenticated pages
    Request: GET /api/auth/me
    """
    return jsonify({'user': current_user.to_dict()}), 200


@auth_bp.route('/check', methods=['GET'])
def check_auth():
    """
    Check if user is authenticated (for frontend routing)
    
    Request: GET /api/auth/check
    """
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username
            }
        }), 200
    
    return jsonify({'authenticated': False}), 200