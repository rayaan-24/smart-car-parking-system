# Flask API Integration Guide
# ================================

# This file shows the expected API format for the parking map frontend


## EXAMPLE JSON RESPONSE FORMAT

### GET /api/parking/slots
```json
{
    "slots": [
        {
            "id": 1,
            "slot_code": "P1",
            "slot_type": "standard",
            "status": "available",
            "row_num": 0,
            "col_num": 0,
            "entrance_distance": 10,
            "floor": 1
        },
        {
            "id": 2,
            "slot_code": "P2",
            "slot_type": "electric",
            "status": "occupied",
            "row_num": 0,
            "col_num": 1,
            "entrance_distance": 15,
            "floor": 1
        },
        {
            "id": 3,
            "slot_code": "P3",
            "slot_type": "handicap",
            "status": "reserved",
            "row_num": 0,
            "col_num": 2,
            "entrance_distance": 20,
            "floor": 1
        }
        // ... more slots
    ],
    "total": 30
}
```

### PUT /api/admin/slots/<id>
Request body:
```json
{
    "status": "occupied"
}
```

Response:
```json
{
    "message": "Slot updated successfully",
    "slot": {
        "id": 1,
        "status": "occupied"
    }
}
```

### POST /api/reservations/create
Request body:
```json
{
    "slot_id": 1,
    "date": "2024-01-15",
    "start_time": "09:00",
    "end_time": "17:00"
}
```

Response:
```json
{
    "message": "Reservation created successfully",
    "reservation": {
        "id": 1,
        "slot_id": 1,
        "slot_code": "P1",
        "status": "confirmed"
    }
}
```

### GET /api/parking/summary
```json
{
    "summary": {
        "total_slots": 30,
        "available": 15,
        "occupied": 10,
        "reserved": 4,
        "maintenance": 1
    }
}
```


## FLASK ROUTES EXAMPLE

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Example slot data (replace with database)
slots = [
    {
        "id": i,
        "slot_code": f"P{i}",
        "slot_type": get_slot_type(i),
        "status": "available",
        "row_num": (i-1) // 10,
        "col_num": (i-1) % 10,
        "entrance_distance": 10 + ((i-1) // 10) * 15 + ((i-1) % 10) * 5,
        "floor": 1
    }
    for i in range(1, 31)
]

@app.route('/api/parking/slots', methods=['GET'])
def get_slots():
    return jsonify({"slots": slots, "total": len(slots)})

@app.route('/api/parking/summary', methods=['GET'])
def get_summary():
    available = sum(1 for s in slots if s['status'] == 'available')
    occupied = sum(1 for s in slots if s['status'] == 'occupied')
    reserved = sum(1 for s in slots if s['status'] == 'reserved')
    
    return jsonify({
        "summary": {
            "total_slots": len(slots),
            "available": available,
            "occupied": occupied,
            "reserved": reserved,
            "maintenance": len(slots) - available - occupied - reserved
        }
    })

@app.route('/api/admin/slots/<int:slot_id>', methods=['PUT'])
def update_slot(slot_id):
    data = request.get_json()
    slot = next((s for s in slots if s['id'] == slot_id), None)
    
    if slot:
        slot['status'] = data.get('status', slot['status'])
        return jsonify({"message": "Slot updated", "slot": slot})
    
    return jsonify({"error": "Slot not found"}), 404

def get_slot_type(slot_id):
    if slot_id % 8 == 0:
        return "electric"
    elif slot_id % 5 == 0:
        return "handicap"
    elif slot_id % 7 == 0:
        return "compact"
    return "standard"


## INTEGRATION STEPS

1. Ensure your Flask backend has CORS enabled:
   ```python
   from flask_cors import CORS
   cors = CORS(app, origins="*")
   ```

2. Update CONFIG.API_BASE in parking-map.js:
   ```javascript
   CONFIG.API_BASE: 'http://your-backend-url.com/api'
   ```

3. Add JWT authentication headers in parking-map.js:
   ```javascript
   function getAuthHeaders() {
       const token = localStorage.getItem('token');
       return {
           'Content-Type': 'application/json',
           ...(token ? { 'Authorization': `Bearer ${token}` } : {})
       };
   }
   ```

4. Make sure your slots table has these columns:
   - id (INT, PRIMARY KEY)
   - slot_code (VARCHAR, e.g., 'P1')
   - slot_type (ENUM: 'standard', 'compact', 'electric', 'handicap')
   - status (ENUM: 'available', 'occupied', 'reserved', 'maintenance')
   - row_num (INT)
   - col_num (INT)
   - entrance_distance (INT)
   - floor (INT, default 1)
