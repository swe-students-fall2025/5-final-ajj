"""
MongoDB connection with safe initialization and proper logging
"""

import os
import logging
import certifi
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from pymongo.errors import ConnectionFailure, OperationFailure
from dotenv import load_dotenv


# --- Load .env from project root ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

# --- Setup logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# --- Read Mongo URI from env (with fallback) ---
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    MONGO_URI = "mongodb://localhost:27017/ranking_app"
    logger.warning("MONGO_URI not set in environment; using default localhost URI.")
else:
    # Avoid logging full credentials
    logger.info("MONGO_URI loaded from environment.")

# --- Initialize MongoDB client with error handling ---
client = None
db = None
users_collection = None
groups_collection = None
items_collection = None
ratings_collection = None

try:
    logger.info("Connecting to MongoDB...")
    
    # Connection options for production
    client_options = {
        'serverSelectionTimeoutMS': 5000,
    }
    
    # Add TLS if connection string includes it (Digital Ocean requires this)
    if 'tls=true' in MONGO_URI.lower() or 'ssl=true' in MONGO_URI.lower():
        client_options['tls'] = True
        client_options['tlsAllowInvalidCertificates'] = False
    
    client = MongoClient(MONGO_URI, **client_options)
    
    # Test connection - but DON'T fail module import if it fails
    client.admin.command("ping")
    logger.info("Connected to MongoDB successfully.")
    
    # --- Select database ---
    db_name = "ranking_app"
    if "test" in MONGO_URI:
        db_name = "test_ranking_app"
    
    db = client[db_name]
    
    # Collections
    users_collection = db.users
    groups_collection = db.groups
    items_collection = db.items
    ratings_collection = db.ratings
    
except ConnectionFailure as e:
    logger.error(f"Failed to connect to MongoDB during import: {e}")
    logger.error("Application will start but database operations will fail.")
    logger.error("Make sure MONGO_URI is set correctly in your environment variables.")
    # DON'T raise - let the module import succeed
    # The health check and init_db will catch this later
except Exception as e:
    logger.error(f"Unexpected error connecting to MongoDB: {e}")
    logger.error("Application will start but database operations will fail.")
    # DON'T raise - let the module import succeed


def init_db():
    """Initialize database indexes"""
    if client is None or db is None:
        raise ConnectionFailure("Cannot initialize database - MongoDB client not connected. Check MONGO_URI environment variable.")
    
    try:
        logger.info("Initializing database indexes...")

        # User indexes
        users_collection.create_index([("email", ASCENDING)], unique=True)
        users_collection.create_index([("username", ASCENDING)], unique=True)
        logger.debug("User indexes created")

        # Group indexes
        groups_collection.create_index([("name", ASCENDING)])
        groups_collection.create_index([("created_at", DESCENDING)])
        groups_collection.create_index([("member_count", DESCENDING)])
        groups_collection.create_index([("name", TEXT), ("description", TEXT)])
        groups_collection.create_index([("members", ASCENDING)])
        logger.debug("Group indexes created")

        # Item indexes
        items_collection.create_index([("group_id", ASCENDING), ("name", ASCENDING)])
        items_collection.create_index([("created_at", DESCENDING)])
        items_collection.create_index(
            [("avg_rating", DESCENDING), ("rating_count", DESCENDING)]
        )
        items_collection.create_index([("name", TEXT), ("description", TEXT)])
        logger.debug("Item indexes created")

        # Rating indexes
        ratings_collection.create_index(
            [("user_id", ASCENDING), ("item_id", ASCENDING), ("group_id", ASCENDING)],
            unique=True,
        )
        ratings_collection.create_index([("item_id", ASCENDING)])
        ratings_collection.create_index([("user_id", ASCENDING)])
        ratings_collection.create_index([("group_id", ASCENDING)])
        logger.debug("Rating indexes created")

        logger.info("Database initialization complete")

    except OperationFailure as e:
        logger.error(f"Error creating indexes: {e}")
        raise


def get_db_stats():
    """Get database statistics"""
    if client is None or db is None:
        raise ConnectionFailure("Cannot get stats - MongoDB client not connected")
    
    stats = {
        "users": users_collection.count_documents({}),
        "groups": groups_collection.count_documents({}),
        "items": items_collection.count_documents({}),
        "ratings": ratings_collection.count_documents({}),
    }
    return stats


def drop_database():
    """Drop entire database - USE WITH CAUTION"""
    if client is None or db is None:
        raise ConnectionFailure("Cannot drop database - MongoDB client not connected")
    
    client.drop_database(db_name)
    logger.warning(f"Database '{db_name}' dropped")


def seed_sample_data():
    """Seed database with sample data"""
    if client is None or db is None:
        raise ConnectionFailure("Cannot seed data - MongoDB client not connected")
    
    from datetime import datetime
    from bson import ObjectId
    import bcrypt

    logger.info("Seeding sample data...")

    # Create sample users
    password_hash = bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt())

    user1 = {
        "_id": ObjectId(),
        "username": "alice",
        "email": "alice@example.com",
        "password_hash": password_hash,
        "groups_joined": [],
        "created_at": datetime.utcnow(),
    }

    user2 = {
        "_id": ObjectId(),
        "username": "bob",
        "email": "bob@example.com",
        "password_hash": password_hash,
        "groups_joined": [],
        "created_at": datetime.utcnow(),
    }

    users_collection.insert_many([user1, user2])
    logger.debug("Created 2 sample users")

    # Create sample group
    group1 = {
        "_id": ObjectId(),
        "name": "Best Music Albums",
        "description": "Rank your favorite albums of all time",
        "created_by": user1["_id"],
        "members": [user1["_id"], user2["_id"]],
        "admins": [user1["_id"]],
        "member_count": 2,
        "created_at": datetime.utcnow(),
    }

    groups_collection.insert_one(group1)
    logger.debug("Created sample group")

    logger.info("Sample data seeded successfully")
    logger.info("Login with: alice@example.com / password123")