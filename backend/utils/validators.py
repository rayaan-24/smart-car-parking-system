import re
from datetime import datetime

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    return True, ""

def validate_name(name):
    if not name or len(name.strip()) < 2:
        return False, "Name must be at least 2 characters long"
    return True, ""

def validate_time_format(time_str):
    formats = ['%H:%M', '%H:%M:%S', '%I:%M %p', '%I:%M:%S %p']
    for fmt in formats:
        try:
            datetime.strptime(time_str, fmt)
            return True, ""
        except ValueError:
            continue
    return False, "Invalid time format. Use HH:MM"

def validate_date_format(date_str):
    formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']
    for fmt in formats:
        try:
            datetime.strptime(date_str, fmt)
            return True, ""
        except ValueError:
            continue
    return False, "Invalid date format. Use YYYY-MM-DD"

def validate_registration_data(data):
    errors = []
    
    if 'name' not in data or not data['name']:
        errors.append("Name is required")
    else:
        valid, msg = validate_name(data['name'])
        if not valid:
            errors.append(msg)
    
    if 'email' not in data or not data['email']:
        errors.append("Email is required")
    else:
        if not validate_email(data['email']):
            errors.append("Invalid email format")
    
    if 'password' not in data or not data['password']:
        errors.append("Password is required")
    else:
        valid, msg = validate_password(data['password'])
        if not valid:
            errors.append(msg)
    
    return len(errors) == 0, errors

def validate_reservation_data(data):
    errors = []
    
    if 'slot_id' not in data or not data['slot_id']:
        errors.append("Slot ID is required")
    
    reservation_date = data.get('reservation_date') or data.get('date')
    if not reservation_date:
        errors.append("Reservation date is required")
    else:
        valid, msg = validate_date_format(reservation_date)
        if not valid:
            errors.append(msg)
    
    if 'start_time' not in data or not data['start_time']:
        errors.append("Start time is required")
    else:
        valid, msg = validate_time_format(data['start_time'])
        if not valid:
            errors.append(msg)
    
    if 'end_time' not in data or not data['end_time']:
        errors.append("End time is required")
    else:
        valid, msg = validate_time_format(data['end_time'])
        if not valid:
            errors.append(msg)
    
    if 'start_time' in data and 'end_time' in data:
        for fmt in ['%H:%M', '%H:%M:%S', '%I:%M %p', '%I:%M:%S %p']:
            try:
                start = datetime.strptime(data['start_time'], fmt)
                end = datetime.strptime(data['end_time'], fmt)
                if end <= start:
                    errors.append("End time must be after start time")
                break
            except ValueError:
                continue
    
    return len(errors) == 0, errors
