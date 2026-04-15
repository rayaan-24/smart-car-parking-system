import pymysql
from config import Config

class Database:
    def __init__(self):
        self.config = Config.get_db_config()
        self.connection = None
        self.cursor = None

    def connect(self):
        try:
            self.connection = pymysql.connect(**self.config)
            self.cursor = self.connection.cursor(pymysql.cursors.DictCursor)
            return True
        except pymysql.Error as e:
            print(f"Database connection error: {e}")
            return False

    def close(self):
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()

    def execute(self, query, params=None):
        try:
            if params:
                self.cursor.execute(query, params)
            else:
                self.cursor.execute(query)
            return True
        except pymysql.Error as e:
            print(f"Query execution error: {e}")
            return False

    def fetch_one(self):
        return self.cursor.fetchone()

    def fetch_all(self):
        return self.cursor.fetchall()

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def get_last_insert_id(self):
        return self.cursor.lastrowid

def get_db():
    db = Database()
    db.connect()
    return db
