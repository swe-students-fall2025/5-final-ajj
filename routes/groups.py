# routes/groups.py

"""
Group routes matching frontend pages
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.group import Group
from models.item import Item   # 🔥 REQUIRED for editing items
from utils.validators import sanitize_input
from utils.db import db        # 🔥 REQUIRED if Item uses db.save or db.session

groups_bp = Blueprint('groups', __name__)


# 🟢 NEW: Route for the Discover page to get ALL groups
@groups_bp.route('/groups', methods=['GET'])
def get_all_groups():
    """
    Get all groups (for Discover page)
    
    Frontend: discover.html
    Request: GET /api/groups
    """
    try:
        groups = Group.get_all(search=request.args.get('q')) 
        
        user_id = current_user.id if current_user.is_authenticated else None
        result = [Group.to_dict(g, user_id) for g in groups]
        
        return jsonify({'groups': result}), 200
        
    except Exception as e:
        print(f"Get all groups error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@groups_bp.route('/groups', methods=['POST'])
@login_required
def create_group():
    """
    Create new group
    
    Frontend: create-group.html
    Request: POST /api/groups
    Body: {name, description}
    """
    try:
        data = request.get_json()
        
        name = sanitize_input(data.get('name', ''), max_length=100)
        description = sanitize_input(data.get('description', ''), max_length=500)
        
        if not name or len(name) < 3:
            return jsonify({'error': 'Group name must be at least 3 characters'}), 400
        
        if not description:
            return jsonify({'error': 'Description is required'}), 400
        
        group = Group.create(name, description, current_user.id)
        current_user.update_groups(str(group['_id']), 'add') 
        
        return jsonify({
            'message': 'Group created successfully',
            'group': Group.to_dict(group, current_user.id)
        }), 201
        
    except Exception as e:
        print(f"Create group error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@groups_bp.route('/groups/<group_id>', methods=['GET'])
def get_group(group_id):
    """
    Get single group details
    """
    try:
        group = Group.find_by_id(group_id)
        
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        user_id = current_user.id if current_user.is_authenticated else None
        
        return jsonify(Group.to_dict(group, user_id)), 200
        
    except Exception as e:
        print(f"Get group error: {e}")
        return jsonify({'error': 'Invalid group ID'}), 400


# 🟢 Delete group route (Creator Only)
@groups_bp.route('/groups/<group_id>', methods=['DELETE'])
@login_required
def delete_group(group_id):
    """
    Delete group (CREATOR ONLY)
    """
    try:
        group = Group.find_by_id(group_id)
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        if str(group['created_by']) != current_user.id:
            return jsonify({'error': 'Only the group creator can delete the group'}), 403
            
        Group.delete(group_id) 
        
        return jsonify({'message': 'Group and all associated data deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete group error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@groups_bp.route('/groups/<group_id>/join', methods=['POST'])
@login_required
def join_group(group_id):
    try:
        if Group.is_member(group_id, current_user.id):
            return jsonify({'error': 'Already a member'}), 400
        
        Group.add_member(group_id, current_user.id)
        current_user.update_groups(group_id, 'add')
        
        return jsonify({'message': 'Joined group successfully'}), 200
        
    except Exception as e:
        print(f"Join group error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@groups_bp.route('/groups/<group_id>/leave', methods=['POST'])
@login_required
def leave_group(group_id):
    try:
        if not Group.is_member(group_id, current_user.id):
            return jsonify({'error': 'Not a member'}), 400
        
        Group.remove_member(group_id, current_user.id)
        current_user.update_groups(group_id, 'remove')
        
        return jsonify({'message': 'Left group successfully'}), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        print(f"Leave group error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@groups_bp.route('/me/groups', methods=['GET'])
@login_required
def get_my_groups():
    try:
        groups = Group.get_user_groups(current_user.id)
        result = [Group.to_dict(g, current_user.id) for g in groups]
        
        return jsonify({'groups': result}), 200
        
    except Exception as e:
        print(f"Get my groups error: {e}")
        return jsonify({'error': 'Internal server error'}), 500



# 🔥🔥🔥 NEW: EDIT ITEM ROUTE (Creator Only) 🔥🔥🔥
@groups_bp.route("/groups/<group_id>/items/<item_id>", methods=["PUT"])
@login_required
def update_item(group_id, item_id):
    """
    Edit an item in a group (Group Creator Only)
    Frontend: group.html (edit modal)
    """
    try:
        data = request.get_json() or {}
        name = sanitize_input(data.get("name", ""), max_length=100)
        description = sanitize_input(data.get("description", ""), max_length=500)

        if not name:
            return jsonify({"error": "Item name cannot be empty."}), 400

        # Load item
        item = Item.find_by_id(item_id)
        if not item or str(item["group_id"]) != str(group_id):
            return jsonify({"error": "Item not found"}), 404

        # Load group and ensure user is creator
        group = Group.find_by_id(group_id)
        if not group:
            return jsonify({"error": "Group not found"}), 404

        if str(group["created_by"]) != current_user.id:
            return jsonify({"error": "Only the group creator can edit items."}), 403

        # Update item
        item["name"] = name
        item["description"] = description
        Item.update(item_id, item)     # Your models use update() method

        return jsonify({"message": "Item updated successfully"}), 200

    except Exception as e:
        print(f"Update item error: {e}")
        return jsonify({"error": "Internal server error"}), 500
