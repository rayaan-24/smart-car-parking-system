from flask import Blueprint, request, jsonify
from models.user import User
from models.slot import ParkingSlot
from models.reservation import Reservation
from utils.decorators import admin_required
from database.connection import get_db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def get_dashboard():
    try:
        summary = ParkingSlot.get_parking_summary()
        user_count = User.get_user_count()
        active_reservations = Reservation.get_active_reservations_count()
        
        return jsonify({
            'dashboard': {
                'parking': {
                    'total_slots': summary['total_slots'],
                    'available': summary['available_slots'],
                    'occupied': summary['occupied_slots'],
                    'reserved': summary['reserved_slots'],
                    'maintenance': summary['maintenance_slots'],
                    'availability_percentage': float(summary['availability_percentage'])
                },
                'users': {
                    'total': user_count
                },
                'reservations': {
                    'active': active_reservations
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/slots/<int:slot_id>', methods=['PUT'])
@admin_required
def update_slot(slot_id):
    try:
        data = request.get_json()
        
        if not data or 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
        
        valid_statuses = ['available', 'occupied', 'reserved', 'maintenance']
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
        
        slot = ParkingSlot.get_slot_by_id(slot_id)
        if not slot:
            return jsonify({'error': 'Slot not found'}), 404
        
        ParkingSlot.update_status(slot_id, data['status'])
        
        return jsonify({
            'message': 'Slot status updated successfully',
            'slot': {
                'id': slot_id,
                'slot_code': slot['slot_code'],
                'new_status': data['status']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    try:
        users = User.get_all_users()
        
        users_data = []
        for user in users:
            users_data.append({
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role'],
                'created_at': str(user['created_at'])
            })
        
        return jsonify({
            'users': users_data,
            'total': len(users_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reservations', methods=['GET'])
@admin_required
def get_all_reservations():
    try:
        reservations = Reservation.get_all_reservations()
        
        reservations_data = []
        for res in reservations:
            reservations_data.append({
                'id': res['id'],
                'user_name': res['user_name'],
                'user_email': res['user_email'],
                'slot_code': res['slot_code'],
                'reservation_date': str(res['reservation_date']),
                'start_time': str(res['start_time']),
                'end_time': str(res['end_time']),
                'status': res['status'],
                'vehicle_plate': res.get('vehicle_plate')
            })
        
        return jsonify({
            'reservations': reservations_data,
            'total': len(reservations_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reservations/<int:reservation_id>', methods=['PUT'])
@admin_required
def update_reservation(reservation_id):
    try:
        data = request.get_json()
        
        if not data or 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
        
        valid_statuses = ['pending', 'confirmed', 'completed', 'cancelled']
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'Invalid status'}), 400
        
        reservation = Reservation.get_reservation_by_id(reservation_id)
        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404
        
        Reservation.update_status(reservation_id, data['status'])
        
        if data['status'] in ['completed', 'cancelled']:
            ParkingSlot.update_status(reservation['slot_id'], 'available')
        
        return jsonify({'message': 'Reservation updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/activity', methods=['GET'])
@admin_required
def get_activity_logs():
    try:
        limit = request.args.get('limit', 100, type=int)
        
        db = get_db()
        query = """
            SELECT al.*, u.name as user_name, u.email as user_email
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT %s
        """
        db.execute(query, (limit,))
        logs = db.fetch_all()
        db.close()
        
        logs_data = []
        for log in logs:
            logs_data.append({
                'id': log['id'],
                'user_name': log['user_name'],
                'user_email': log['user_email'],
                'action': log['action'],
                'details': log['details'],
                'ip_address': log['ip_address'],
                'created_at': str(log['created_at'])
            })
        
        return jsonify({
            'activity_logs': logs_data,
            'total': len(logs_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/slots/maintenance', methods=['POST'])
@admin_required
def set_maintenance_mode():
    try:
        data = request.get_json()
        slot_ids = data.get('slot_ids', [])
        
        if not slot_ids:
            return jsonify({'error': 'No slot IDs provided'}), 400
        
        for slot_id in slot_ids:
            ParkingSlot.update_status(slot_id, 'maintenance')
        
        return jsonify({
            'message': f'{len(slot_ids)} slots set to maintenance mode'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
