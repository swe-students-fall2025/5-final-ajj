"""
Input validation utilities
"""
import re


def validate_email(email):
    """
    Validate email format
    
    Args:
        email (str): Email to validate
        
    Returns:
        bool: True if valid email format
    """
    if not email or not isinstance(email, str):
        return False
    
    # RFC 5322 simplified email regex
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email.strip()) is not None


def validate_password(password):
    """
    Validate password strength
    
    Requirements:
    - At least 8 characters
    
    Args:
        password (str): Password to validate
        
    Returns:
        tuple: (bool, str) - (is_valid, error_message)
    """
    if not password or not isinstance(password, str):
        return False, "Password is required"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    return True, ""


def validate_username(username):
    """
    Validate username
    
    Requirements:
    - 3-30 characters
    - Only alphanumeric, underscore, hyphen
    
    Args:
        username (str): Username to validate
        
    Returns:
        tuple: (bool, str) - (is_valid, error_message)
    """
    if not username or not isinstance(username, str):
        return False, "Username is required"
    
    username = username.strip()
    
    if len(username) < 3:
        return False, "Username must be at least 3 characters"
    
    if len(username) > 30:
        return False, "Username must be at most 30 characters"
    
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, "Username can only contain letters, numbers, underscore, and hyphen"
    
    return True, ""


def validate_rating(score):
    """
    Validate rating score
    
    Args:
        score: Rating value to validate
        
    Returns:
        bool: True if valid (1-5)
    """
    try:
        score = int(score)
        return 1 <= score <= 5
    except (ValueError, TypeError):
        return False


def sanitize_input(text, max_length=None):
    """
    Sanitize user input by stripping whitespace and limiting length
    
    Args:
        text (str): Input text
        max_length (int, optional): Maximum length
        
    Returns:
        str: Sanitized text
    """
    if not text:
        return ""
    
    text = text.strip()
    
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text