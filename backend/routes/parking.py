from flask import Blueprint, request, jsonify
from models.slot import ParkingSlot
from utils.decorators import login_required

parking_bp = Blueprint('parking', __name__)

@parking_bp.route('/slots', methods=['GET'])
@login_required
def get_slots():
    try:
        slots = ParkingSlot.get_all_slots()
        
        slots_data = []
        for slot in slots:
            slots_data.append({
                'id': slot['id'],
                'slot_code': slot['slot_code'],
                'row_num': slot['row_num'],
                'col_num': slot['col_num'],
                'status': slot['status'],
                'slot_type': slot['slot_type'],
                'entrance_distance': float(slot['entrance_distance'])
            })
        
        return jsonify({
            'slots': slots_data,
            'total': len(slots_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@parking_bp.route('/slots/available', methods=['GET'])
@login_required
def get_available_slots():
    try:
        slots = ParkingSlot.get_available_slots()
        
        slots_data = []
        for slot in slots:
            slots_data.append({
                'id': slot['id'],
                'slot_code': slot['slot_code'],
                'row_num': slot['row_num'],
                'col_num': slot['col_num'],
                'status': slot['status'],
                'slot_type': slot['slot_type'],
                'entrance_distance': float(slot['entrance_distance'])
            })
        
        return jsonify({
            'slots': slots_data,
            'total': len(slots_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@parking_bp.route('/slots/<int:slot_id>', methods=['GET'])
@login_required
def get_slot(slot_id):
    try:
        slot = ParkingSlot.get_slot_by_id(slot_id)
        
        if not slot:
            return jsonify({'error': 'Slot not found'}), 404
        
        return jsonify({
            'slot': {
                'id': slot['id'],
                'slot_code': slot['slot_code'],
                'row_num': slot['row_num'],
                'col_num': slot['col_num'],
                'status': slot['status'],
                'slot_type': slot['slot_type'],
                'entrance_distance': float(slot['entrance_distance'])
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@parking_bp.route('/slots/grid', methods=['GET'])
@login_required
def get_slots_grid():
    try:
        grid = ParkingSlot.get_slots_grid()
        
        grid_data = {}
        for row, slots in grid.items():
            grid_data[str(row)] = [
                {
                    'id': slot['id'],
                    'slot_code': slot['slot_code'],
                    'status': slot['status'],
                    'slot_type': slot['slot_type'],
                    'entrance_distance': float(slot['entrance_distance'])
                }
                for slot in slots
            ]
        
        return jsonify({
            'grid': grid_data,
            'rows': len(grid),
            'cols': max(len(slots) for slots in grid.values()) if grid else 0
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@parking_bp.route('/summary', methods=['GET'])
@login_required
def get_summary():
    try:
        summary = ParkingSlot.get_parking_summary()
        
        return jsonify({
            'summary': {
                'total_slots': summary['total_slots'],
                'available': summary['available_slots'],
                'occupied': summary['occupied_slots'],
                'reserved': summary['reserved_slots'],
                'maintenance': summary['maintenance_slots'],
                'availability_percentage': float(summary['availability_percentage'])
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
