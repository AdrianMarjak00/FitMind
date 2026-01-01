# FitMind Backend - Rýchly Start

## 🚀 Spustenie

```bash
cd backend
python main.py
```

Backend beží na: `http://localhost:8000`

## 📋 Setup Databázy

**Prvé spustenie:**
```bash
python setup_database.py
```

Zadaj:
- User ID (Firebase Auth UID)
- Email (voliteľné)
- Vytvoriť admin účet? (y/n)

## 🔥 Firebase Setup

1. Stiahni `firebase-service-account.json` z Firebase Console
2. Umiestni do `backend/` adresára
3. Spusti `setup_database.py`

## 📡 API Endpoints

### AI Chat
```
POST /api/chat
Body: { "user_id": "...", "message": "..." }
```

### Profil
```
GET /api/profile/{user_id}        # Načíta profil
POST /api/profile                 # Uloží profil (onboarding)
```

### Štatistiky
```
GET /api/stats/{user_id}?days=30
GET /api/chart/{user_id}/{chart_type}?days=30
GET /api/entries/{user_id}/{entry_type}?days=30&limit=100
```

### Admin
```
GET /api/admin/check/{user_id}
GET /api/admin/list
POST /api/admin/add
```

## ⚙️ Environment Variables

Vytvor `.env` súbor:
```
OPENAI_API_KEY=sk-...
PORT=8000
ENV=development
```

## 🐛 Problémy

**Invalid JWT Signature:**
- Stiahni nový `firebase-service-account.json` z Firebase Console

**Port 8000 už používaný:**
- Zatvor iný proces alebo zmeň PORT v `.env`



