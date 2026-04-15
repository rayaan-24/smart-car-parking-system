from database.connection import get_db

def init_database():
    db = get_db()
    
    try:
        print("Initializing database...")
        
        db.execute("SELECT COUNT(*) as count FROM users")
        result = db.fetch_one()
        user_count = result['count']
        
        if user_count == 0:
            print("No users found. Database needs to be initialized.")
            print("Please run the schema.sql file in MySQL:")
            print("  mysql -u root -p < database/schema.sql")
            return False
        
        db.execute("SELECT COUNT(*) as count FROM parking_slots")
        result = db.fetch_one()
        slot_count = result['count']
        
        print(f"Database check complete:")
        print(f"  - Users: {user_count}")
        print(f"  - Parking slots: {slot_count}")
        
        return True
        
    except Exception as e:
        print(f"Database initialization error: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
