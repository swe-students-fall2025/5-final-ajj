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


# routes/ratings.py

# ... (rest of the file content)

@ratings_bp.route('/groups/<group_id>/leaderboard', methods=['GET'])
def get_leaderboard(group_id):
    """
    Get group leaderboard (sorted by rating)
    
    Frontend: group.html (default view)
    Request: GET /api/groups/:id/leaderboard
    """
    try:
        # Item.get_by_group sorts by 'rating' which puts unrated items (avg_rating 0.0) at the bottom.
        items = Item.get_by_group(group_id, sort='rating')
        
        # Get user's ratings if logged in
        user_ratings = {}
        if current_user.is_authenticated:
            user_ratings = Rating.get_user_ratings_for_group(current_user.id, group_id)
        
        leaderboard = []
        # 🟢 FIX: NO FILTER! We show all items, letting the sort order handle placement.
        for rank, item in enumerate(items, 1):
            item_dict = Item.to_dict(item, user_ratings.get(str(item['_id'])))
            item_dict['rank'] = rank
            leaderboard.append(item_dict)
        
        return jsonify({'leaderboard': leaderboard}), 200
        
    except Exception as e:
        print(f"Get leaderboard error: {e}")
        return jsonify({'error': 'Internal server error'}), 500