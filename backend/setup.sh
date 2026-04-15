#!/bin/bash

echo "========================================="
echo "Smart Parking System - Setup Script"
echo "========================================="
echo ""

echo "[1/5] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python is not installed"
    exit 1
fi
echo "OK - Python found"

echo ""
echo "[2/5] Installing dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo "OK - Dependencies installed"

echo ""
echo "[3/5] Checking MySQL connection..."
echo "Please enter your MySQL credentials in the .env file"
echo ""

echo "[4/5] To initialize database, run:"
echo "mysql -u root -p < database/schema.sql"
echo ""

echo "[5/5] Setup complete!"
echo ""
echo "========================================="
echo "Next steps:"
echo "1. Create database: mysql -u root -p < database/schema.sql"
echo "2. Update .env with your MySQL password"
echo "3. Run: python3 app.py"
echo "4. Open: http://localhost:5000"
echo ""
echo "Admin credentials:"
echo "Email: admin@parking.com"
echo "Password: admin123"
echo "========================================="
