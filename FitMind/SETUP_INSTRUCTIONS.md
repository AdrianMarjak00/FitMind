# 🛠️ FitMind Setup Instructions

## 📋 Predpoklady

Pred začatím sa uistite, že máte:

- ✅ **Node.js** (v18+) - [Stiahnuť](https://nodejs.org/)
- ✅ **Python** (3.9+) - [Stiahnuť](https://www.python.org/)
- ✅ **npm** alebo **yarn**
- ✅ **Firebase projekt** - [Vytvoriť](https://console.firebase.google.com/)
- ✅ **OpenAI API kľúč** - [Získať](https://platform.openai.com/api-keys)

---

## 🔧 Krok po Kroku Inštalácia

### 1. Klonujte projekt

```bash
git clone <repository-url>
cd FitMind
```

### 2. Nainštalujte Frontend závislosti

```bash
npm install
```

### 3. Nainštalujte Backend závislosti

```bash
cd backend
pip install -r ../requirements.txt
```

### 4. Nastavte Firebase

#### A) Firebase Admin SDK (Backend)

1. Choďte do [Firebase Console](https://console.firebase.google.com/)
2. Vyberte váš projekt
3. **Project Settings** (⚙️) → **Service accounts**
4. Kliknite **Generate new private key**
5. Stiahnite JSON súbor
6. Premenujte ho na `firebase-service-account.json`
7. Umiestnite ho do `backend/` priečinka

**Štruktúra:**
```
backend/
  ├── firebase-service-account.json  ← Tu!
  ├── main.py
  └── ...
```

#### B) Firebase Config (Frontend)

1. V Firebase Console → **Project Settings** → **General**
2. Scroll dolu na **Your apps** → Web app
3. Skopírujte Firebase config
4. Otvorte `src/app/app.config.ts`
5. Nahraďte config:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

### 5. Nastavte OpenAI API

1. Získajte API kľúč na [OpenAI Platform](https://platform.openai.com/api-keys)
2. Vytvorte súbor `backend/.env`:

```bash
# V backend/ priečinku
touch .env  # Linux/Mac
# alebo
type nul > .env  # Windows
```

3. Otvorte `backend/.env` a pridajte:

```bash
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
PORT=8000
ENV=development
```

**⚠️ DÔLEŽITÉ:** Nikdy necommitujte `.env` do Git!

### 6. Nastavte Firestore Database

#### A) Vytvorte databázu

1. Firebase Console → **Firestore Database**
2. Kliknite **Create database**
3. Vyberte **Production mode**
4. Vyberte region (napr. `europe-west1`)

#### B) Nastavte Security Rules

V Firebase Console → Firestore → **Rules**, vložte:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Používateľské profily - len vlastník môže čítať/písať
    match /userFitnessProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subkolekcie (jedlo, cvičenie, chat história atď.)
      match /{subcollection}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Admini - len admini môžu čítať
    match /admins/{userId} {
      allow read: if request.auth != null;
      allow write: if false; // Len cez admin panel
    }
    
    // Recenzie - všetci môžu čítať, len prihlásení môžu písať
    match /reviews/{reviewId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 7. Nastavte Firebase Authentication

1. Firebase Console → **Authentication**
2. Kliknite **Get started**
3. **Sign-in method** → **Email/Password** → **Enable**

---

## ▶️ Spustenie Aplikácie

### Backend

```bash
cd backend
python main.py
```

✅ Server beží na `http://localhost:8000`

**Overenie:**
```bash
curl http://localhost:8000/
# Očakávaná odpoveď:
# {"message":"FitMind AI Backend bezi!","firebase":"pripojene"}
```

### Frontend

V novom termináli:
```bash
npm start
# alebo
ng serve
```

✅ Aplikácia beží na `http://localhost:4200`

---

## 🧪 Testovanie

### Backend API Test

```bash
# Health check
curl http://localhost:8000/

# Chat test
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test123", "message": "Ahoj"}'

# Stats test
curl http://localhost:8000/api/stats/test123?days=7
```

### Frontend Test

1. Otvorte `http://localhost:4200`
2. Registrujte nový účet
3. Vyplňte profil
4. Otvorte AI Chat
5. Napíšte: "Zjedol som raňajky: 2 vajíčka, 200 kcal"
6. Skontrolujte či AI odpovedá a ukladá dáta

---

## 🔍 Overenie Inštalácie

### Checklist

- [ ] Backend server beží na port 8000
- [ ] Frontend beží na port 4200
- [ ] Firebase pripojenie: "pripojene"
- [ ] Môžem sa zaregistrovať/prihlásiť
- [ ] AI chat odpovedá
- [ ] Dáta sa ukladajú do Firestore
- [ ] Vidím svoje pokroky v "Moje pokroky" paneli

### Firestore Overenie

1. Firebase Console → Firestore Database
2. Po chat konverzácii by ste mali vidieť:
   - `userFitnessProfiles/{vašeUID}/`
   - `chatHistory/{messageId}`
   - `foodEntries/{entryId}` (ak ste pridali jedlo)

---

## 🐛 Riešenie Problémov

### Backend sa nespustí

**Problém:** `ModuleNotFoundError: No module named 'fastapi'`

**Riešenie:**
```bash
cd backend
pip install -r ../requirements.txt
```

---

**Problém:** `firebase_admin.exceptions.InvalidArgumentError`

**Riešenie:**
- Skontrolujte `firebase-service-account.json` v `backend/` priečinku
- Overte že je to správny súbor z vášho Firebase projektu

---

**Problém:** `openai.AuthenticationError`

**Riešenie:**
- Skontrolujte `OPENAI_API_KEY` v `backend/.env`
- Overte že kľúč je platný na [OpenAI Platform](https://platform.openai.com/api-keys)

---

### Frontend sa nespustí

**Problém:** `Error: Cannot find module '@angular/core'`

**Riešenie:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

**Problém:** `Firebase: Error (auth/configuration-not-found)`

**Riešenie:**
- Skontrolujte Firebase config v `src/app/app.config.ts`
- Overte že všetky hodnoty sú správne z Firebase Console

---

### AI neodpovedá

**Problém:** Backend vracia chybu 500

**Riešenie:**
1. Pozrite logy:
   ```bash
   cat backend/logs/error.log
   ```
2. Skontrolujte OPENAI_API_KEY
3. Overte kredit na OpenAI účte

---

**Problém:** "Backend server nebeží"

**Riešenie:**
1. Overte že backend beží:
   ```bash
   curl http://localhost:8000/
   ```
2. Ak nie, spustite:
   ```bash
   cd backend
   python main.py
   ```

---

### Dáta sa neukladajú

**Problém:** AI odpovedá, ale dáta nie sú vo Firestore

**Riešenie:**
1. Skontrolujte Firestore Rules (musia povoliť zápis)
2. Pozrite browser console (F12) pre chyby
3. Overte Firebase pripojenie v backendu

---

## 📊 Údržba

### Logy

Backend logy:
```bash
# Error logy
cat backend/logs/error.log

# Output logy
cat backend/logs/out.log
```

### Backup

**Firestore:**
```bash
# Cez Firebase Console → Firestore → Export/Import
```

**Lokálne súbory:**
```bash
# Zálohujte dôležité súbory
cp backend/.env backend/.env.backup
cp backend/firebase-service-account.json backend/firebase-service-account.json.backup
```

---

## 🚀 Produkčné Nasadenie

### Backend (napr. Heroku, Railway, Render)

1. Nastavte environment variables:
   - `OPENAI_API_KEY`
   - `PORT` (zvyčajne automaticky)
   - `ENV=production`

2. Pridajte `firebase-service-account.json` do secrets

3. Deploy:
   ```bash
   # Príklad pre Railway
   railway up
   ```

### Frontend (napr. Vercel, Netlify, Firebase Hosting)

1. Build:
   ```bash
   npm run build
   ```

2. Deploy `dist/` priečinok

3. Aktualizujte Firebase config pre produkčnú doménu

---

## 📞 Podpora

Ak máte problémy:

1. 📖 Prečítajte si [AI Coach Guide](AI_COACH_GUIDE.md)
2. 🚀 Pozrite [Quick Start](QUICK_START_AI_COACH.md)
3. 📡 Skontrolujte [API Dokumentáciu](backend/API_DOCUMENTATION.md)
4. 💬 Otvorte GitHub Issue

---

**Želáme úspešnú inštaláciu! 🎉**

