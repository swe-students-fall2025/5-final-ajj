# models/group.py

"""
Group model - simplified to match frontend
"""
from utils.db import groups_collection
import utils.db
from bson import ObjectId
from datetime import datetime


class Group:
    """Group model for ranking communities"""
    
    @staticmethod
    def create(name, description, created_by_id):
        """
        Create new group
        
        Args:
            name (str): Group name
            description (str): Group description
            created_by_id (str): User ID of creator
            
        Returns:
            dict: Created group document
        """
        group = {
            'name': name,
            'description': description,
            'created_by': ObjectId(created_by_id),
            'members': [ObjectId(created_by_id)],
            'admins': [ObjectId(created_by_id)],
            'member_count': 1,
            'created_at': datetime.utcnow()
        }
        
        result = groups_collection.insert_one(group)
        group['_id'] = result.inserted_id
        return group
    
    @staticmethod
    def find_by_id(group_id):
        """Find group by ID"""
        return groups_collection.find_one({'_id': ObjectId(group_id)})
    
    @staticmethod
    def get_all(search=None, skip=0, limit=20):
        """
        Get all groups with optional search
        
        Args:
            search (str, optional): Search query
            skip (int): Number to skip (pagination)
            limit (int): Number to return
            
        Returns:
            list: List of group documents
        """
        query = {}
        if search:
            query['name'] = {'$regex': search, '$options': 'i'}
        
        # NOTE: .skip().limit() only works reliably if the collection is indexed
        return list(groups_collection.find(query).skip(skip).limit(limit))

    # ==========================================================
    # 🐛 FIX: MISSING FUNCTION ADDED HERE
    # ==========================================================
    @staticmethod
    def get_user_groups(user_id):
        """
        Get all groups a user is a member of
        
        Args:
            user_id (str): ID of the user
            
        Returns:
            list: List of group documents
        """
        # Finds all groups where the 'members' array contains the user's ObjectId
        # The .find() returns a Cursor, which is converted to a list for iteration
        return list(groups_collection.find({'members': ObjectId(user_id)}))
    # ==========================================================
    
    @staticmethod
    def is_member(group_id, user_id):
        """Check if user is a member of the group"""
        count = groups_collection.count_documents({
            '_id': ObjectId(group_id),
            'members': ObjectId(user_id)
        })
        return count > 0

    @staticmethod
    def is_admin(group_id, user_id):
        """Check if user is an admin of the group"""
        count = groups_collection.count_documents({
            '_id': ObjectId(group_id),
            'admins': ObjectId(user_id)
        })
        return count > 0

    @staticmethod
    def add_member(group_id, user_id):
        """Add member to group"""
        result = groups_collection.update_one(
            {'_id': ObjectId(group_id)},
            {
                '$addToSet': {'members': ObjectId(user_id)},
                '$inc': {'member_count': 1}
            }
        )
        return result.modified_count > 0
    
    @staticmethod
    def remove_member(group_id, user_id):
        """Remove member from group"""
        # Don't allow creator to leave
        group = Group.find_by_id(group_id)
        if group and str(group['created_by']) == str(user_id):
            raise ValueError("Group creator cannot leave")
        
        result = groups_collection.update_one(
            {'_id': ObjectId(group_id)},
            {
                '$pull': {'members': ObjectId(user_id)},
                '$inc': {'member_count': -1}
            }
        )
        return result.modified_count > 0
    @staticmethod
    def kick_member(group_id, user_id, admin_id):
        """
        Kick a member from group (admin only)
        
        Args:
            group_id (str): Group ID
            user_id (str): User ID to kick
            admin_id (str): Admin performing the action
            
        Returns:
            bool: True if successful
            
        Raises:
            ValueError: If user is creator or admin is not authorized
        """
        group = Group.find_by_id(group_id)
        if not group:
            raise ValueError("Group not found")
        
        # Check if requester is admin
        if ObjectId(admin_id) not in group.get('admins', []):
            raise ValueError("Only admins can kick members")
        
        # Cannot kick the group creator
        if str(group['created_by']) == str(user_id):
            raise ValueError("Cannot kick the group creator")
        
        # Cannot kick other admins
        if ObjectId(user_id) in group.get('admins', []):
            raise ValueError("Cannot kick other admins")
        
        result = groups_collection.update_one(
            {'_id': ObjectId(group_id)},
            {
                '$pull': {'members': ObjectId(user_id)},
                '$inc': {'member_count': -1}
            }
        )
        return result.modified_count > 0
    @staticmethod
    def delete(group_id):
        """
        Delete a group and all associated data
        
        Args:
            group_id (str): Group ID
            
        Returns:
            bool: True if successful
        """
        try:
            # Delete the group
            result = groups_collection.delete_one({'_id': ObjectId(group_id)})
            
            if result.deleted_count > 0:
                # Clean up associated items and ratings
                from models.item import Item
                from models.rating import Rating
                
                # Get all items in this group
                items = Item.get_by_group(group_id)
                
                # Delete all ratings for these items
                for item in items:
                    Rating.delete_by_item(str(item['_id']))
                
                # Delete all items in the group
                utils.db.items_collection.delete_many({'group_id': ObjectId(group_id)})
                
                return True
            return False
        except Exception as e:
            print(f"Delete group error: {e}")
            return False
    @staticmethod
    def to_dict(group, user_id=None):
        """Convert group to dictionary for API responses"""
        group_dict = {
            'id': str(group['_id']),
            'name': group['name'],
            'description': group['description'],
            'member_count': group.get('member_count', len(group.get('members', []))),
            'created_at': group['created_at'].isoformat()
        }
        
        if user_id:
            group_dict['is_member'] = ObjectId(user_id) in group.get('members', [])
            group_dict['is_admin'] = ObjectId(user_id) in group.get('admins', [])
            group_dict['is_owner'] = str(group.get('created_by')) == str(user_id)
            group_dict['isOwner'] = str(group.get('created_by')) == str(user_id)
        return group_dict