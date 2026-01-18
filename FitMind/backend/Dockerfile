# FitMind Backend - Cloud Run Dockerfile
FROM python:3.11-slim

# Nastav working directory
WORKDIR /app

# Skopíruj requirements
COPY requirements.txt .

# Nainštaluj dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Skopíruj celý backend kód
COPY . .

# Exponuj port (Cloud Run používa $PORT)
EXPOSE 8080

# Spusti server s Gunicorn (production-ready)
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app --worker-class uvicorn.workers.UvicornWorker
