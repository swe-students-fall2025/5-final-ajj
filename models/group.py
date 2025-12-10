# models/group.py

"""
Group model - simplified to match frontend
"""
from utils.db import groups_collection
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
            
        return group_dict