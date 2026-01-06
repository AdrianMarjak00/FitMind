# 🚀 FitMind - Rýchly štart

## 📋 Predpoklady

Pred spustením aplikácie sa uistite, že máte nainštalované:

- **Node.js** (v18 alebo vyššia) - [Stiahnuť](https://nodejs.org/)
- **Python** (3.9 alebo vyššia) - [Stiahnuť](https://www.python.org/)
- **Firebase projekt** - [Vytvoriť](https://console.firebase.google.com/)

---

## ⚡ Inštalácia za 5 minút

### 1️⃣ Naklonujte projekt
```bash
git clone <repository-url>
cd FitMind
```

### 2️⃣ Nainštalujte závislosti

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
pip install -r requirements.txt
```

### 3️⃣ Firebase konfigurácia

#### Frontend (`src/app/app.config.ts`)
```typescript
const firebaseConfig = {
    apiKey: "VÁŠA_API_KEY",
    authDomain: "VÁŠ_PROJECT.firebaseapp.com",
    projectId: "VÁŠ_PROJECT_ID",
    storageBucket: "VÁŠ_PROJECT.firebasestorage.app",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID",
    measurementId: "MEASUREMENT_ID"
};
```

#### Backend (`backend/firebase-service-account.json`)
Stiahnite service account JSON zo Firebase Console a vložte do `backend/` priečinka.

---

## 🎮 Spustenie

### Frontend (Terminal 1)
```bash
npm start
```
Aplikácia beží na: **http://localhost:4200**

### Backend (Terminal 2)
```bash
cd backend
python main.py
```
API beží na: **http://localhost:8000**

---

## 🎯 Prvé kroky

1. **Otvorte prehliadač**: `http://localhost:4200`
2. **Zaregistrujte sa**: Kliknite na "Registrácia"
3. **Prihláste sa**: Použite vytvorený účet
4. **Preskúmajte funkcie**:
   - 🏋️ Tréningové plány
   - 🍽️ Jedálničky
   - 📊 Dashboard
   - 🤖 AI Coach

---

## 🔧 Riešenie problémov

### Backend sa nespúšťa
```bash
# Overte Python verziu
python --version

# Preinštalujte závislosti
pip install -r requirements.txt --upgrade
```

### Frontend chyby
```bash
# Vyčistite cache
rm -rf node_modules package-lock.json
npm install
```

### Firebase chyby
- Skontrolujte `firebase-service-account.json`
- Overte Firebase config v `app.config.ts`
- Skontrolujte Firestore rules v Firebase Console

---

## 📚 Ďalšie kroky

- 📖 Prečítajte si [README.md](README.md) pre detailnú dokumentáciu
- 🔥 Nastavte Firestore databázu podľa `backend/README.md`
- 🎨 Prispôsobte dizajn v `src/styles.scss`

---

**Hotovo!** 🎉 Teraz môžete používať FitMind aplikáciu.

