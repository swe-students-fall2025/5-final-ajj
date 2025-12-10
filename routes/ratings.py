"""
Rating routes - rate items with stars
"""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.rating import Rating
from models.item import Item
from models.group import Group
from utils.validators import validate_rating

ratings_bp = Blueprint('ratings', __name__)


@ratings_bp.route('/items/<item_id>/rate', methods=['POST'])
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
        
        # Check membership
        if not Group.is_member(group_id, current_user.id):
            return jsonify({'error': 'Must be a group member to rate items'}), 403
        
        # Create or update rating
        old_score, new_score = Rating.create_or_update(
            current_user.id, 
            group_id, 
            item_id, 
            score
        )
        
        # Update item statistics
        Item.update_rating_stats(item_id, new_score, old_score)
        
        # Get updated item
        updated_item = Item.find_by_id(item_id)
        user_rating = Rating.get_user_rating(current_user.id, item_id)
        
        return jsonify({
            'message': 'Rating submitted successfully',
            'item': Item.to_dict(updated_item, user_rating)
        }), 200
        
    except Exception as e:
        print(f"Rate item error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@ratings_bp.route('/groups/<group_id>/leaderboard', methods=['GET'])
def get_leaderboard(group_id):
    """
    Get group leaderboard (sorted by rating)
    
    Frontend: group.html (default view)
    Request: GET /api/groups/:id/leaderboard
    """
    try:
        items = Item.get_by_group(group_id, sort='rating')
        
        # Get user's ratings if logged in
        user_ratings = {}
        if current_user.is_authenticated:
            user_ratings = Rating.get_user_ratings_for_group(current_user.id, group_id)
        
        leaderboard = []
        for rank, item in enumerate(items, 1):
            if item.get('rating_count', 0) > 0:  # Only include rated items
                item_dict = Item.to_dict(item, user_ratings.get(str(item['_id'])))
                item_dict['rank'] = rank
                leaderboard.append(item_dict)
        
        return jsonify({'leaderboard': leaderboard}), 200
        
    except Exception as e:
        print(f"Leaderboard error: {e}")
        return jsonify({'error': 'Internal server error'}), 500