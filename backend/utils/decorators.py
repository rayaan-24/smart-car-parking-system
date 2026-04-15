from functools import wraps
from flask import request, jsonify
from models.user import User
import jwt
import os

def get_token_from_header():
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None

def verify_token(token):
    try:
        secret = os.getenv('SECRET_KEY', 'parking-secret-key-2024')
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 200
        
        token = get_token_from_header()
        if not token:
            return jsonify({'error': 'Authentication required', 'code': 'no_token'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token', 'code': 'invalid_token'}), 401
        
        user = User.find_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 401
        
        request.current_user = user
        request.user_payload = payload
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 200
        
        token = get_token_from_header()
        if not token:
            return jsonify({'error': 'Authentication required', 'code': 'no_token'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token', 'code': 'invalid_token'}), 401
        
        user = User.find_by_id(payload['user_id'])
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        request.current_user = user
        request.user_payload = payload
        return f(*args, **kwargs)
    return decorated_function

def api_key_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 200
        
        api_key = request.headers.get('X-API-Key')
        if api_key != os.getenv('API_KEY', 'your-api-key-change-in-production'):
            return jsonify({'error': 'Invalid API key'}), 401
        return f(*args, **kwargs)
    return decorated_function
