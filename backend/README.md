# Smart Parking Management System - Backend

## Setup Instructions

### 1. Database Setup

Make sure you have MySQL installed and running. Then:

```bash
# Login to MySQL
mysql -u root -p

# Run the schema file
source database/schema.sql
```

### 2. Python Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration

Copy `.env.example` to `.env` and update with your MySQL credentials:

```bash
cp .env.example .env
```

### 4. Run the Application

```bash
# Initialize database
python database/init_db.py

# Run Flask app
python app.py
```

The API will be available at: `http://localhost:5000`

### 5. Default Admin Account

- Email: `admin@parking.com`
- Password: `admin123`

**Note:** Update this password immediately after first login!

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check-auth` - Check authentication status

### Parking Slots
- `GET /api/parking/slots` - Get all slots
- `GET /api/parking/slots/available` - Get available slots
- `GET /api/parking/slots/<id>` - Get specific slot
- `GET /api/parking/slots/grid` - Get slots as grid
- `GET /api/parking/summary` - Get parking summary

### Reservations
- `GET /api/reservations/` - Get user's reservations
- `POST /api/reservations/create` - Create reservation
- `DELETE /api/reservations/<id>` - Cancel reservation
- `PUT /api/reservations/<id>/complete` - Mark as completed
- `POST /api/reservations/ai-assign` - AI-based slot assignment

### Admin
- `GET /api/admin/dashboard` - Get dashboard data
- `PUT /api/admin/slots/<id>` - Update slot status
- `GET /api/admin/users` - Get all users
- `GET /api/admin/reservations` - Get all reservations
- `PUT /api/admin/reservations/<id>` - Update reservation
- `GET /api/admin/activity` - Get activity logs

## Genetic Algorithm

The GA optimizes slot selection based on:
- Distance from entrance (50%)
- Availability (30%)
- No reservation conflicts (20%)

Configuration in `admin_settings` table can adjust:
- Population size
- Number of generations
- Mutation rate
- Crossover rate

## Testing with Postman

Import the endpoints above and test:
1. Register a new user
2. Login
3. View available slots
4. Create a reservation
5. View user's reservations
6. Cancel a reservation

For admin features:
1. Login with admin credentials
2. View dashboard
3. Update slot status
4. Monitor activity logs
