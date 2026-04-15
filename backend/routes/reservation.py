from flask import Blueprint, request, jsonify
from models.reservation import Reservation
from models.slot import ParkingSlot
from utils.decorators import login_required
from utils.validators import validate_reservation_data
from services.ga_algorithm import GeneticAlgorithm

reservation_bp = Blueprint('reservation', __name__)

@reservation_bp.route('/', methods=['GET'])
@login_required
def get_reservations():
    try:
        user_id = request.current_user['id']
        reservations = Reservation.get_user_reservations(user_id)
        
        reservations_data = []
        for res in reservations:
            reservations_data.append({
                'id': res['id'],
                'slot_id': res['slot_id'],
                'slot_code': res['slot_code'],
                'reservation_date': str(res['reservation_date']),
                'start_time': str(res['start_time']),
                'end_time': str(res['end_time']),
                'status': res['status'],
                'vehicle_plate': res.get('vehicle_plate'),
                'entrance_distance': float(res['entrance_distance'])
            })
        
        return jsonify({
            'reservations': reservations_data,
            'total': len(reservations_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reservation_bp.route('/create', methods=['POST'])
@login_required
def create_reservation():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        valid, errors = validate_reservation_data(data)
        if not valid:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        slot = ParkingSlot.get_slot_by_id(data['slot_id'])
        if not slot:
            return jsonify({'error': 'Slot not found'}), 404
        
        if slot['status'] != 'available':
            return jsonify({'error': 'Slot is not available'}), 400
        
        reservation = Reservation.create(
            user_id=request.current_user['id'],
            slot_id=data['slot_id'],
            reservation_date=data.get('reservation_date') or data.get('date'),
            start_time=data['start_time'],
            end_time=data['end_time'],
            vehicle_plate=data.get('vehicle_plate')
        )
        
        ParkingSlot.update_status(data['slot_id'], 'reserved')
        
        return jsonify({
            'message': 'Reservation created successfully',
            'reservation': {
                'id': reservation['id'],
                'slot_code': slot['slot_code'],
                'reservation_date': str(reservation['reservation_date']),
                'start_time': str(reservation['start_time']),
                'end_time': str(reservation['end_time']),
                'status': reservation['status']
            }
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reservation_bp.route('/<int:reservation_id>', methods=['DELETE'])
@login_required
def cancel_reservation(reservation_id):
    try:
        reservation = Reservation.get_reservation_by_id(reservation_id)
        
        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404
        
        if reservation['user_id'] != request.current_user['id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if reservation['status'] == 'cancelled':
            return jsonify({'error': 'Reservation already cancelled'}), 400
        
        success = Reservation.cancel_reservation(reservation_id, request.current_user['id'])
        
        if success:
            ParkingSlot.update_status(reservation['slot_id'], 'available')
        
        return jsonify({'message': 'Reservation cancelled successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reservation_bp.route('/<int:reservation_id>/complete', methods=['PUT'])
@login_required
def complete_reservation(reservation_id):
    try:
        reservation = Reservation.get_reservation_by_id(reservation_id)
        
        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404
        
        Reservation.update_status(reservation_id, 'completed')
        ParkingSlot.update_status(reservation['slot_id'], 'available')
        
        return jsonify({'message': 'Reservation marked as completed'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reservation_bp.route('/ai-assign', methods=['POST'])
@login_required
def ai_assign_slot():
    try:
        data = request.get_json() or {}
        
        date = data.get('date')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        ga = GeneticAlgorithm()
        best_slot = ga.find_optimal_slot(
            date=date,
            start_time=start_time,
            end_time=end_time
        )
        
        if not best_slot:
            return jsonify({'error': 'No available slots found'}), 404
        
        return jsonify({
            'message': 'Optimal slot found using AI',
            'slot': {
                'id': best_slot['id'],
                'slot_code': best_slot['slot_code'],
                'row_num': best_slot['row_num'],
                'col_num': best_slot['col_num'],
                'slot_type': best_slot['slot_type'],
                'entrance_distance': float(best_slot['entrance_distance']),
                'status': best_slot['status']
            },
            'ga_stats': {
                'generations': ga.generations_run,
                'fitness': ga.best_fitness
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
