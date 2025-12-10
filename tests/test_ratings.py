"""
Rating tests
"""
import pytest


class TestRatings:
    """Test rating functionality"""
    
    def test_rate_item_success(self, auth_client, sample_item):
        """Test rating an item"""
        response = auth_client.post(f'/api/items/{sample_item["id"]}/rate', json={
            'score': 5
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'item' in data
        assert data['item']['user_rating'] == 5
    
    def test_update_rating(self, auth_client, sample_item):
        """Test updating an existing rating"""
        # Rate first time
        auth_client.post(f'/api/items/{sample_item["id"]}/rate', json={'score': 3})
        
        # Update rating
        response = auth_client.post(f'/api/items/{sample_item["id"]}/rate', json={'score': 5})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['item']['user_rating'] == 5
    
    def test_rate_invalid_score(self, auth_client, sample_item):
        """Test rating with invalid score"""
        response = auth_client.post(f'/api/items/{sample_item["id"]}/rate', json={
            'score': 6
        })
        
        assert response.status_code == 400
    
    def test_rate_unauthorized(self, client, sample_item):
        """Test rating without authentication"""
        response = client.post(f'/api/items/{sample_item["id"]}/rate', json={
            'score': 5
        })
        
        assert response.status_code == 401
    
    def test_rating_updates_avg(self, auth_client, sample_item):
        """Test that ratings update average correctly"""
        # Rate the item
        auth_client.post(f'/api/items/{sample_item["id"]}/rate', json={'score': 5})
        
        # Get item to check average
        response = auth_client.get(f'/api/items/{sample_item["id"]}')
        item = response.get_json()['item']
        
        assert item['avg_rating'] == 5.0
        assert item['rating_count'] == 1