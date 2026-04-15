import pymysql
import bcrypt
from dotenv import load_dotenv
import os

load_dotenv()

def create_admin_user():
    try:
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'parking_db'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        
        cursor = connection.cursor()
        
        admin_password = 'admin123'
        password_hash = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cursor.execute("SELECT id FROM users WHERE email = 'admin@parking.com'")
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("""
                UPDATE users 
                SET password = %s 
                WHERE email = 'admin@parking.com'
            """, (password_hash,))
            print(f"Updated admin user password (admin@parking.com / admin123)")
        else:
            cursor.execute("""
                INSERT INTO users (name, email, password, role) 
                VALUES (%s, %s, %s, %s)
            """, ('System Administrator', 'admin@parking.com', password_hash, 'admin'))
            print(f"Created new admin user (admin@parking.com / admin123)")
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("\nAdmin login credentials:")
        print("  Email: admin@parking.com")
        print("  Password: admin123")
        print("\nDatabase is ready!")
        
    except pymysql.err.OperationalError as e:
        print(f"Database connection error: {e}")
        print("\nPlease make sure:")
        print("  1. MySQL is running")
        print("  2. Database 'parking_db' exists")
        print("  3. Run the schema.sql file first: mysql -u root -p < database/schema.sql")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_admin_user()
