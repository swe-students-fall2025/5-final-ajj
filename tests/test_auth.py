"""
Authentication tests with Flask-Login
"""
import pytest
from utils.db import users_collection
import utils.db as db_module


class TestRegister:
    """Test user registration"""
    
    def test_register_success(self, client):
        """Test successful user registration"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepass123'
        })
        
        assert response.status_code == 201
        data = response.get_json()
        assert 'user' in data
        assert data['user']['username'] == 'newuser'
        assert data['user']['email'] == 'newuser@example.com'
        assert 'id' in data['user']
        
        # Check user exists in database
        user = users_collection.find_one({'email': 'newuser@example.com'})
        assert user is not None
        assert user['username'] == 'newuser'
    
    def test_register_auto_login(self, client):
        """Test that registration automatically logs user in"""
        # Register
        client.post('/api/auth/register', json={
            'username': 'autouser',
            'email': 'auto@example.com',
            'password': 'password123'
        })
        
        # Check if logged in
        response = client.get('/api/auth/me')
        assert response.status_code == 200
    
    def test_register_duplicate_email(self, client):
        """Test registration with existing email"""
        # Create first user
        client.post('/api/auth/register', json={
            'username': 'user1',
            'email': 'duplicate@example.com',
            'password': 'password123'
        })
        
        # Try to create second user with same email
        response = client.post('/api/auth/register', json={
            'username': 'user2',
            'email': 'duplicate@example.com',
            'password': 'password456'
        })
        
        assert response.status_code == 409
        assert 'error' in response.get_json()
        assert 'already registered' in response.get_json()['error'].lower()
    
    def test_register_duplicate_username(self, client):
        """Test registration with existing username"""
        client.post('/api/auth/register', json={
            'username': 'sameuser',
            'email': 'first@example.com',
            'password': 'password123'
        })
        
        response = client.post('/api/auth/register', json={
            'username': 'sameuser',
            'email': 'second@example.com',
            'password': 'password456'
        })
        
        assert response.status_code == 409
        assert 'username' in response.get_json()['error'].lower()
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email"""
        response = client.post('/api/auth/register', json={
            'username': 'testuser',
            'email': 'notanemail',
            'password': 'password123'
        })
        
        assert response.status_code == 400
        assert 'email' in response.get_json()['error'].lower()
    
    def test_register_short_password(self, client):
        """Test registration with password < 8 characters"""
        response = client.post('/api/auth/register', json={
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'short'
        })
        
        assert response.status_code == 400
        assert 'password' in response.get_json()['error'].lower()
    
    def test_register_short_username(self, client):
        """Test registration with username < 3 characters"""
        response = client.post('/api/auth/register', json={
            'username': 'ab',
            'email': 'test@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 400
        assert 'username' in response.get_json()['error'].lower()
    
    def test_register_invalid_username(self, client):
        """Test registration with invalid username characters"""
        response = client.post('/api/auth/register', json={
            'username': 'user@name',
            'email': 'test@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 400
        assert 'username' in response.get_json()['error'].lower()
    
    def test_register_missing_fields(self, client):
        """Test registration with missing fields"""
        response = client.post('/api/auth/register', json={
            'username': 'testuser'
        })
        
        assert response.status_code == 400
    
    def test_register_empty_body(self, client):
        """Test registration with empty request body"""
        response = client.post('/api/auth/register', json={})
        
        assert response.status_code == 400


class TestLogin:
    """Test user login"""
    
    def test_login_success(self, client):
        """Test successful login"""
        # Register first
        client.post('/api/auth/register', json={
            'username': 'loginuser',
            'email': 'login@example.com',
            'password': 'password123'
        })
        
        # Logout
        client.post('/api/auth/logout')
        
        # Login
        response = client.post('/api/auth/login', json={
            'email': 'login@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'user' in data
        assert data['user']['email'] == 'login@example.com'
        assert 'message' in data
    
    def test_login_sets_session(self, client):
        """Test that login creates session"""
        # Register
        client.post('/api/auth/register', json={
            'username': 'sessionuser',
            'email': 'session@example.com',
            'password': 'password123'
        })
        
        # Logout
        client.post('/api/auth/logout')
        
        # Login
        client.post('/api/auth/login', json={
            'email': 'session@example.com',
            'password': 'password123'
        })
        
        # Check if logged in
        response = client.get('/api/auth/me')
        assert response.status_code == 200
    
    def test_login_wrong_password(self, client):
        """Test login with incorrect password"""
        client.post('/api/auth/register', json={
            'username': 'user',
            'email': 'wrong@example.com',
            'password': 'correctpass'
        })
        
        # Logout
        client.post('/api/auth/logout')
        
        response = client.post('/api/auth/login', json={
            'email': 'wrong@example.com',
            'password': 'wrongpass'
        })
        
        assert response.status_code == 401
        assert 'invalid' in response.get_json()['error'].lower()
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent email"""
        response = client.post('/api/auth/login', json={
            'email': 'nonexistent@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 401
        assert 'invalid' in response.get_json()['error'].lower()
    
    def test_login_missing_fields(self, client):
        """Test login with missing fields"""
        response = client.post('/api/auth/login', json={
            'email': 'test@example.com'
        })
        
        assert response.status_code == 400
    
    def test_login_case_insensitive_email(self, client):
        """Test that email is case-insensitive"""
        client.post('/api/auth/register', json={
            'username': 'caseuser',
            'email': 'case@example.com',
            'password': 'password123'
        })
        
        # Logout
        client.post('/api/auth/logout')
        
        # Login with different case
        response = client.post('/api/auth/login', json={
            'email': 'CASE@EXAMPLE.COM',
            'password': 'password123'
        })
        
        assert response.status_code == 200


class TestAuthFlow:
    """Test authentication flow"""
    
    def test_me_authenticated(self, auth_client):
        """Test getting current user when authenticated"""
        response = auth_client.get('/api/auth/me')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'user' in data
        assert data['user']['email'] == 'test@example.com'
        assert data['user']['username'] == 'testuser'
    
    def test_me_unauthenticated(self, client):
        """Test getting current user when not authenticated"""
        response = client.get('/api/auth/me')
        
        assert response.status_code == 401
    
    def test_logout_success(self, auth_client):
        """Test logout"""
        # Verify logged in
        response = auth_client.get('/api/auth/me')
        assert response.status_code == 200
        
        # Logout
        response = auth_client.post('/api/auth/logout')
        assert response.status_code == 200
        
        # Verify logged out
        response = auth_client.get('/api/auth/me')
        assert response.status_code == 401
    
    def test_logout_unauthenticated(self, client):
        """Test logout when not logged in"""
        response = client.post('/api/auth/logout')
        assert response.status_code == 401
    
    def test_check_auth_authenticated(self, auth_client):
        """Test check auth when authenticated"""
        response = auth_client.get('/api/auth/check')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['authenticated'] is True
        assert 'user' in data
        assert 'username' in data['user']
    
    def test_check_auth_unauthenticated(self, client):
        """Test check auth when not authenticated"""
        response = client.get('/api/auth/check')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['authenticated'] is False


class TestPasswordSecurity:
    """Test password security"""
    
    def test_password_is_hashed(self, client):
        """Test that passwords are hashed in database"""
        client.post('/api/auth/register', json={
            'username': 'hashtest',
            'email': 'hash@example.com',
            'password': 'plaintext123'
        })
        
        # Check database
        user = users_collection.find_one({'email': 'hash@example.com'})
        assert user is not None
        
        # Password should be hashed (bcrypt format)
        assert user['password_hash'] != b'plaintext123'
        assert isinstance(user['password_hash'], bytes)
        assert user['password_hash'].startswith(b'$2b$')
    
    def test_different_users_different_hashes(self, client):
        """Test that same password produces different hashes"""
        client.post('/api/auth/register', json={
            'username': 'user1',
            'email': 'user1@example.com',
            'password': 'samepassword'
        })
        
        client.post('/api/auth/register', json={
            'username': 'user2',
            'email': 'user2@example.com',
            'password': 'samepassword'
        })
        
        user1 = users_collection.find_one({'email': 'user1@example.com'})
        user2 = users_collection.find_one({'email': 'user2@example.com'})
        
        # Same password should produce different hashes (bcrypt salt)
        assert user1['password_hash'] != user2['password_hash']