# models/item.py

"""
Item model - things that get ranked in groups
"""
# 🟢 FIX: Import utils.db as a module to resolve import order issues.
import utils.db 
from bson import ObjectId
from datetime import datetime
from bson.errors import InvalidId

class Item:
    """Item model for things being ranked"""
    
    @staticmethod
    def create(group_id, name, description, added_by_id):
        """
        Create new item in a group
        """
        try:
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
            
            # 🟢 FIX: Access collection via module namespace (guaranteed to work)
            result = utils.db.items_collection.insert_one(item) 
            item['_id'] = result.inserted_id
            return item
        except InvalidId as e:
            raise ValueError(f"Invalid ID format provided for item creation: {e}")
    
    @staticmethod
    def find_by_id(item_id):
        """Find item by ID"""
        try:
            # 🟢 FIX: Access collection via module namespace
            return utils.db.items_collection.find_one({'_id': ObjectId(item_id)})
        except InvalidId:
            return None
    
    @staticmethod
    def get_by_group(group_id, sort='rating'):
        """
        Get all items in a group
        """
        try:
            query = {'group_id': ObjectId(group_id)}
            sort_field = 'avg_rating' if sort == 'rating' else 'created_at'
            sort_direction = -1
            
            # 🟢 FIX: Access collection via module namespace
            return list(utils.db.items_collection.find(query).sort([
                (sort_field, sort_direction),
                ('rating_count', -1)
            ]))
        except InvalidId:
            return []

    @staticmethod
    def delete(item_id):
        """Delete item by ID"""
        try:
            # 🟢 FIX: Access collection via module namespace
            return utils.db.items_collection.delete_one({'_id': ObjectId(item_id)}).deleted_count > 0
        except InvalidId:
            return False

    @staticmethod
    def update_rating_stats(item_id, old_rating, new_rating):
        """
        Update item rating stats after a rating is created or updated.
        """
        try:
            # Determine update operation
            update_op = {}
            if old_rating is None:
                # New rating added
                update_op = {'$inc': {'rating_count': 1, 'rating_sum': new_rating}}
            else:
                # Update existing rating - adjust sum only
                diff = new_rating - old_rating
                update_op = {'$inc': {'rating_sum': diff}}
            
            # Perform the update
            if update_op:
                utils.db.items_collection.update_one(
                    {'_id': ObjectId(item_id)},
                    update_op
                )
            
            # Recalculate average
            item = utils.db.items_collection.find_one({'_id': ObjectId(item_id)})
            if item and item.get('rating_count', 0) > 0:
                rating_sum = item.get('rating_sum', 0)
                rating_count = item.get('rating_count', 0)
                
                if rating_count > 0:
                    avg = rating_sum / rating_count
                    utils.db.items_collection.update_one(
                        {'_id': ObjectId(item_id)},
                        {'$set': {'avg_rating': round(avg, 2)}}
                    )
                else: 
                     utils.db.items_collection.update_one(
                        {'_id': ObjectId(item_id)},
                        {'$set': {'avg_rating': 0.0}}
                    )

        except InvalidId:
            pass
    
    @staticmethod
    def to_dict(item, user_rating=None):
        """
        Convert item to dictionary for API responses
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