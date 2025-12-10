"""
User model with Flask-Login integration
"""
from flask_login import UserMixin
from utils.db import users_collection
from bson import ObjectId
from bson.errors import InvalidId
import bcrypt
from datetime import datetime


class User(UserMixin):
    """User model compatible with Flask-Login"""
    
    def __init__(self, user_data):
        """Initialize user from MongoDB document"""
        self.user_data = user_data
    
    def get_id(self):
        """Required by Flask-Login - return user ID as string"""
        return str(self.user_data['_id'])
    
    @property
    def id(self):
        """User ID"""
        return str(self.user_data['_id'])
    
    @property
    def username(self):
        """Username"""
        return self.user_data['username']
    
    @property
    def email(self):
        """Email"""
        return self.user_data['email']
    
    @staticmethod
    def create(username, email, password):
        """
        Create a new user with hashed password
        
        Args:
            username (str): Username
            email (str): Email address
            password (str): Plain text password
            
        Returns:
            User: Created user object
            
        Raises:
            ValueError: If user already exists
        """
        # Check if user exists
        if users_collection.find_one({'email': email.lower().strip()}):
            raise ValueError("Email already registered")
        
        if users_collection.find_one({'username': username}):
            raise ValueError("Username already taken")
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create user document
        user_doc = {
            'username': username,
            'email': email.lower().strip(),
            'password_hash': password_hash,
            'groups_joined': [],
            'created_at': datetime.utcnow()
        }
        
        # Insert into database
        result = users_collection.insert_one(user_doc)
        user_doc['_id'] = result.inserted_id
        
        return User(user_doc)
    
    @staticmethod
    def find_by_id(user_id):
        """Find user by ID - Required by Flask-Login"""
        try:
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)
            user_data = users_collection.find_one({'_id': user_id})
            return User(user_data) if user_data else None
        except (InvalidId, TypeError):
            return None
    
    @staticmethod
    def find_by_email(email):
        """Find user by email"""
        user_data = users_collection.find_one({'email': email.lower().strip()})
        return User(user_data) if user_data else None
    
    @staticmethod
    def verify_password(stored_hash, password):
        """Verify password against stored hash"""
        return bcrypt.checkpw(password.encode('utf-8'), stored_hash)
    
    def check_password(self, password):
        """Check if password is correct"""
        return User.verify_password(self.user_data['password_hash'], password)
    
    def update_groups(self, group_id, action='add'):
        """Add or remove group from user's list"""
        if action == 'add':
            users_collection.update_one(
                {'_id': ObjectId(self.id)},
                {'$addToSet': {'groups_joined': group_id}}
            )
            self.user_data['groups_joined'].append(group_id)
        elif action == 'remove':
            users_collection.update_one(
                {'_id': ObjectId(self.id)},
                {'$pull': {'groups_joined': group_id}}
            )
            if group_id in self.user_data['groups_joined']:
                self.user_data['groups_joined'].remove(group_id)
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'groups_joined': self.user_data.get('groups_joined', []),
            'created_at': self.user_data['created_at'].isoformat()
        }