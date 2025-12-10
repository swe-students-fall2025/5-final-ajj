"""
Rating model - user ratings for items
"""
from utils.db import ratings_collection
from bson import ObjectId
from datetime import datetime


class Rating:
    """Rating model for 1-5 star ratings"""
    
    @staticmethod
    def create_or_update(user_id, group_id, item_id, score):
        """
        Create or update a rating
        
        Args:
            user_id (str): User ID
            group_id (str): Group ID
            item_id (str): Item ID
            score (int): Rating score (1-5)
            
        Returns:
            tuple: (old_score, new_score) - old_score is None if creating new
        """
        # Check if rating exists
        existing = ratings_collection.find_one({
            'user_id': ObjectId(user_id),
            'item_id': ObjectId(item_id),
            'group_id': ObjectId(group_id)
        })
        
        if existing:
            # Update existing rating
            old_score = existing['score']
            ratings_collection.update_one(
                {'_id': existing['_id']},
                {
                    '$set': {
                        'score': score,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            return old_score, score
        else:
            # Create new rating
            rating = {
                'user_id': ObjectId(user_id),
                'group_id': ObjectId(group_id),
                'item_id': ObjectId(item_id),
                'score': score,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()  # ← ADD THIS
            }
            ratings_collection.insert_one(rating)
            return None, score
    
    @staticmethod
    def get_user_rating(user_id, item_id):
        """
        Get user's rating for an item
        
        Args:
            user_id (str): User ID
            item_id (str): Item ID
            
        Returns:
            dict or None: Rating document if exists
        """
        return ratings_collection.find_one({
            'user_id': ObjectId(user_id),
            'item_id': ObjectId(item_id)
        })
    
    @staticmethod
    def get_user_ratings_for_group(user_id, group_id):
        """
        Get all user's ratings for items in a group
        
        Args:
            user_id (str): User ID
            group_id (str): Group ID
            
        Returns:
            dict: Map of item_id -> rating
        """
        ratings = ratings_collection.find({
            'user_id': ObjectId(user_id),
            'group_id': ObjectId(group_id)
        })
        
        return {
            str(r['item_id']): r
            for r in ratings
        }
    
    @staticmethod
    def delete_by_item(item_id):
        """Delete all ratings for an item (when item is deleted)"""
        result = ratings_collection.delete_many({'item_id': ObjectId(item_id)})
        return result.deleted_count