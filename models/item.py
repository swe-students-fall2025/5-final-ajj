"""
Item model - things that get ranked in groups
"""
from utils.db import items_collection
from bson import ObjectId
from datetime import datetime


class Item:
    """Item model for things being ranked"""
    
    @staticmethod
    def create(group_id, name, description, added_by_id):
        """
        Create new item in a group
        
        Args:
            group_id (str): Group ID
            name (str): Item name
            description (str): Item description (optional)
            added_by_id (str): User ID who added it
            
        Returns:
            dict: Created item document
        """
        item = {
            'group_id': ObjectId(group_id),
            'name': name,
            'description': description or '',
            'added_by': ObjectId(added_by_id),
            'created_at': datetime.utcnow(),
            'rating_count': 0,
            'rating_sum': 0,
            'avg_rating': 0.0
        }
        
        result = items_collection.insert_one(item)
        item['_id'] = result.inserted_id
        return item
    
    @staticmethod
    def find_by_id(item_id):
        """Find item by ID"""
        return items_collection.find_one({'_id': ObjectId(item_id)})
    
    @staticmethod
    def get_by_group(group_id, sort='rating'):
        """
        Get all items in a group
        
        Args:
            group_id (str): Group ID
            sort (str): Sort method - 'rating' (default), 'new', 'name'
            
        Returns:
            list: List of items
        """
        query = {'group_id': ObjectId(group_id)}
        
        # Sort options
        sort_options = {
            'rating': [('avg_rating', -1), ('rating_count', -1)],  # Best rated first
            'new': [('created_at', -1)],  # Newest first
            'name': [('name', 1)]  # Alphabetical
        }
        
        sort_by = sort_options.get(sort, sort_options['rating'])
        
        return list(items_collection.find(query).sort(sort_by))
    
    @staticmethod
    def delete(item_id):
        """Delete item (admin only)"""
        result = items_collection.delete_one({'_id': ObjectId(item_id)})
        return result.deleted_count > 0
    
    @staticmethod
    def update_rating_stats(item_id, new_rating, old_rating=None):
        """
        Update item's rating statistics after a rating is added/changed
        
        Args:
            item_id (str): Item ID
            new_rating (int): New rating value (1-5)
            old_rating (int, optional): Previous rating value if updating
        """
        if old_rating is None:
            # New rating - increment count and add to sum
            items_collection.update_one(
                {'_id': ObjectId(item_id)},
                {
                    '$inc': {
                        'rating_count': 1,
                        'rating_sum': new_rating
                    }
                }
            )
        else:
            # Update existing rating - adjust sum only
            diff = new_rating - old_rating
            items_collection.update_one(
                {'_id': ObjectId(item_id)},
                {'$inc': {'rating_sum': diff}}
            )
        
        # Recalculate average
        item = items_collection.find_one({'_id': ObjectId(item_id)})
        if item and item['rating_count'] > 0:
            avg = item['rating_sum'] / item['rating_count']
            items_collection.update_one(
                {'_id': ObjectId(item_id)},
                {'$set': {'avg_rating': round(avg, 2)}}
            )
    
    @staticmethod
    def to_dict(item, user_rating=None):
        """
        Convert item to dictionary for API responses
        
        Args:
            item (dict): Item document
            user_rating (dict, optional): User's rating for this item
            
        Returns:
            dict: Formatted item data
        """
        return {
            'id': str(item['_id']),
            'name': item['name'],
            'description': item.get('description', ''),
            'avg_rating': item.get('avg_rating', 0),
            'rating_count': item.get('rating_count', 0),
            'created_at': item['created_at'].isoformat(),
            'user_rating': user_rating['score'] if user_rating else None
        }