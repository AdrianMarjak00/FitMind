# 1. STAGE: Build Angular
FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
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

# Skopíruj zostavený frontend z predchádzajúceho kroku
COPY --from=build-stage /app/dist /app/dist

# Exponuj port
EXPOSE 8080

# Spusti gunicorn, ktorý teraz obslúži API aj Web
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app --worker-class uvicorn.workers.UvicornWorker
