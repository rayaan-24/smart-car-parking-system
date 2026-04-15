import pymysql
import bcrypt
from dotenv import load_dotenv
import os

load_dotenv()

def test_login():
    print("=" * 50)
    print("TESTING LOGIN CREDENTIALS")
    print("=" * 50)
    
    try:
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'parking_db'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        
        cursor = connection.cursor()
        
        print("\n1. Checking admin user...")
        cursor.execute("SELECT * FROM users WHERE email = 'admin@parking.com'")
        admin = cursor.fetchone()
        
        if not admin:
            print("   [ERROR] Admin user not found!")
            return False
        
        print(f"   [OK] Admin user found: {admin[1]} ({admin[2]})")
        
        print("\n2. Testing password 'admin123'...")
        test_password = 'admin123'
        
        stored_hash = admin[3]  # password field
        print(f"   Stored hash: {stored_hash}")
        
        try:
            is_valid = bcrypt.checkpw(test_password.encode('utf-8'), stored_hash.encode('utf-8'))
            if is_valid:
                print("   [OK] Password 'admin123' is CORRECT!")
            else:
                print("   [ERROR] Password 'admin123' is INCORRECT!")
                print("\n   Fixing admin password...")
                
                new_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cursor.execute("UPDATE users SET password = %s WHERE email = 'admin@parking.com'", (new_hash,))
                connection.commit()
                print("   [FIXED] Password updated successfully!")
        except Exception as e:
            print(f"   [ERROR] Password verification failed: {e}")
            print("\n   Fixing admin password...")
            
            new_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute("UPDATE users SET password = %s WHERE email = 'admin@parking.com'", (new_hash,))
            connection.commit()
            print("   [FIXED] Password updated successfully!")
        
        print("\n3. Checking parking slots...")
        cursor.execute("SELECT COUNT(*) FROM parking_slots")
        slot_count = cursor.fetchone()[0]
        print(f"   Total slots: {slot_count}")
        
        if slot_count == 0:
            print("   [WARNING] No parking slots found!")
        elif slot_count == 50:
            print("   [OK] 50 parking slots configured")
        else:
            print(f"   [INFO] {slot_count} slots configured")
        
        cursor.close()
        connection.close()
        
        print("\n" + "=" * 50)
        print("TEST COMPLETE!")
        print("=" * 50)
        print("\nYou can now login with:")
        print("  Email:    admin@parking.com")
        print("  Password: admin123")
        print("\nStart the app: python app.py")
        print("=" * 50)
        return True
        
    except pymysql.err.OperationalError as e:
        print(f"\n[ERROR] Cannot connect to MySQL: {e}")
        print("\nPlease make sure:")
        print("  1. MySQL is running")
        print("  2. Run setup first: python database/setup_database.py")
        return False
    except Exception as e:
        print(f"\n[ERROR] {e}")
        return False

if __name__ == "__main__":
    test_login()
