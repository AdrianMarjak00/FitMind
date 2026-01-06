# 📡 FitMind Backend API Documentation

## Base URL
```
http://localhost:8000
```

## 🆕 Verzia 2.0 - Personal Coach Edition

Nové funkcie:
- 🧠 Konverzačná história a pamäť
- 📊 Týždenné a mesačné reporty
- 🎯 Sledovanie pokroku k cieľom
- 💡 Personalizované odporúčania

---

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

### 2. AI Chat (vylepšené)
```
POST /api/chat
```
**Nové vlastnosti:**
- Automaticky ukladá konverzačnú históriu
- Používa kontext predchádzajúcich správ
- Inteligentnejšie odpovede s personalizáciou

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
  "saved_entries": ["🍽️ Jedlo uložené", "😊 Nálada uložená"],
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

---

## 🆕 Personal Coach Endpoints

### 6. Weekly Report
```
GET /api/coach/weekly-report/{user_id}
```
**Response:**
```json
{
  "user_id": "abc123",
  "report": {
    "period": "weekly",
    "week_start": "2026-01-01T00:00:00Z",
    "week_end": "2026-01-08T00:00:00Z",
    "summary": {
      "calories": {
        "total": 14000,
        "daily_average": 2000,
        "days_tracked": 7
      },
      "exercise": {
        "total_minutes": 180,
        "workout_count": 5
      }
    },
    "achievements": [
      "🎯 Dodržal si kalorický cieľ",
      "💪 5 tréningov tento týždeň"
    ],
    "areas_to_improve": [
      "⚠️ Nedostatok spánku (6.2h)"
    ],
    "recommendations": [
      "Snaž sa spať aspoň 7-8 hodín denne"
    ],
    "goal_progress": {
      "calories": {
        "target": 2000,
        "actual": 2000,
        "on_track": true
      }
    },
    "overall_rating": "excellent",
    "overall_message": "🌟 Excelentný týždeň!"
  }
}
```

---

### 7. Monthly Report
```
GET /api/coach/monthly-report/{user_id}
```
**Response:**
```json
{
  "user_id": "abc123",
  "report": {
    "period": "monthly",
    "summary": {
      "calories": {
        "total": 60000,
        "daily_average": 2000,
        "consistency": "87%"
      },
      "exercise": {
        "total_minutes": 800,
        "total_workouts": 20,
        "avg_per_week": 4.7
      },
      "weight": {
        "current": 75.5,
        "month_change": -2.5,
        "trend": "decreasing"
      }
    },
    "achievements": [
      "💪 20 tréningov za mesiac - si beast!"
    ]
  }
}
```

---

### 8. Personalized Recommendations
```
GET /api/coach/recommendations/{user_id}
```
**Response:**
```json
{
  "user_id": "abc123",
  "recommendations": [
    "🔥 Pre chudnutie: Kombinácia kardio (3-4x) + silový tréning (2-3x)",
    "🍎 Calorický deficit 300-500 kcal denne",
    "💧 Hydratácia: min. 2-3L vody denne"
  ],
  "count": 3
}
```

---

### 9. Goal Progress
```
GET /api/coach/goal-progress/{user_id}
```
**Response:**
```json
{
  "user_id": "abc123",
  "goals": ["schudnúť 5kg", "získať svalovú hmotu"],
  "progress_items": [
    {
      "goal": "Cieľová váha",
      "target": "75 kg",
      "current": "77.5 kg",
      "difference": "-2.5 kg",
      "percentage": 50,
      "on_track": true
    },
    {
      "goal": "Denný kalorický cieľ",
      "target": "2000 kcal",
      "current": "1950 kcal",
      "difference": "-50 kcal",
      "percentage": 97.5,
      "on_track": true
    }
  ]
}
```

---

### 10. Chat History
```
GET /api/chat/history/{user_id}?limit=50
```
**Response:**
```json
{
  "user_id": "abc123",
  "messages": [
    {
      "role": "user",
      "content": "Zjedol som raňajky"
    },
    {
      "role": "assistant",
      "content": "Super! Raňajky uložené."
    }
  ],
  "count": 2
}
```

---

### 11. Clear Chat History
```
DELETE /api/chat/history/{user_id}
```
**Response:**
```json
{
  "success": true,
  "message": "Chat historia vymazana",
  "user_id": "abc123"
}
```

---

## Rate Limiting
Aktuálne nie je implementované. Pre produkciu odporúčam pridať rate limiting.

---

## Authentication
Aktuálne používa `user_id` z Firebase Auth. Pre produkciu odporúčam pridať JWT token validáciu.

---

## 📚 Ďalšia Dokumentácia

- [AI Coach Guide](../AI_COACH_GUIDE.md) - Podrobný návod na AI kouča
- [README.md](../README.md) - Hlavná dokumentácia projektu
- [Firebase Setup](FIREBASE_SETUP.md) - Nastavenie Firebase






