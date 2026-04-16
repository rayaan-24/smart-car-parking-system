-- =====================================================
-- SMART PARKING MANAGEMENT SYSTEM - DATABASE SCHEMA
-- =====================================================
-- This schema creates a normalized database for managing
-- parking slots, users, reservations, and activity logs.
-- =====================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS parking_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE parking_db;

-- =====================================================
-- TABLE 1: USERS
-- =====================================================
-- Stores all user accounts (both regular users and admins)
-- Password is hashed using bcrypt for security
-- =====================================================
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
) ENGINE=InnoDB;

-- =====================================================
-- TABLE 2: PARKING_SLOTS
-- =====================================================
-- Represents individual parking spots in the parking lot
-- Grid layout: row_num x col_num defines position
-- entrance_distance: distance from entrance (lower is better)
-- =====================================================
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
    INDEX idx_row_col (row_num, col_num),
    UNIQUE KEY uk_slot_position (row_num, col_num)
) ENGINE=InnoDB;

-- =====================================================
-- TABLE 3: RESERVATIONS
-- =====================================================
-- Tracks parking reservations made by users
-- Prevents double-booking with composite constraints
-- =====================================================
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
    INDEX idx_status (status),
    INDEX idx_user_date (user_id, reservation_date)
) ENGINE=InnoDB;

-- =====================================================
-- TABLE 4: ACTIVITY_LOGS
-- =====================================================
-- Audit trail for all user actions (security & monitoring)
-- =====================================================
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
) ENGINE=InnoDB;

-- =====================================================
-- TABLE 5: ADMIN_SETTINGS
-- =====================================================
-- Key-value store for system configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key)
) ENGINE=InnoDB;

-- =====================================================
-- SEED DATA: DEFAULT ADMIN USER
-- =====================================================
-- Default admin: admin@parking.com / admin123
-- Password hash generated using bcrypt
-- =====================================================
INSERT INTO users (name, email, password, role) VALUES
('System Administrator', 'admin@parking.com', '$2b$12$A0qZmb5sS.EE50Mc7JdoA.W411IwF67RaigZFnSp1xKGc3Nmw12EC', 'admin');

-- =====================================================
-- SEED DATA: PARKING SLOTS (3 rows x 10 columns = 30 slots)
-- =====================================================
-- Entrance at left side
-- Distance formula: base 50 + (col * 10) + row_offset
-- Row A offset: 0, Row B offset: 170, Row C offset: 280
-- =====================================================
INSERT INTO parking_slots (slot_code, row_num, col_num, status, slot_type, entrance_distance) VALUES
-- Row A (offset: 0, distance: 50 + col*10)
('A1', 0, 0, 'available', 'standard', 50.0),
('A2', 0, 1, 'available', 'standard', 60.0),
('A3', 0, 2, 'available', 'standard', 70.0),
('A4', 0, 3, 'available', 'compact', 80.0),
('A5', 0, 4, 'available', 'compact', 90.0),
('A6', 0, 5, 'available', 'compact', 100.0),
('A7', 0, 6, 'available', 'standard', 110.0),
('A8', 0, 7, 'available', 'standard', 120.0),
('A9', 0, 8, 'available', 'electric', 130.0),
('A10', 0, 9, 'available', 'electric', 140.0),

-- Row B (offset: 170, distance: 220 + col*10)
('B1', 1, 0, 'available', 'standard', 220.0),
('B2', 1, 1, 'available', 'standard', 230.0),
('B3', 1, 2, 'available', 'standard', 240.0),
('B4', 1, 3, 'available', 'compact', 250.0),
('B5', 1, 4, 'available', 'compact', 260.0),
('B6', 1, 5, 'available', 'compact', 270.0),
('B7', 1, 6, 'available', 'standard', 280.0),
('B8', 1, 7, 'available', 'standard', 290.0),
('B9', 1, 8, 'available', 'standard', 300.0),
('B10', 1, 9, 'available', 'handicap', 310.0),

-- Row C (offset: 280, distance: 330 + col*10)
('C1', 2, 0, 'available', 'standard', 330.0),
('C2', 2, 1, 'available', 'standard', 340.0),
('C3', 2, 2, 'available', 'standard', 350.0),
('C4', 2, 3, 'available', 'standard', 360.0),
('C5', 2, 4, 'available', 'standard', 370.0),
('C6', 2, 5, 'available', 'standard', 380.0),
('C7', 2, 6, 'available', 'standard', 390.0),
('C8', 2, 7, 'available', 'standard', 400.0),
('C9', 2, 8, 'available', 'standard', 410.0),
('C10', 2, 9, 'available', 'standard', 420.0);

-- =====================================================
-- SEED DATA: ADMIN SETTINGS
-- =====================================================
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
('parking_lot_name', 'Smart Parking System', 'Name of the parking facility'),
('max_reservation_hours', '8', 'Maximum hours a user can reserve'),
('slot_assignment_mode', 'ai', 'Slot assignment mode: ai or nearest'),
('ga_population_size', '20', 'Genetic Algorithm population size'),
('ga_generations', '50', 'Genetic Algorithm number of generations'),
('ga_mutation_rate', '0.1', 'Genetic Algorithm mutation rate'),
('ga_crossover_rate', '0.8', 'Genetic Algorithm crossover rate'),
('refresh_interval', '5', 'Frontend refresh interval in seconds');

-- =====================================================
-- VIEW: PARKING SUMMARY
-- =====================================================
-- Provides quick overview of parking statistics
-- =====================================================
CREATE OR REPLACE VIEW parking_summary AS
SELECT 
    COUNT(*) as total_slots,
    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_slots,
    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_slots,
    SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved_slots,
    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_slots,
    ROUND(SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as availability_percentage
FROM parking_slots;

-- =====================================================
-- VIEW: TODAY'S RESERVATIONS
-- =====================================================
-- Shows all reservations for today
-- =====================================================
CREATE OR REPLACE VIEW today_reservations AS
SELECT 
    r.id,
    u.name as user_name,
    u.email as user_email,
    ps.slot_code,
    ps.row_num,
    ps.col_num,
    r.reservation_date,
    r.start_time,
    r.end_time,
    r.status,
    r.vehicle_plate
FROM reservations r
JOIN users u ON r.user_id = u.id
JOIN parking_slots ps ON r.slot_id = ps.id
WHERE r.reservation_date = CURDATE()
ORDER BY r.start_time;
