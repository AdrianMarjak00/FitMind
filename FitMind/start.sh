#!/bin/sh
# FitMind Backend Startup Script for Railpack

# Skontroluj requirements
cd backend
python -m pip install --upgrade pip -q
pip install -r requirements.txt -q

# Spusti server
echo "Starting FitMind Backend..."
uvicorn main:app --host 0.0.0.0 --port $PORT
