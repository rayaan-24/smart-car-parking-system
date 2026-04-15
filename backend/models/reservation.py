from database.connection import get_db
from datetime import datetime

class Reservation:
    @staticmethod
    def create(user_id, slot_id, reservation_date, start_time, end_time, vehicle_plate=None):
        db = get_db()
        try:
            if Reservation.check_conflict(slot_id, reservation_date, start_time, end_time):
                raise ValueError("Time slot conflict: This slot is already reserved for the selected time")

            query = """
                INSERT INTO reservations 
                (user_id, slot_id, reservation_date, start_time, end_time, vehicle_plate, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'confirmed')
            """
            db.execute(query, (user_id, slot_id, reservation_date, start_time, end_time, vehicle_plate))
            db.commit()
            
            reservation_id = db.get_last_insert_id()
            
            db.execute("SELECT * FROM reservations WHERE id = %s", (reservation_id,))
            reservation = db.fetch_one()
            
            return reservation
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    @staticmethod
    def check_conflict(slot_id, reservation_date, start_time, end_time):
        db = get_db()
        try:
            query = """
                SELECT COUNT(*) as count FROM reservations
                WHERE slot_id = %s
                AND reservation_date = %s
                AND status IN ('pending', 'confirmed')
                AND NOT (end_time <= %s OR start_time >= %s)
            """
            db.execute(query, (slot_id, reservation_date, start_time, end_time))
            result = db.fetch_one()
            return result['count'] > 0
        finally:
            db.close()

    @staticmethod
    def get_user_reservations(user_id):
        db = get_db()
        try:
            query = """
                SELECT r.*, ps.slot_code, ps.row_num, ps.col_num, ps.entrance_distance
                FROM reservations r
                JOIN parking_slots ps ON r.slot_id = ps.id
                WHERE r.user_id = %s
                ORDER BY r.reservation_date DESC, r.start_time DESC
            """
            db.execute(query, (user_id,))
            return db.fetch_all()
        finally:
            db.close()

    @staticmethod
    def get_reservation_by_id(reservation_id):
        db = get_db()
        try:
            query = """
                SELECT r.*, ps.slot_code, u.name as user_name, u.email as user_email
                FROM reservations r
                JOIN parking_slots ps ON r.slot_id = ps.id
                JOIN users u ON r.user_id = u.id
                WHERE r.id = %s
            """
            db.execute(query, (reservation_id,))
            return db.fetch_one()
        finally:
            db.close()

    @staticmethod
    def update_status(reservation_id, status):
        db = get_db()
        try:
            query = "UPDATE reservations SET status = %s WHERE id = %s"
            db.execute(query, (status, reservation_id))
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    @staticmethod
    def cancel_reservation(reservation_id, user_id):
        db = get_db()
        try:
            query = "UPDATE reservations SET status = 'cancelled' WHERE id = %s AND user_id = %s"
            db.execute(query, (reservation_id, user_id))
            db.commit()
            return db.cursor.rowcount > 0
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    @staticmethod
    def get_today_reservations():
        db = get_db()
        try:
            query = """
                SELECT r.*, ps.slot_code, u.name as user_name, u.email as user_email
                FROM reservations r
                JOIN parking_slots ps ON r.slot_id = ps.id
                JOIN users u ON r.user_id = u.id
                WHERE r.reservation_date = CURDATE()
                ORDER BY r.start_time
            """
            db.execute(query)
            return db.fetch_all()
        finally:
            db.close()

    @staticmethod
    def get_all_reservations():
        db = get_db()
        try:
            query = """
                SELECT r.*, ps.slot_code, u.name as user_name, u.email as user_email
                FROM reservations r
                JOIN parking_slots ps ON r.slot_id = ps.id
                JOIN users u ON r.user_id = u.id
                ORDER BY r.reservation_date DESC, r.start_time DESC
            """
            db.execute(query)
            return db.fetch_all()
        finally:
            db.close()

    @staticmethod
    def get_active_reservations_count():
        db = get_db()
        try:
            query = """
                SELECT COUNT(*) as count FROM reservations
                WHERE status IN ('pending', 'confirmed')
                AND reservation_date = CURDATE()
            """
            db.execute(query)
            return db.fetch_one()['count']
        finally:
            db.close()
