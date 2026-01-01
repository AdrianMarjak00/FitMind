# 🔥 Firebase Setup Guide

> **📌 Rýchly Start:** Pre jednoduchý krok-za-krokom návod pozri [`FIREBASE_QUICK_SETUP.md`](../FIREBASE_QUICK_SETUP.md)

## Prečo Firebase Cloud?

Firebase poskytuje:
- ✅ **Firestore** - NoSQL databáza s real-time updates
- ✅ **Authentication** - Bezpečné prihlásenie
- ✅ **Hosting** - Rýchle CDN
- ✅ **Cloud Functions** - Serverless backend
- ✅ **Analytics** - Používateľské štatistiky

## Firebase Pricing (Blaze Plan - Pay as you go)

### Free Tier (Spark Plan):
- Firestore: 1 GB storage, 50K reads/day, 20K writes/day
- Auth: Neobmedzené
- Hosting: 10 GB storage, 360 MB/day transfer

### Paid Tier (Blaze Plan):
- Firestore: $0.18/GB storage, $0.06/100K reads, $0.18/100K writes
- Hosting: $0.026/GB storage, $0.15/GB transfer

**Odporúčanie**: Začni s Free tier, Firebase automaticky upozorní pri prekročení.

## Setup Krok za Krokom

### 1. Firebase Console Setup

1. Otvor [Firebase Console](https://console.firebase.google.com/)
2. Vyber projekt: `fitmind-dba6a`
3. Prejdi na **Project Settings** (⚙️ ikona)

### 2. Service Account (Pre Backend)

1. **Project Settings** > **Service Accounts**
2. Klikni **Generate new private key**
3. Stiahni JSON súbor
4. Premenuj na `firebase-service-account.json`
5. Umiestni do `backend/` priečinka

### 3. Firestore Security Rules

V **Firestore Database** > **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Používateľ môže čítať a písať len svoje dáta
    match /userFitnessProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subkolekcie
      match /{subcollection=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Admin môže čítať všetko
    match /{document=**} {
      allow read: if request.auth != null && 
        request.auth.token.email == 'adrianmarjak2156165@gmail.com';
    }
  }
}
```

### 4. Firestore Indexes

Firebase automaticky vytvorí indexy, ale môžeš ich pridať manuálne:

**V Firestore** > **Indexes** > **Create Index**:

1. Collection: `userFitnessProfiles/{userId}/foodEntries`
   - Fields: `timestamp` (Ascending)
   - Query scope: Collection

2. Opakuj pre všetky subkolekcie:
   - `exerciseEntries`
   - `stressEntries`
   - `moodEntries`
   - `sleepEntries`
   - `weightEntries`

### 5. Environment Variables

V `backend/.env`:
```env
OPENAI_API_KEY=sk-tvoj-key
PORT=8000
ENV=production
```

## Optimalizácia Firebase

### 1. Batch Operations
```python
# Namiesto viacerých jednotlivých zápisov
batch = db.batch()
for entry in entries:
    doc_ref = coll_ref.document()
    batch.set(doc_ref, entry)
batch.commit()
```

### 2. Caching
```python
# Cache často používané dáta
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_profile(user_id: str):
    return firebase.get_user_profile(user_id)
```

### 3. Pagination
```python
# Použi limit() a start_after() pre veľké kolekcie
query = coll_ref.order_by('timestamp').limit(20)
```

## Monitoring

### Firebase Console
- **Usage** - sledovanie spotreby
- **Performance** - rýchlosť queries
- **Alerts** - upozornenia pri prekročení

### Backend Logs
```python
# Pridaj logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
```

## Troubleshooting

### Chyba: Permission denied
- Skontroluj Security Rules
- Over či používateľ je prihlásený

### Chyba: Index required
- Firebase automaticky vytvorí index
- Alebo vytvor manuálne v Console

### Pomalé queries
- Pridaj indexy
- Obmedz počet dokumentov (limit)
- Použi pagination

## Cloud Hosting (Voliteľné)

### Firebase Hosting pre Frontend:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Cloud Run pre Backend:
```bash
# Vytvor Dockerfile
# Deploy na Google Cloud Run
gcloud run deploy fitmind-backend --source .
```

## Odporúčania

1. **Začni s Free tier** - stačí pre vývoj
2. **Monitoruj usage** - Firebase posiela upozornenia
3. **Optimalizuj queries** - používaj indexy
4. **Backup** - pravidelne exportuj dáta
5. **Security Rules** - vždy nastav správne

## Kontakt a Podpora

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Firebase Support](https://firebase.google.com/support)




