"""
MongoDB connection with proper logging
"""
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from pymongo.errors import ConnectionFailure, OperationFailure
import os
import logging
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get MongoDB URI
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/ranking_app')

# Initialize MongoDB client
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    logger.info("Connected to MongoDB successfully")
except ConnectionFailure as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    raise

# Get database
db_name = 'ranking_app'
if 'test' in MONGO_URI:
    db_name = 'test_ranking_app'

db = client[db_name]

# Collections
users_collection = db.users
groups_collection = db.groups
items_collection = db.items
ratings_collection = db.ratings


def init_db():
    """Initialize database indexes"""
    try:
        logger.info("Initializing database indexes...")
        
        # User indexes
        users_collection.create_index([('email', ASCENDING)], unique=True)
        users_collection.create_index([('username', ASCENDING)], unique=True)
        logger.debug("User indexes created")
        
        # Group indexes
        groups_collection.create_index([('name', ASCENDING)])
        groups_collection.create_index([('created_at', DESCENDING)])
        groups_collection.create_index([('member_count', DESCENDING)])
        groups_collection.create_index([('name', TEXT), ('description', TEXT)])
        groups_collection.create_index([('members', ASCENDING)])
        logger.debug("Group indexes created")
        
        # Item indexes
        items_collection.create_index([('group_id', ASCENDING), ('name', ASCENDING)])
        items_collection.create_index([('created_at', DESCENDING)])
        items_collection.create_index([('avg_rating', DESCENDING), ('rating_count', DESCENDING)])
        items_collection.create_index([('name', TEXT), ('description', TEXT)])
        logger.debug("Item indexes created")
        
        # Rating indexes
        ratings_collection.create_index(
            [('user_id', ASCENDING), ('item_id', ASCENDING), ('group_id', ASCENDING)],
            unique=True
        )
        ratings_collection.create_index([('item_id', ASCENDING)])
        ratings_collection.create_index([('user_id', ASCENDING)])
        ratings_collection.create_index([('group_id', ASCENDING)])
        logger.debug("Rating indexes created")
        
        logger.info("Database initialization complete")
        
    except OperationFailure as e:
        logger.error(f"Error creating indexes: {e}")
        raise


def get_db_stats():
    """Get database statistics"""
    stats = {
        'users': users_collection.count_documents({}),
        'groups': groups_collection.count_documents({}),
        'items': items_collection.count_documents({}),
        'ratings': ratings_collection.count_documents({})
    }
    return stats


def drop_database():
    """Drop entire database - USE WITH CAUTION"""
    client.drop_database(db_name)
    logger.warning(f"Database '{db_name}' dropped")


def seed_sample_data():
    """Seed database with sample data"""
    from datetime import datetime
    from bson import ObjectId
    import bcrypt
    
    logger.info("Seeding sample data...")
    
    # Create sample users
    password_hash = bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt())
    
    user1 = {
        '_id': ObjectId(),
        'username': 'alice',
        'email': 'alice@example.com',
        'password_hash': password_hash,
        'groups_joined': [],
        'created_at': datetime.utcnow()
    }
    
    user2 = {
        '_id': ObjectId(),
        'username': 'bob',
        'email': 'bob@example.com',
        'password_hash': password_hash,
        'groups_joined': [],
        'created_at': datetime.utcnow()
    }
    
    users_collection.insert_many([user1, user2])
    logger.debug("Created 2 sample users")
    
    # Create sample groups
    group1 = {
        '_id': ObjectId(),
        'name': 'Best Music Albums',
        'description': 'Rank your favorite albums of all time',
        'created_by': user1['_id'],
        'members': [user1['_id'], user2['_id']],
        'admins': [user1['_id']],
        'member_count': 2,
        'created_at': datetime.utcnow()
    }
    
    groups_collection.insert_one(group1)
    logger.debug("Created sample group")
    
    logger.info("Sample data seeded successfully")
    logger.info("Login with: alice@example.com / password123")