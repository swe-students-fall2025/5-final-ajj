"""
Group tests (simplified - no categories)
"""
import pytest
from utils.db import groups_collection


class TestCreateGroup:
    """Test group creation"""
    
    def test_create_group_success(self, auth_client):
        """Test creating a group"""
        response = auth_client.post('/api/groups', json={
            'name': 'Test Food Group',
            'description': 'Testing food items'
        })
        
        assert response.status_code == 201
        data = response.get_json()
        assert 'group' in data
        assert data['group']['name'] == 'Test Food Group'
        assert data['group']['description'] == 'Testing food items'
        assert data['group']['member_count'] == 1
        assert data['group']['is_member'] is True
        assert data['group']['is_admin'] is True
    
    def test_create_group_adds_to_user(self, auth_client):
        """Test that creating group adds it to user's groups"""
        # Create group
        response = auth_client.post('/api/groups', json={
            'name': 'My Group',
            'description': 'Test group'
        })
        group_id = response.get_json()['group']['id']
        
        # Check user's groups
        response = auth_client.get('/api/me/groups')
        groups = response.get_json()['groups']
        
        assert len(groups) > 0
        assert any(g['id'] == group_id for g in groups)
    
    def test_create_group_unauthorized(self, client):
        """Test creating group without authentication"""
        response = client.post('/api/groups', json={
            'name': 'Test Group',
            'description': 'Test'
        })
        
        assert response.status_code == 401
    
    def test_create_group_short_name(self, auth_client):
        """Test creating group with name < 3 characters"""
        response = auth_client.post('/api/groups', json={
            'name': 'AB',
            'description': 'Test'
        })
        
        assert response.status_code == 400
        assert 'name' in response.get_json()['error'].lower()
    
    def test_create_group_no_description(self, auth_client):
        """Test creating group without description"""
        response = auth_client.post('/api/groups', json={
            'name': 'Test Group'
        })
        
        assert response.status_code == 400
        assert 'description' in response.get_json()['error'].lower()
    
    def test_create_group_empty_name(self, auth_client):
        """Test creating group with empty name"""
        response = auth_client.post('/api/groups', json={
            'name': '   ',
            'description': 'Test'
        })
        
        assert response.status_code == 400
    
    def test_create_group_stores_creator(self, auth_client):
        """Test that group stores creator info"""
        response = auth_client.post('/api/groups', json={
            'name': 'Creator Test',
            'description': 'Testing creator'
        })
        
        group_id = response.get_json()['group']['id']
        
        # Check database
        from bson import ObjectId
        group = groups_collection.find_one({'_id': ObjectId(group_id)})
        
        assert group is not None
        assert 'created_by' in group
        assert 'admins' in group
        assert 'members' in group


class TestBrowseGroups:
    """Test browsing public groups"""
    
    def test_browse_groups(self, client, sample_group):
        """Test browsing public groups"""
        response = client.get('/api/groups')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'groups' in data
        assert isinstance(data['groups'], list)
    
    def test_browse_groups_pagination(self, client):
        """Test pagination in browse"""
        response = client.get('/api/groups?page=1')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'page' in data
        assert data['page'] == 1
        assert 'has_more' in data
    
    def test_browse_groups_search(self, auth_client):
        """Test searching groups"""
        # Create groups with different names
        auth_client.post('/api/groups', json={
            'name': 'Pizza Lovers',
            'description': 'Best pizza places'
        })
        
        auth_client.post('/api/groups', json={
            'name': 'Burger Fans',
            'description': 'Best burgers'
        })
        
        # Search for pizza
        response = auth_client.get('/api/groups?q=pizza')
        
        assert response.status_code == 200
        groups = response.get_json()['groups']
        
        # Should find Pizza Lovers
        assert any('pizza' in g['name'].lower() for g in groups)
    
    def test_browse_shows_membership_status(self, auth_client, sample_group):
        """Test that browse shows if user is member"""
        response = auth_client.get('/api/groups')
        
        groups = response.get_json()['groups']
        
        # Find our sample group
        our_group = next(g for g in groups if g['id'] == sample_group['id'])
        
        assert 'is_member' in our_group
        assert our_group['is_member'] is True


class TestGroupDetails:
    """Test getting group details"""
    
    def test_get_group_details(self, client, sample_group):
        """Test getting group details"""
        response = client.get(f'/api/groups/{sample_group["id"]}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'group' in data
        assert data['group']['id'] == sample_group['id']
        assert data['group']['name'] == sample_group['name']
    
    def test_get_group_invalid_id(self, client):
        """Test getting group with invalid ID"""
        response = client.get('/api/groups/invalid-id')
        
        assert response.status_code == 400
    
    def test_get_group_not_found(self, client):
        """Test getting non-existent group"""
        response = client.get('/api/groups/507f1f77bcf86cd799439011')
        
        assert response.status_code == 404
    
    def test_get_group_shows_membership(self, auth_client, sample_group):
        """Test that group details show membership status"""
        response = auth_client.get(f'/api/groups/{sample_group["id"]}')
        
        group = response.get_json()['group']
        
        assert 'is_member' in group
        assert 'is_admin' in group


class TestJoinGroup:
    """Test joining groups"""
    
    def test_join_group_success(self, client, sample_group):
        """Test joining a group"""
        # Register new user
        client.post('/api/auth/register', json={
            'username': 'joiner',
            'email': 'joiner@example.com',
            'password': 'password123'
        })
        
        # Join group
        response = client.post(f'/api/groups/{sample_group["id"]}/join')
        
        assert response.status_code == 200
        assert 'message' in response.get_json()
    
    def test_join_group_unauthorized(self, client, sample_group):
        """Test joining group without authentication"""
        response = client.post(f'/api/groups/{sample_group["id"]}/join')
        
        assert response.status_code == 401
    
    def test_join_group_already_member(self, auth_client, sample_group):
        """Test joining group when already a member"""
        response = auth_client.post(f'/api/groups/{sample_group["id"]}/join')
        
        assert response.status_code == 400
        assert 'already' in response.get_json()['error'].lower()
    
    def test_join_group_not_found(self, auth_client):
        """Test joining non-existent group"""
        response = auth_client.post('/api/groups/507f1f77bcf86cd799439011/join')
        
        assert response.status_code == 404
    
    def test_join_group_updates_count(self, auth_client, sample_group):
        """Test that joining updates member count"""
        # Create second user
        auth_client.post('/api/auth/logout')
        auth_client.post('/api/auth/register', json={
            'username': 'user2',
            'email': 'user2@example.com',
            'password': 'password123'
        })
        
        # Get initial count
        response = auth_client.get(f'/api/groups/{sample_group["id"]}')
        initial_count = response.get_json()['group']['member_count']
        
        # Join
        auth_client.post(f'/api/groups/{sample_group["id"]}/join')
        
        # Check updated count
        response = auth_client.get(f'/api/groups/{sample_group["id"]}')
        new_count = response.get_json()['group']['member_count']
        
        assert new_count == initial_count + 1


class TestLeaveGroup:
    """Test leaving groups"""
    
    def test_leave_group_success(self, auth_client, sample_group):
        """Test leaving a group"""
        # Create second user and join
        auth_client.post('/api/auth/logout')
        auth_client.post('/api/auth/register', json={
            'username': 'leaver',
            'email': 'leaver@example.com',
            'password': 'password123'
        })
        
        auth_client.post(f'/api/groups/{sample_group["id"]}/join')
        
        # Leave
        response = auth_client.post(f'/api/groups/{sample_group["id"]}/leave')
        
        assert response.status_code == 200
    
    def test_leave_group_unauthorized(self, client, sample_group):
        """Test leaving group without authentication"""
        response = client.post(f'/api/groups/{sample_group["id"]}/leave')
        
        assert response.status_code == 401
    
    def test_leave_group_not_member(self, auth_client):
        """Test leaving group when not a member"""
        # Create another user's group
        auth_client.post('/api/auth/logout')
        auth_client.post('/api/auth/register', json={
            'username': 'other',
            'email': 'other@example.com',
            'password': 'password123'
        })
        
        response = auth_client.post('/api/groups', json={
            'name': 'Other Group',
            'description': 'Another group'
        })
        group_id = response.get_json()['group']['id']
        
        # Try to leave as different user
        auth_client.post('/api/auth/logout')
        auth_client.post('/api/auth/register', json={
            'username': 'another',
            'email': 'another@example.com',
            'password': 'password123'
        })
        
        response = auth_client.post(f'/api/groups/{group_id}/leave')
        
        assert response.status_code == 400
    
    def test_creator_cannot_leave(self, auth_client, sample_group):
        """Test that group creator cannot leave"""
        response = auth_client.post(f'/api/groups/{sample_group["id"]}/leave')
        
        assert response.status_code == 400
        assert 'creator' in response.get_json()['error'].lower()


class TestMyGroups:
    """Test getting user's groups"""
    
    def test_get_my_groups(self, auth_client, sample_group):
        """Test getting user's groups"""
        response = auth_client.get('/api/me/groups')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'groups' in data
        assert isinstance(data['groups'], list)
        assert len(data['groups']) > 0
    
    def test_get_my_groups_unauthorized(self, client):
        """Test getting groups without authentication"""
        response = client.get('/api/me/groups')
        
        assert response.status_code == 401
    
    def test_my_groups_shows_membership(self, auth_client, sample_group):
        """Test that my groups show membership info"""
        response = auth_client.get('/api/me/groups')
        
        groups = response.get_json()['groups']
        
        for group in groups:
            assert 'is_member' in group
            assert group['is_member'] is True