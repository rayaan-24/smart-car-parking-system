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

@parking_bp.route('/ga-assign', methods=['POST'])
@login_required
def ga_assign_slot():
    try:
        data = request.get_json() or {}
        
        available_slots = ParkingSlot.get_available_slots()
        
        if not available_slots:
            return jsonify({
                'success': False,
                'error': 'No available slots',
                'slot': None
            }), 200
        
        import random
        import time
        
        # GA Configuration
        POPULATION_SIZE = 50
        GENERATIONS = 100
        MUTATION_RATE = 0.1
        ELITE_COUNT = 5
        
        def calculate_fitness(slot):
            distance_score = 1 - (float(slot['entrance_distance']) / 200)
            row_score = 1.0 if slot['row_num'] == 1 else 0.7
            return (distance_score * 0.5) + (row_score * 0.3) + (random.random() * 0.2)
        
        # Initialize population
        population = []
        for _ in range(POPULATION_SIZE):
            slot = random.choice(available_slots)
            population.append({
                'slot': slot,
                'fitness': calculate_fitness(slot)
            })
        
        best_solution = None
        best_fitness = -float('inf')
        
        for gen in range(GENERATIONS):
            population.sort(key=lambda x: x['fitness'], reverse=True)
            
            if population[0]['fitness'] > best_fitness:
                best_fitness = population[0]['fitness']
                best_solution = population[0]['slot']
            
            # Create next generation
            new_population = population[:ELITE_COUNT]
            
            while len(new_population) < POPULATION_SIZE:
                parent1 = random.choice(population[:10])
                parent2 = random.choice(population[:10])
                
                if random.random() < MUTATION_RATE:
                    child = {
                        'slot': random.choice(available_slots),
                        'fitness': 0
                    }
                else:
                    child = parent1 if random.random() < 0.5 else parent2
                
                child['fitness'] = calculate_fitness(child['slot'])
                new_population.append(child)
            
            population = new_population
        
        # Assign the best slot
        if best_solution:
            ParkingSlot.update_status(best_solution['id'], 'assigned')
        
        return jsonify({
            'success': True,
            'slot': {
                'id': best_solution['id'],
                'slot_code': best_solution['slot_code'],
                'row_num': best_solution['row_num'],
                'col_num': best_solution['col_num'],
                'status': 'assigned',
                'slot_type': best_solution['slot_type'],
                'entrance_distance': float(best_solution['entrance_distance']),
                'fitness': round(best_fitness, 4),
                'generation': GENERATIONS
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500
