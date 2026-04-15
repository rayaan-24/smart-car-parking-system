import bcrypt
from database.connection import get_db

class User:
    @staticmethod
    def create(name, email, password, role='user'):
        db = get_db()
        try:
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            query = """
                INSERT INTO users (name, email, password, role)
                VALUES (%s, %s, %s, %s)
            """
            db.execute(query, (name, email, password_hash, role))
            db.commit()
            
            user_id = db.get_last_insert_id()
            
            db.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = db.fetch_one()
            
            return user
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    @staticmethod
    def find_by_email(email):
        db = get_db()
        try:
            db.execute("SELECT * FROM users WHERE email = %s", (email,))
            return db.fetch_one()
        finally:
            db.close()

    @staticmethod
    def find_by_id(user_id):
        db = get_db()
        try:
            db.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return db.fetch_one()
        finally:
            db.close()

    @staticmethod
    def verify_password(email, password):
        user = User.find_by_email(email)
        if not user:
            return False
        
        return bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8'))

    @staticmethod
    def get_all_users():
        db = get_db()
        try:
            db.execute("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
            return db.fetch_all()
        finally:
            db.close()

    @staticmethod
    def get_user_count():
        db = get_db()
        try:
            db.execute("SELECT COUNT(*) as count FROM users WHERE role = 'user'")
            return db.fetch_one()['count']
        finally:
            db.close()
