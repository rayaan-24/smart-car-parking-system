# Smart Parking Management System

## Overview

A production-ready AI-powered parking management system using Genetic Algorithm for optimal slot allocation.

## Features

- **User Features**
  - Secure authentication (login/register)
  - Real-time parking availability dashboard
  - AI-based optimal slot recommendation
  - Slot reservation system
  - Booking history

- **Admin Features**
  - Dashboard with analytics
  - Slot management
  - Reservation management
  - User monitoring
  - Activity logs

- **AI Feature**
  - Genetic Algorithm for optimal slot selection
  - Minimizes distance from entrance
  - Considers slot availability
  - Prevents reservation conflicts

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Python Flask
- **Database**: MySQL
- **AI**: Genetic Algorithm (Python)

## Project Structure

```
/Project
├── backend/
│   ├── app.py                 # Flask application
│   ├── config.py              # Configuration
│   ├── requirements.txt       # Dependencies
│   ├── database/
│   │   ├── schema.sql         # Database schema
│   │   ├── connection.py      # DB connection
│   │   └── init_db.py         # DB initialization
│   ├── models/
│   │   ├── user.py            # User model
│   │   ├── slot.py            # Slot model
│   │   └── reservation.py     # Reservation model
│   ├── routes/
│   │   ├── auth.py            # Authentication routes
│   │   ├── parking.py         # Parking routes
│   │   ├── reservation.py     # Reservation routes
│   │   └── admin.py            # Admin routes
│   ├── services/
│   │   └── ga_algorithm.py    # Genetic Algorithm
│   └── utils/
│       ├── validators.py      # Input validation
│       └── decorators.py      # Auth decorators
└── frontend/
    ├── index.html             # Login/Register
    ├── dashboard.html         # User dashboard
    ├── admin.html             # Admin dashboard
    ├── css/
    │   └── style.css          # Styling
    └── js/
        ├── auth.js            # Auth logic
        ├── dashboard.js       # Dashboard logic
        └── admin.js           # Admin logic
```

## Quick Start

### 1. Database Setup

Make sure MySQL is running, then:

```bash
cd backend
mysql -u root -p < database/schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# Initialize database
python database/init_db.py

# Run Flask app
python app.py
```

Backend will be available at: http://localhost:5000

### 3. Frontend

The frontend is served by Flask automatically. Open:
- User login: http://localhost:5000
- Admin dashboard: Login with admin account

### 4. Default Admin Account

- **Email**: admin@parking.com
- **Password**: admin123

**Important**: Change this password immediately after first login!

## API Documentation

### Authentication

#### Register
```
POST /api/auth/register
Body: { name, email, password }
```

#### Login
```
POST /api/auth/login
Body: { email, password }
```

#### Logout
```
POST /api/auth/logout
```

### Parking

#### Get All Slots
```
GET /api/parking/slots
```

#### Get Summary
```
GET /api/parking/summary
```

### Reservations

#### Create Reservation
```
POST /api/reservations/create
Body: { slot_id, date, start_time, end_time, vehicle_plate? }
```

#### Get User Reservations
```
GET /api/reservations/
```

#### Cancel Reservation
```
DELETE /api/reservations/<id>
```

#### AI Slot Assignment
```
POST /api/reservations/ai-assign
Body: { date, start_time, end_time }
```

### Admin

#### Dashboard
```
GET /api/admin/dashboard
```

#### Update Slot Status
```
PUT /api/admin/slots/<id>
Body: { status }
```

#### Get All Reservations
```
GET /api/admin/reservations
```

#### Get All Users
```
GET /api/admin/users
```

## Genetic Algorithm

The GA optimizes slot selection using:

**Fitness Function:**
```
fitness = (1/distance) * 0.5 + availability * 0.3 + no_conflict * 0.2
```

**Parameters (configurable in admin_settings):**
- Population Size: 20
- Generations: 50
- Mutation Rate: 0.1
- Crossover Rate: 0.8

## Database Schema

### Tables

1. **users** - User accounts
2. **parking_slots** - 50 parking spots (5x10 grid)
3. **reservations** - Booking records
4. **activity_logs** - Audit trail
5. **admin_settings** - System configuration

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Input validation
- Role-based access control
- SQL injection prevention

## Testing

### Manual Testing

1. Register a new user
2. Login and view dashboard
3. Click on a slot to reserve
4. Use AI slot finder
5. View and cancel reservations

### Admin Testing

1. Login with admin credentials
2. View dashboard statistics
3. Update slot statuses
4. Manage reservations
5. View activity logs

## Deployment

### Backend (Railway/Render)

1. Push code to GitHub
2. Connect to Railway/Render
3. Set environment variables
4. Deploy

### Frontend

Frontend is served by Flask backend. For separate hosting:
- Build static files
- Deploy to Netlify/Vercel
- Update API_BASE in JS files

### Database

Use managed MySQL:
- Railway MySQL
- PlanetScale
- AWS RDS

## Future Enhancements

- Real-time updates with WebSockets
- Mobile app (React Native)
- Payment integration
- IoT sensor integration
- Multi-location support
- Analytics dashboard
- Email notifications

## License

MIT License

## Support

For issues and questions, create an issue on GitHub.

---

Built with ❤️ for smart parking solutions
