from database.connection import get_db

class ParkingSlot:
    @staticmethod
    def get_all_slots():
        db = get_db()
        try:
            db.execute("SELECT * FROM parking_slots ORDER BY row_num, col_num")
            return db.fetch_all()
        finally:
            db.close()

    @staticmethod
    def get_available_slots():
        db = get_db()
        try:
            db.execute("SELECT * FROM parking_slots WHERE status = 'available' ORDER BY entrance_distance")
            return db.fetch_all()
        finally:
            db.close()

    @staticmethod
    def get_slot_by_id(slot_id):
        db = get_db()
        try:
            db.execute("SELECT * FROM parking_slots WHERE id = %s", (slot_id,))
            return db.fetch_one()
        finally:
            db.close()

    @staticmethod
    def get_slot_by_code(slot_code):
        db = get_db()
        try:
            db.execute("SELECT * FROM parking_slots WHERE slot_code = %s", (slot_code,))
            return db.fetch_one()
        finally:
            db.close()

    @staticmethod
    def update_status(slot_id, status):
        db = get_db()
        try:
            query = "UPDATE parking_slots SET status = %s WHERE id = %s"
            db.execute(query, (status, slot_id))
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    @staticmethod
    def get_parking_summary():
        db = get_db()
        try:
            db.execute("SELECT * FROM parking_summary")
            return db.fetch_one()
        finally:
            db.close()

    @staticmethod
    def get_slots_by_status(status):
        db = get_db()
        try:
            db.execute("SELECT * FROM parking_slots WHERE status = %s ORDER BY row_num, col_num", (status,))
            return db.fetch_all()
        finally:
            db.close()

    @staticmethod
    def get_slots_grid():
        db = get_db()
        try:
            db.execute("SELECT * FROM parking_slots ORDER BY row_num, col_num")
            slots = db.fetch_all()
            
            grid = {}
            for slot in slots:
                row = slot['row_num']
                if row not in grid:
                    grid[row] = []
                grid[row].append(slot)
            
            return grid
        finally:
            db.close()

    @staticmethod
    def count_by_status(status):
        db = get_db()
        try:
            db.execute("SELECT COUNT(*) as count FROM parking_slots WHERE status = %s", (status,))
            return db.fetch_one()['count']
        finally:
            db.close()
