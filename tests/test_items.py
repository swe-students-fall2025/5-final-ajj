"""
Item tests
"""
import pytest


class TestItems:
    """Test item functionality"""
    
    def test_add_item_success(self, auth_client, sample_group):
        """Test adding item to group"""
        response = auth_client.post(f'/api/groups/{sample_group["id"]}/items', json={
            'name': 'Test Album',
            'description': 'A great album'
        })
        
        assert response.status_code == 201
        data = response.get_json()
        assert 'item' in data
        assert data['item']['name'] == 'Test Album'
    
    def test_add_item_unauthorized(self, client, sample_group):
        """Test adding item without authentication"""
        response = client.post(f'/api/groups/{sample_group["id"]}/items', json={
            'name': 'Test Item',
            'description': 'Test'
        })
        
        assert response.status_code == 401
    
    def test_get_group_items(self, client, sample_group, sample_item):
        """Test getting items in a group"""
        response = client.get(f'/api/groups/{sample_group["id"]}/items')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'items' in data
        assert len(data['items']) > 0
    
    def test_items_sorted_by_rating(self, auth_client, sample_group):
        """Test items are sorted by rating"""
        # Add multiple items
        item1 = auth_client.post(f'/api/groups/{sample_group["id"]}/items', json={
            'name': 'Item 1',
            'description': 'First'
        }).get_json()['item']
        
        item2 = auth_client.post(f'/api/groups/{sample_group["id"]}/items', json={
            'name': 'Item 2',
            'description': 'Second'
        }).get_json()['item']
        
        # Rate them
        auth_client.post(f'/api/items/{item1["id"]}/rate', json={'score': 3})
        auth_client.post(f'/api/items/{item2["id"]}/rate', json={'score': 5})
        
        # Get items
        response = auth_client.get(f'/api/groups/{sample_group["id"]}/items')
        items = response.get_json()['items']
        
        # Item 2 should be ranked higher
        assert items[0]['id'] == item2['id']
        assert items[0]['rank'] == 1