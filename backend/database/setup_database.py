import pymysql
import bcrypt
from dotenv import load_dotenv
import os

load_dotenv()

def setup_database():
    print("=" * 50)
    print("SMART PARKING SYSTEM - DATABASE SETUP")
    print("=" * 50)
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'port': int(os.getenv('DB_PORT', 3306))
    }
    db_name = os.getenv('DB_NAME', 'parking_db')
    
    try:
        print("\n1. Connecting to MySQL...")
        connection = pymysql.connect(**db_config)
        cursor = connection.cursor()
        
        print(f"2. Creating database '{db_name}' if not exists...")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cursor.execute(f"USE {db_name}")
        
        print("3. Creating tables...")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_role (role)
            ) ENGINE=InnoDB
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS parking_slots (
                id INT PRIMARY KEY AUTO_INCREMENT,
                slot_code VARCHAR(10) NOT NULL UNIQUE,
                row_num INT NOT NULL,
                col_num INT NOT NULL,
                status ENUM('available', 'occupied', 'reserved', 'maintenance') DEFAULT 'available',
                slot_type ENUM('standard', 'compact', 'electric', 'handicap') DEFAULT 'standard',
                entrance_distance DECIMAL(5,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_row_col (row_num, col_num)
            ) ENGINE=InnoDB
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reservations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                slot_id INT NOT NULL,
                reservation_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                vehicle_plate VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_slot_id (slot_id),
                INDEX idx_date (reservation_date),
                INDEX idx_status (status)
            ) ENGINE=InnoDB
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_action (action),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_settings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                setting_key VARCHAR(100) NOT NULL UNIQUE,
                setting_value TEXT,
                description VARCHAR(255),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_key (setting_key)
            ) ENGINE=InnoDB
        """)
        
        print("4. Creating admin user...")
        password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cursor.execute("SELECT id FROM users WHERE email = 'admin@parking.com'")
        if cursor.fetchone():
            cursor.execute("UPDATE users SET password = %s WHERE email = 'admin@parking.com'", (password_hash,))
            print("   Admin password updated")
        else:
            cursor.execute("""
                INSERT INTO users (name, email, password, role) 
                VALUES (%s, %s, %s, %s)
            """, ('System Administrator', 'admin@parking.com', password_hash, 'admin'))
            print("   Admin user created")
        
        print("5. Creating parking slots...")
        cursor.execute("SELECT COUNT(*) FROM parking_slots")
        if cursor.fetchone()[0] == 0:
            slot_data = []
            rows = ['A', 'B', 'C', 'D', 'E']
            slot_types = ['standard', 'standard', 'standard', 'standard', 'standard', 'compact', 'compact', 'compact', 'electric', 'electric']
            
            for row_idx, row_letter in enumerate(rows):
                for col_idx in range(10):
                    slot_code = f"{row_letter}{col_idx + 1}"
                    slot_type = slot_types[col_idx]
                    distance = row_idx + 1
                    slot_data.append((slot_code, row_idx, col_idx, 'available', slot_type, distance))
            
            cursor.executemany("""
                INSERT INTO parking_slots (slot_code, row_num, col_num, status, slot_type, entrance_distance)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, slot_data)
            print(f"   Created {len(slot_data)} parking slots (A1-E10)")
        else:
            print("   Parking slots already exist, skipping...")
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("\n" + "=" * 50)
        print("SETUP COMPLETE!")
        print("=" * 50)
        print("\nLogin Credentials:")
        print("  Admin Email:    admin@parking.com")
        print("  Admin Password: admin123")
        print("\nTo start the application:")
        print("  python app.py")
        print("=" * 50)
        
    except pymysql.err.OperationalError as e:
        print(f"\nERROR: Cannot connect to MySQL")
        print(f"Details: {e}")
        print("\nPlease ensure:")
        print("  1. MySQL service is running")
        print("  2. Credentials in .env are correct")
        print("  3. MySQL is accessible")
    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == "__main__":
    setup_database()
