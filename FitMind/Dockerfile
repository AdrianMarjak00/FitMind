# Stage 1: Build Angular Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Build Python Backend
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=build-frontend /app/dist/FitMind/browser ./dist/FitMind/browser

# Set environment variables
ENV ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

# Expose port
EXPOSE 8000

# Spustenie cez gunicorn + uvicorn worker (produkčné nastavenie)
WORKDIR /app/backend
CMD ["gunicorn", "main:app", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--workers", "1"]
