"""
Group routes matching frontend pages
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.group import Group
from utils.validators import sanitize_input

groups_bp = Blueprint('groups', __name__)


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
        
        # Validate
        if not name or len(name) < 3:
            return jsonify({'error': 'Group name must be at least 3 characters'}), 400
        
        if not description:
            return jsonify({'error': 'Description is required'}), 400
        
        # Create group
        group = Group.create(name, description, current_user.id)
        
        # Add to user's groups
        current_user.update_groups(str(group['_id']), 'add')
        
        return jsonify({
            'message': 'Group created successfully',
            'group': Group.to_dict(group, current_user.id)
        }), 201
        
    except Exception as e:
        print(f"Create group error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@groups_bp.route('/groups', methods=['GET'])
def get_groups():
    """
    Get all groups (discover page)
    
    Frontend: discover.html
    Request: GET /api/groups?q=search&page=1
    """
    try:
        search = request.args.get('q', '').strip()
        page = int(request.args.get('page', 1))
        limit = 20
        skip = (page - 1) * limit
        
        groups = Group.get_all(search, skip, limit)
        
        user_id = current_user.id if current_user.is_authenticated else None
        
        result = [Group.to_dict(g, user_id) for g in groups]
        
        return jsonify({
            'groups': result,
            'page': page,
            'has_more': len(result) == limit
        }), 200
        
    except Exception as e:
        print(f"Get groups error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@groups_bp.route('/groups/<group_id>', methods=['GET'])
def get_group(group_id):
    """
    Get single group details
    
    Frontend: group.html
    Request: GET /api/groups/:id
    """
    try:
        group = Group.find_by_id(group_id)
        
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        user_id = current_user.id if current_user.is_authenticated else None
        
        return jsonify({'group': Group.to_dict(group, user_id)}), 200
        
    except Exception as e:
        print(f"Get group error: {e}")
        return jsonify({'error': 'Invalid group ID'}), 400


@groups_bp.route('/groups/<group_id>/join', methods=['POST'])
@login_required
def join_group(group_id):
    """
    Join a group
    
    Frontend: discover.html (Join button)
    Request: POST /api/groups/:id/join
    """
    try:
        group = Group.find_by_id(group_id)
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
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
    """
    Leave a group
    
    Frontend: discover.html (Leave button)
    Request: POST /api/groups/:id/leave
    """
    try:
        if not Group.is_member(group_id, current_user.id):
            return jsonify({'error': 'Not a member'}), 400
        
        Group.remove_member(group_id, current_user.id)
        current_user.update_groups(group_id, 'remove')
        
        return jsonify({'message': 'Left group successfully'}), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Leave group error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@groups_bp.route('/me/groups', methods=['GET'])
@login_required
def get_my_groups():
    """
    Get user's groups
    
    Frontend: home.html
    Request: GET /api/me/groups
    """
    try:
        groups = Group.get_user_groups(current_user.id)
        result = [Group.to_dict(g, current_user.id) for g in groups]
        
        return jsonify({'groups': result}), 200
        
    except Exception as e:
        print(f"Get my groups error: {e}")
        return jsonify({'error': 'Internal server error'}), 500