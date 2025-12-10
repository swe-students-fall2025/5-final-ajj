"""
Item routes - add items and view leaderboard
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.item import Item
from models.group import Group
from models.rating import Rating
from utils.validators import sanitize_input
from models.rating import Rating # 🟢 ADD THIS
from utils.validators import validate_rating # 🟢 ADD THIS

items_bp = Blueprint('items', __name__)


@items_bp.route('/groups/<group_id>/items', methods=['POST'])
@login_required
def add_item(group_id):
    """
    Add item to group
    
    Frontend: group.html (Add Item modal)
    Request: POST /api/groups/:id/items
    Body: {name, description}
    """
    try:
        # Check membership
        if not Group.is_member(group_id, current_user.id):
            return jsonify({'error': 'Must be a group member to add items'}), 403
        
        data = request.get_json()
        
        name = sanitize_input(data.get('name', ''), max_length=200)
        description = sanitize_input(data.get('description', ''), max_length=500)
        
        # Validate
        if not name or len(name) < 2:
            return jsonify({'error': 'Item name must be at least 2 characters'}), 400
        
        # Create item
        item = Item.create(group_id, name, description, current_user.id)
        
        return jsonify({
            'message': 'Item added successfully',
            'item': Item.to_dict(item)
        }), 201
        
    except Exception as e:
        # 🟢 TEMPORARY DEBUGGING STEP: Return the actual error message
        print(f"Add item error: {e}") 
        return jsonify({'error': f'Internal server error: {e}'}), 500


@items_bp.route('/groups/<group_id>/items', methods=['GET'])
def get_group_items(group_id):
    """
    Get all items in a group (leaderboard)
    
    Frontend: group.html
    Request: GET /api/groups/:id/items?sort=rating
    """
    try:
        sort = request.args.get('sort', 'rating')  # rating, new, name
        
        items = Item.get_by_group(group_id, sort)
        
        # Get user's ratings if logged in
        user_ratings = {}
        if current_user.is_authenticated:
            user_ratings = Rating.get_user_ratings_for_group(current_user.id, group_id)
        
        result = []
        for idx, item in enumerate(items, 1):
            item_dict = Item.to_dict(
                item, 
                user_ratings.get(str(item['_id']))
            )
            item_dict['rank'] = idx  # Add ranking position
            result.append(item_dict)
        
        return jsonify({'items': result}), 200
        
    except Exception as e:
        print(f"Get items error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@items_bp.route('/items/<item_id>', methods=['GET'])
def get_item(item_id):
    """
    Get single item details
    
    Request: GET /api/items/:id
    """
    try:
        item = Item.find_by_id(item_id)
        
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Get user's rating if logged in
        user_rating = None
        if current_user.is_authenticated:
            user_rating = Rating.get_user_rating(current_user.id, item_id)
        
        return jsonify({'item': Item.to_dict(item, user_rating)}), 200
        
    except Exception as e:
        print(f"Get item error: {e}")
        return jsonify({'error': 'Invalid item ID'}), 400


@items_bp.route('/items/<item_id>', methods=['DELETE'])
@login_required
def delete_item(item_id):
    """
    Delete item (admin only)
    
    Request: DELETE /api/items/:id
    """
    try:
        item = Item.find_by_id(item_id)
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Check if user is admin of the group
        group_id = str(item['group_id'])
        if not Group.is_admin(group_id, current_user.id):
            return jsonify({'error': 'Only group admins can delete items'}), 403
        
        # Delete item and its ratings
        Item.delete(item_id)
        Rating.delete_by_item(item_id)
        
        return jsonify({'message': 'Item deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete item error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# In routes/items.py (Add this new function)
@items_bp.route('/items/<item_id>/rate', methods=['POST']) # The route is now in items_bp
@login_required
def rate_item(item_id):
    """
    Rate an item (1-5 stars)

    Frontend: group.html (star rating click)
    Request: POST /api/items/:id/rate
    Body: {score: 1-5}
    """
    try:
        data = request.get_json()
        score = data.get('score')

        # Validate score
        if not validate_rating(score):
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400

        score = int(score)

        # Get item
        item = Item.find_by_id(item_id)
        if not item:
            return jsonify({'error': 'Item not found'}), 404

        group_id = str(item['group_id'])

        # Check membership (still necessary)
        if not Group.is_member(group_id, current_user.id):
            return jsonify({'error': 'Must be a group member to rate items'}), 403

        # Create or update rating
        old_score, new_score = Rating.create_or_update(
            current_user.id, group_id, item_id, score
        )

        # Update item's overall stats
        Item.update_rating_stats(item_id, old_score, new_score)

        # Return updated item
        updated_item = Item.find_by_id(item_id)
        user_rating = Rating.get_user_rating(current_user.id, item_id)

        return jsonify({
            'message': 'Rating submitted successfully',
            'item': Item.to_dict(updated_item, user_rating)
        }), 200

    except Exception as e:
        print(f"Rate item error: {e}")
        return jsonify({'error': 'Internal server error'}), 500