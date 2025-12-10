"""
Pytest configuration with Flask-Login
"""
import pytest
from app import create_app
from utils.db import users_collection, groups_collection, items_collection, ratings_collection


@pytest.fixture
def app():
    """Create test app"""
    app = create_app('testing')
    
    yield app
    
    # Cleanup
    users_collection.delete_many({})
    groups_collection.delete_many({})
    items_collection.delete_many({})
    ratings_collection.delete_many({})


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create CLI runner"""
    return app.test_cli_runner()


@pytest.fixture
def auth_client(client):
    """Create authenticated client"""
    # Register
    client.post('/api/auth/register', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    
    # Login happens automatically with Flask-Login
    return client


@pytest.fixture
def sample_group(auth_client):
    """Create a sample group"""
    response = auth_client.post('/api/groups', json={
        'name': 'Test Group',
        'description': 'A test group for testing'
    })
    return response.get_json()['group']


@pytest.fixture
def sample_item(auth_client, sample_group):
    """Create a sample item"""
    response = auth_client.post(f'/api/groups/{sample_group["id"]}/items', json={
        'name': 'Test Item',
        'description': 'A test item'
    })
    return response.get_json()['item']