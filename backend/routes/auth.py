from flask import Blueprint, request, jsonify
from models.user import User
from utils.validators import validate_registration_data
from database.connection import get_db
import jwt
import datetime
import os

auth_bp = Blueprint('auth', __name__)

def generate_token(user):
    payload = {
        'user_id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
        'iat': datetime.datetime.utcnow()
    }
    secret = os.getenv('SECRET_KEY', 'parking-secret-key-2024')
    token = jwt.encode(payload, secret, algorithm='HS256')
    return token

def verify_token(token):
    try:
        secret = os.getenv('SECRET_KEY', 'parking-secret-key-2024')
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        valid, errors = validate_registration_data(data)
        if not valid:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        existing_user = User.find_by_email(data['email'])
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 409
        
        user = User.create(
            name=data['name'],
            email=data['email'],
            password=data['password'],
            role='user'
        )
        
        log_activity(user['id'], 'register', f"User {user['email']} registered")
        
        return jsonify({
            'message': 'Registration successful',
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password required'}), 400
        
        if not User.verify_password(data['email'], data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        user = User.find_by_email(data['email'])
        
        token = generate_token(user)
        
        log_activity(user['id'], 'login', f"User {user['email']} logged in")
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/check-auth', methods=['GET', 'OPTIONS'])
def check_auth():
    if request.method == 'OPTIONS':
        return '', 200
    
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'authenticated': False}), 200
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({'authenticated': False}), 200
    
    user = User.find_by_id(payload['user_id'])
    if not user:
        return jsonify({'authenticated': False}), 200
    
    return jsonify({
        'authenticated': True,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'role': user['role']
        }
    }), 200

def log_activity(user_id, action, details):
    try:
        db = get_db()
        query = """
            INSERT INTO activity_logs (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
        """
        db.execute(query, (user_id, action, details, request.remote_addr))
        db.commit()
        db.close()
    except Exception as e:
        print(f"Failed to log activity: {e}")
