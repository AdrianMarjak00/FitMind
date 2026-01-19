# 1. STAGE: Build Angular
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
# Pridáme Angular CLI, aby bol 'ng' príkaz dostupný
RUN npm install -g @angular/cli@19.1.5 
COPY . .
RUN npm run build -- --configuration production

# 2. STAGE: Python Backend
FROM python:3.11-slim
WORKDIR /app

# Inštalácia Python závislostí
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Skopíruj zvyšok kódu
COPY . .

# Skopíruj zostavený frontend
COPY --from=build-stage /app/dist /app/dist

# Exponuj port
EXPOSE 8080

# Spusti server
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 backend.main:app --worker-class uvicorn.workers.UvicornWorker
