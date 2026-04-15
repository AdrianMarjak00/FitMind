# Stage 1: Build Angular Frontend
FROM node:22-alpine AS build-frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Python Backend
FROM python:3.11-slim
WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=build-frontend /app/dist/FitMind/browser ./dist/FitMind/browser

ENV ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

WORKDIR /app/backend
CMD gunicorn main:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --workers 1 --timeout 120
