# 📡 FitMind Backend API Documentation

## Base URL
```
http://localhost:8000
```

## Endpoints

### 1. Health Check
```
GET /
```
**Response:**
```json
{
  "message": "✅ FitMind AI Backend beží! 🚀",
  "firebase": "pripojené" | "odpojené"
}
```

---

### 2. AI Chat
```
POST /api/chat
```
**Request Body:**
```json
{
  "user_id": "string",
  "message": "string"
}
```

**Response:**
```json
{
  "odpoved": "string",
  "saved_entries": ["🍽️ Jedlo uložené"],
  "user_id": "string"
}
```

**Príklad:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "abc123", "message": "Zjedol som raňajky: 2 vajíčka, 200 kcal"}'
```

---

### 3. Get All Stats
```
GET /api/stats/{user_id}?days=30
```
**Parameters:**
- `user_id` (path) - ID používateľa
- `days` (query, optional) - Počet dní (default: 30)

**Response:**
```json
{
  "calories": {
    "total": 3500,
    "average": 500,
    "by_meal": {
      "breakfast": 800,
      "lunch": 1200,
      "dinner": 1500
    },
    "count": 7
  },
  "exercise": {
    "total_minutes": 180,
    "total_calories": 1200,
    "by_type": {
      "beh": 60,
      "posilňovanie": 120
    },
    "count": 5
  },
  "sleep": {
    "average_hours": 7.5,
    "total_hours": 52.5,
    "by_quality": {
      "good": 5,
      "fair": 2
    },
    "count": 7
  },
  "mood_trend": [
    {
      "date": "2025-12-20T10:00:00Z",
      "score": 4,
      "note": "Cítim sa dobre"
    }
  ],
  "stress_trend": [
    {
      "date": "2025-12-20T10:00:00Z",
      "level": 3,
      "source": "práca"
    }
  ],
  "weight_trend": [
    {
      "date": "2025-12-20T10:00:00Z",
      "weight": 75.5
    }
  ]
}
```

---

### 4. Get Chart Data
```
GET /api/chart/{user_id}/{chart_type}?days=30
```
**Parameters:**
- `user_id` (path) - ID používateľa
- `chart_type` (path) - Typ grafu: `calories`, `exercise`, `mood`, `stress`, `sleep`, `weight`
- `days` (query, optional) - Počet dní (default: 30)

**Response:**
```json
{
  "chart_type": "calories",
  "data": {
    "total": 3500,
    "average": 500,
    "by_meal": {
      "breakfast": 800,
      "lunch": 1200
    }
  },
  "days": 30
}
```

**Príklady:**
```bash
# Kalórie
GET /api/chart/abc123/calories?days=7

# Cvičenie
GET /api/chart/abc123/exercise?days=7

# Nálada
GET /api/chart/abc123/mood?days=30

# Stres
GET /api/chart/abc123/stress?days=30

# Spánok
GET /api/chart/abc123/sleep?days=7

# Váha
GET /api/chart/abc123/weight?days=90
```

---

### 5. Get Entries
```
GET /api/entries/{user_id}/{entry_type}?days=30&limit=100
```
**Parameters:**
- `user_id` (path) - ID používateľa
- `entry_type` (path) - Typ záznamu: `food`, `exercise`, `stress`, `mood`, `sleep`, `weight`
- `days` (query, optional) - Počet dní (default: 30)
- `limit` (query, optional) - Max počet záznamov (default: 100)

**Response:**
```json
{
  "entry_type": "food",
  "entries": [
    {
      "name": "Raňajky",
      "calories": 350,
      "protein": 20,
      "carbs": 30,
      "fats": 15,
      "mealType": "breakfast",
      "timestamp": "2025-12-20T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request data"
}
```

### 404 Not Found
```json
{
  "detail": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "AI chyba: ..."
}
```

---

## Frontend Integration

### TypeScript Service
```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChartsService {
  private apiUrl = 'http://localhost:8000/api';
  
  constructor(private http: HttpClient) {}
  
  getStats(userId: string, days: number = 30) {
    return this.http.get(`${this.apiUrl}/stats/${userId}?days=${days}`);
  }
  
  getChartData(userId: string, chartType: string, days: number = 30) {
    return this.http.get(`${this.apiUrl}/chart/${userId}/${chartType}?days=${days}`);
  }
}
```

---

## Testing

### cURL Examples
```bash
# Health check
curl http://localhost:8000/

# Get stats
curl http://localhost:8000/api/stats/abc123?days=7

# Get chart data
curl http://localhost:8000/api/chart/abc123/calories?days=7

# Chat
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "abc123", "message": "Ahoj"}'
```

### Postman Collection
Importuj do Postman alebo použij cURL príkazy vyššie.

---

## Rate Limiting
Aktuálne nie je implementované. Pre produkciu odporúčam pridať rate limiting.

---

## Authentication
Aktuálne používa `user_id` z Firebase Auth. Pre produkciu odporúčam pridať JWT token validáciu.






