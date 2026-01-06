# 🏋️ FitMind - Fitness & Wellness Platform

**FitMind** je moderná webová aplikácia pre fitness a wellness, ktorá kombinuje tréningové plány, jedálničky a **pokročilý AI coaching** do jedného komplexného ekosystému.

---

## 🆕 Verzia 2.0 - Personal Coach Edition

**Nové funkcie AI Coacha:**
- 🧠 **Konverzačná pamäť** - AI si pamätá celú históriu vašich konverzácií
- 📊 **Týždenné & mesačné reporty** - Automatické vyhodnocovanie pokroku
- 🎯 **Sledovanie cieľov** - Real-time monitoring vašich fitness cieľov
- 💡 **Personalizované odporúčania** - Rady šité presne na vašu situáciu
- 📈 **Analýza trendov** - Inteligentné rozpoznávanie vašich pokrokov

➡️ **[Pozri detailný AI Coach Guide](AI_COACH_GUIDE.md)**

---

## ✨ Funkcie

### 🎯 Hlavné funkcie
- **Dashboard** - Personalizovaný prehľad vašich fitness dát
- **AI Coach 2.0** - Pokročilý osobný tréner s pamäťou konverzácií 🆕
- **Tréningové plány** - Prispôsobené tréningy pre rôzne úrovne
- **Jedálničky** - Nutričné plány na mieru
- **Analýza** - Vizualizácia štatistík a pokroku
- **Recenzie** - Hodnotenia od používateľov

### 🔐 Autentifikácia
- Firebase Authentication
- Registrácia a prihlásenie
- Admin guard pre chránené stránky

---

## 🚀 Technológie

### Frontend
- **Angular 19** (standalone components)
- **Angular Material** - UI komponenty
- **NgxEcharts** - Grafy a vizualizácie
- **Firebase** - Autentifikácia a databáza
- **RxJS** - Reaktívne programovanie
- **SCSS** - Styling

### Backend
- **Python FastAPI** - REST API
- **Firebase Admin SDK** - Databázové operácie
- **Firestore** - NoSQL databáza

---

## 📦 Inštalácia

### Požiadavky
- Node.js (v18+)
- npm alebo yarn
- Python 3.9+
- Firebase projekt

### 1. Klonovanie projektu
```bash
git clone <repository-url>
cd FitMind
```

### 2. Inštalácia frontend závislostí
```bash
npm install
```

### 3. Inštalácia backend závislostí
```bash
cd backend
pip install -r ../requirements.txt
```

### 4. Firebase konfigurácia

#### Frontend (`src/app/app.config.ts`)
Skontrolujte, či máte správne Firebase credentials:
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

#### Backend (`backend/firebase-service-account.json`)
Pridajte váš Firebase service account JSON súbor.

---

## 🎮 Spustenie aplikácie

### Frontend
```bash
# Development server
npm start
# alebo
ng serve

# Build pre produkciu
npm run build
```

Aplikácia beží na `http://localhost:4200`

### Backend
```bash
# Z hlavného priečinku
cd backend

# Spustenie
python main.py

# Alebo použite PowerShell skript
.\start.ps1
```

Backend API beží na `http://localhost:8000`

---

## 📁 Štruktúra projektu

```
FitMind/
├── src/
│   ├── app/
│   │   ├── ai-chat/          # AI Coach komponenta
│   │   ├── dashboard/        # Dashboard s grafmi
│   │   ├── home/             # Domovská stránka
│   │   ├── login/            # Prihlásenie
│   │   ├── register/         # Registrácia
│   │   ├── training/         # Tréningové plány
│   │   ├── jedalnicek/       # Jedálničky
│   │   ├── reviews/          # Recenzie
│   │   ├── piechart/         # Admin analýza
│   │   ├── contact/          # Kontaktný formulár
│   │   ├── services/         # Angular služby
│   │   ├── models/           # TypeScript interfaces
│   │   ├── Shared/           # Zdieľané komponenty (header, footer)
│   │   └── guards/           # Route guards
│   ├── environments/         # Environment konfigurácie
│   └── styles.scss          # Globálne štýly
├── backend/
│   ├── main.py              # FastAPI server
│   ├── ai_service.py        # AI služby
│   ├── firebase_service.py  # Firebase integrácia
│   ├── stats_service.py     # Štatistiky
│   └── logs/                # Logy
├── scripts/                 # Seed skripty
└── public/                  # Statické súbory
```

---

## 🎨 Design

Aplikácia používa **tmavý motív** s **zeleným akcentom** (#3ddc84):
- Moderný, minimalistický dizajn
- Plne responzívny layout
- Smooth animácie a prechody
- Material Design princípy

---

## 🔒 Bezpečnosť

- Firebase Authentication pre zabezpečenie používateľov
- Admin Guard pre chránené routes
- Firestore security rules
- HTTPS v produkcii

---

## 📊 API Endpoints

### Backend API (`http://localhost:8000`)

| Endpoint | Metóda | Popis |
|----------|--------|-------|
| `/api/chat` | POST | AI chat s konverzačnou pamäťou 🆕 |
| `/api/coach/weekly-report/{userId}` | GET | Týždenný report 🆕 |
| `/api/coach/monthly-report/{userId}` | GET | Mesačný report 🆕 |
| `/api/coach/recommendations/{userId}` | GET | Personalizované odporúčania 🆕 |
| `/api/coach/goal-progress/{userId}` | GET | Pokrok k cieľom 🆕 |
| `/api/chat/history/{userId}` | GET | Chat história 🆕 |
| `/api/stats/{userId}` | GET | Používateľské štatistiky |
| `/api/chart/{userId}/{type}` | GET | Dáta pre grafy |
| `/api/entries/{userId}/{type}` | GET | Záznamy používateľa |

➡️ **[Úplná API dokumentácia](backend/API_DOCUMENTATION.md)**

---

## 🛠️ Vývoj

### Príkazy

```bash
# Development server
npm start

# Build
npm run build

# Testy
npm test

# Linting
ng lint
```

### Nový komponent
```bash
ng generate component <názov>
```

### Nová služba
```bash
ng generate service services/<názov>
```

---

## 📝 Databázová štruktúra (Firestore)

### Collections:
- **`users`** - Používateľské profily
- **`admins`** - Admin oprávnenia
- **`reviews`** - Recenzie
- **`stats`** - Štatistiky
- **`userFitnessProfiles/{userId}`** - Fitness profily používateľov 🆕
  - `goals` - Ciele používateľa
  - `targetWeight` - Cieľová váha
  - `targetCalories` - Denný kalorický cieľ
  - **Subkolekcie:**
    - `foodEntries` - Jedlo
    - `exerciseEntries` - Cvičenie
    - `moodEntries` - Nálada
    - `stressEntries` - Stres
    - `sleepEntries` - Spánok
    - `weightEntries` - Váha
    - `chatHistory` - Chat história 🆕

---

## 🚧 Riešenie problémov

### Backend server nebeží
```bash
cd backend
python main.py
```

### Firebase chyby
1. Skontrolujte `firebase-service-account.json`
2. Overte Firebase config v `app.config.ts`
3. Skontrolujte Firestore pravidlá

### Build chyby
```bash
# Vyčistite cache
rm -rf node_modules package-lock.json
npm install
```

---

## 📄 Licencia

MIT License - Projekt je open-source a voľne použiteľný.

---

## 👨‍💻 Autor

FitMind Development Team

---

## 🤝 Príspevky

Pull requesty sú vítané! Pre väčšie zmeny prosím najskôr otvorte issue.

---

## 📞 Kontakt

Pre otázky a podporu použite kontaktný formulár v aplikácii.

---

**Verzia:** 1.0.0  
**Posledná aktualizácia:** Január 2026
