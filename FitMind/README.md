# 🧠 FitMind - AI-Powered Fitness & Mental Health Coach

<div align="center">

![FitMind Logo](https://img.shields.io/badge/FitMind-AI%20Coach-3ddc84?style=for-the-badge)

**Personalizovaný AI fitness coach, ktorý sleduje tvoju stravu, cvičenie, stres a náladu**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Usage](#-usage) • [Contributing](#-contributing)

</div>

---

## 📖 O Projekte

FitMind je moderná webová aplikácia, ktorá kombinuje AI technológie s fitness trackingom. Aplikácia používa OpenAI GPT-4o-mini na poskytovanie personalizovaných rád a automatické sledovanie používateľských dát prostredníctvom prirodzenej konverzácie.

### Hlavné Funkcie

- 🤖 **AI Coach** - Konverzácia s AI, ktorá rozumie tvojmu životnému štýlu
- 📊 **Automatické Sledovanie** - AI automaticky rozpozná a uloží jedlo, cvičenie, stres, náladu, spánok
- 🔥 **Firebase Integrácia** - Bezpečné ukladanie dát v cloude
- 📈 **Personalizácia** - AI používa tvoju históriu na lepšie rady
- 🔐 **Autentifikácia** - Bezpečné prihlásenie cez Firebase Auth

---

## ✨ Features

### 🎯 Fitness Tracking
- **Jedlo**: Automatické sledovanie kalórií, bielkovín, sacharidov, tukov
- **Cvičenie**: Typ, trvanie, intenzita, spálené kalórie
- **Váha**: Historické záznamy váhy

### 🧘 Wellness Tracking
- **Stres**: Úroveň stresu (1-10) s poznámkami
- **Nálada**: Denné hodnotenie nálady (1-5)
- **Spánok**: Hodiny spánku a kvalita

### 🤖 AI Capabilities
- Rozpozná dáta z prirodzenej konverzácie
- Automaticky ukladá záznamy do databázy
- Poskytuje personalizované rady na základe histórie
- Empatické a motivujúce odpovede

---

## 🛠️ Tech Stack

### Frontend
- **Angular 20** - Moderný webový framework
- **TypeScript** - Type-safe JavaScript
- **SCSS** - Styling
- **Angular Material** - UI komponenty
- **RxJS** - Reactive programming
- **Chart.js** - Grafy a vizualizácie

### Backend
- **FastAPI** - Moderný Python web framework
- **OpenAI GPT-4o-mini** - AI model
- **Uvicorn** - ASGI server

### Database & Services
- **Firebase Firestore** - NoSQL databáza
- **Firebase Authentication** - User management
- **Firebase Admin SDK** - Backend Firebase prístup

---

## 📋 Požiadavky

### Frontend
- Node.js 18+ 
- npm alebo yarn
- Angular CLI (voliteľné)

### Backend
- Python 3.9+
- pip
- OpenAI API kľúč
- Firebase Service Account JSON

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/fitmind.git
cd fitmind
```

### 2. Frontend Setup

```bash
# Inštalácia závislostí
npm install

# Spustenie development servera
ng serve
# alebo
npm start
```

Frontend bude dostupný na `http://localhost:4200`

### 3. Backend Setup

```bash
cd backend

# Vytvorenie virtual environment (odporúčané)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Inštalácia závislostí
pip install -r requirements.txt

# Vytvorenie .env súboru
echo "OPENAI_API_KEY=your_api_key_here" > .env

# Umiestnenie Firebase Service Account
# Skopíruj firebase-service-account.json do backend/ priečinka

# Spustenie servera
python main.py
```

Backend bude dostupný na `http://localhost:8000`

### 4. Firebase Configuration

1. Vytvor Firebase projekt na [Firebase Console](https://console.firebase.google.com/)
2. Povoľ Firebase Authentication (Email/Password)
3. Vytvor Firestore databázu
4. Stiahni Service Account Key a umiestni do `backend/firebase-service-account.json`
5. Aktualizuj `src/app/app.config.ts` s tvojimi Firebase credentials

---

## 💻 Usage

### Spustenie Aplikácie

#### Development Mode

**Terminál 1 - Frontend:**
```bash
npm start
```

**Terminál 2 - Backend:**
```bash
cd backend
python main.py
```

#### Production Mode (Backend)

**PM2 (Odporúčané):**
```bash
npm install -g pm2
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Windows Service:**
```bash
# Spusti ako Administrator
cd backend
install_service.bat
```

### Použitie AI Coacha

1. **Registrácia/Prihlásenie**: Vytvor účet alebo sa prihlás
2. **AI Chat**: Otvor AI chat a začni konverzáciu
3. **Automatické Sledovanie**: Jednoducho povedz AI čo si zjedol, aké cvičenie si robil, atď.

#### Príklady správ:

```
"Zjedol som raňajky: 2 vajíčka, toast, 350 kcal"
"Cvičil som 30 minút beh, stredná intenzita"
"Mám stres úroveň 7 z práce"
"Moja nálada je 4/5, cítim sa dobre"
"Spal som 7 hodín, kvalita dobrá"
"Moja váha je 75 kg"
```

AI automaticky rozpozná a uloží tieto informácie!

---

## 📁 Project Structure

```
fitmind/
├── src/                      # Angular frontend
│   ├── app/
│   │   ├── ai-chat/          # AI chat komponent
│   │   ├── home/             # Domovská stránka
│   │   ├── login/            # Prihlásenie
│   │   ├── register/         # Registrácia
│   │   ├── services/         # Business logika
│   │   │   ├── ai.service.ts
│   │   │   ├── auth.service.ts
│   │   │   └── user-fitness.service.ts
│   │   ├── models/          # TypeScript interfaces
│   │   └── Shared/          # Zdieľané komponenty
│   └── environments/         # Environment config
├── backend/                  # FastAPI backend
│   ├── main.py              # Hlavný API server
│   ├── ecosystem.config.js   # PM2 config
│   └── requirements.txt     # Python dependencies
├── scripts/                  # Seed skripty
└── public/                   # Statické súbory
```

---

## 🔧 Configuration

### Environment Variables

**Backend** (`.env` v `backend/`):
```env
OPENAI_API_KEY=sk-your-api-key-here
PORT=8000
ENV=production
```

**Frontend** (`src/environments/environment.development.ts`):
```typescript
export const environment = {
    llamaApiUrl: 'http://localhost:11434/api/generate',
    llamaModel: 'llama3.2:3b'
};
```

### Firebase Security Rules

Nastav Firestore security rules v Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userFitnessProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{subcollection=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🧪 Testing

```bash
# Frontend tests
ng test

# Backend tests (ak existujú)
cd backend
pytest
```

---

## 🐛 Troubleshooting

### CORS Errors
- Skontroluj či backend beží na porte 8000
- Over `allow_origins` v `backend/main.py`

### Firebase Errors
- Skontroluj či `firebase-service-account.json` existuje
- Over Firebase credentials v `app.config.ts`

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID [číslo] /F

# Linux/Mac
lsof -ti:8000 | xargs kill
```

### Module Not Found
```bash
# Frontend
npm install

# Backend
pip install -r requirements.txt
```

---

## 🤝 Contributing

Contributions sú vítané! Pre veľké zmeny:

1. Forkni projekt
2. Vytvor feature branch (`git checkout -b feature/AmazingFeature`)
3. Commitni zmeny (`git commit -m 'Add some AmazingFeature'`)
4. Pushni do branchu (`git push origin feature/AmazingFeature`)
5. Otvor Pull Request

---

## 📄 License

Tento projekt je licencovaný pod MIT License - pozri [LICENSE](LICENSE) súbor pre detaily.

---

## 👤 Author

**Adrian Marjak**

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: adrianmarjak2156165@gmail.com

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) za GPT-4o-mini API
- [Firebase](https://firebase.google.com/) za backend služby
- [Angular](https://angular.io/) za framework
- [FastAPI](https://fastapi.tiangolo.com/) za backend framework

---

## 📊 Project Status

✅ **Aktívny vývoj**

- [x] AI integrácia
- [x] Firebase autentifikácia
- [x] Fitness tracking
- [x] Automatické ukladanie dát
- [ ] Mobile app (plánované)
- [ ] Analytics dashboard (plánované)

---

<div align="center">

**Made with ❤️ using Angular, FastAPI, and OpenAI**

⭐ Ak sa ti projekt páči, daj mu hviezdu!

</div>






<div align="center">

![FitMind Logo](https://img.shields.io/badge/FitMind-AI%20Coach-3ddc84?style=for-the-badge)

**Personalizovaný AI fitness coach, ktorý sleduje tvoju stravu, cvičenie, stres a náladu**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Usage](#-usage) • [Contributing](#-contributing)

</div>

---

## 📖 O Projekte

FitMind je moderná webová aplikácia, ktorá kombinuje AI technológie s fitness trackingom. Aplikácia používa OpenAI GPT-4o-mini na poskytovanie personalizovaných rád a automatické sledovanie používateľských dát prostredníctvom prirodzenej konverzácie.

### Hlavné Funkcie

- 🤖 **AI Coach** - Konverzácia s AI, ktorá rozumie tvojmu životnému štýlu
- 📊 **Automatické Sledovanie** - AI automaticky rozpozná a uloží jedlo, cvičenie, stres, náladu, spánok
- 🔥 **Firebase Integrácia** - Bezpečné ukladanie dát v cloude
- 📈 **Personalizácia** - AI používa tvoju históriu na lepšie rady
- 🔐 **Autentifikácia** - Bezpečné prihlásenie cez Firebase Auth

---

## ✨ Features

### 🎯 Fitness Tracking
- **Jedlo**: Automatické sledovanie kalórií, bielkovín, sacharidov, tukov
- **Cvičenie**: Typ, trvanie, intenzita, spálené kalórie
- **Váha**: Historické záznamy váhy

### 🧘 Wellness Tracking
- **Stres**: Úroveň stresu (1-10) s poznámkami
- **Nálada**: Denné hodnotenie nálady (1-5)
- **Spánok**: Hodiny spánku a kvalita

### 🤖 AI Capabilities
- Rozpozná dáta z prirodzenej konverzácie
- Automaticky ukladá záznamy do databázy
- Poskytuje personalizované rady na základe histórie
- Empatické a motivujúce odpovede

---

## 🛠️ Tech Stack

### Frontend
- **Angular 20** - Moderný webový framework
- **TypeScript** - Type-safe JavaScript
- **SCSS** - Styling
- **Angular Material** - UI komponenty
- **RxJS** - Reactive programming
- **Chart.js** - Grafy a vizualizácie

### Backend
- **FastAPI** - Moderný Python web framework
- **OpenAI GPT-4o-mini** - AI model
- **Uvicorn** - ASGI server

### Database & Services
- **Firebase Firestore** - NoSQL databáza
- **Firebase Authentication** - User management
- **Firebase Admin SDK** - Backend Firebase prístup

---

## 📋 Požiadavky

### Frontend
- Node.js 18+ 
- npm alebo yarn
- Angular CLI (voliteľné)

### Backend
- Python 3.9+
- pip
- OpenAI API kľúč
- Firebase Service Account JSON

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/fitmind.git
cd fitmind
```

### 2. Frontend Setup

```bash
# Inštalácia závislostí
npm install

# Spustenie development servera
ng serve
# alebo
npm start
```

Frontend bude dostupný na `http://localhost:4200`

### 3. Backend Setup

```bash
cd backend

# Vytvorenie virtual environment (odporúčané)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Inštalácia závislostí
pip install -r requirements.txt

# Vytvorenie .env súboru
echo "OPENAI_API_KEY=your_api_key_here" > .env

# Umiestnenie Firebase Service Account
# Skopíruj firebase-service-account.json do backend/ priečinka

# Spustenie servera
python main.py
```

Backend bude dostupný na `http://localhost:8000`

### 4. Firebase Configuration

1. Vytvor Firebase projekt na [Firebase Console](https://console.firebase.google.com/)
2. Povoľ Firebase Authentication (Email/Password)
3. Vytvor Firestore databázu
4. Stiahni Service Account Key a umiestni do `backend/firebase-service-account.json`
5. Aktualizuj `src/app/app.config.ts` s tvojimi Firebase credentials

---

## 💻 Usage

### Spustenie Aplikácie

#### Development Mode

**Terminál 1 - Frontend:**
```bash
npm start
```

**Terminál 2 - Backend:**
```bash
cd backend
python main.py
```

#### Production Mode (Backend)

**PM2 (Odporúčané):**
```bash
npm install -g pm2
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Windows Service:**
```bash
# Spusti ako Administrator
cd backend
install_service.bat
```

### Použitie AI Coacha

1. **Registrácia/Prihlásenie**: Vytvor účet alebo sa prihlás
2. **AI Chat**: Otvor AI chat a začni konverzáciu
3. **Automatické Sledovanie**: Jednoducho povedz AI čo si zjedol, aké cvičenie si robil, atď.

#### Príklady správ:

```
"Zjedol som raňajky: 2 vajíčka, toast, 350 kcal"
"Cvičil som 30 minút beh, stredná intenzita"
"Mám stres úroveň 7 z práce"
"Moja nálada je 4/5, cítim sa dobre"
"Spal som 7 hodín, kvalita dobrá"
"Moja váha je 75 kg"
```

AI automaticky rozpozná a uloží tieto informácie!

---

## 📁 Project Structure

```
fitmind/
├── src/                      # Angular frontend
│   ├── app/
│   │   ├── ai-chat/          # AI chat komponent
│   │   ├── home/             # Domovská stránka
│   │   ├── login/            # Prihlásenie
│   │   ├── register/         # Registrácia
│   │   ├── services/         # Business logika
│   │   │   ├── ai.service.ts
│   │   │   ├── auth.service.ts
│   │   │   └── user-fitness.service.ts
│   │   ├── models/          # TypeScript interfaces
│   │   └── Shared/          # Zdieľané komponenty
│   └── environments/         # Environment config
├── backend/                  # FastAPI backend
│   ├── main.py              # Hlavný API server
│   ├── ecosystem.config.js   # PM2 config
│   └── requirements.txt     # Python dependencies
├── scripts/                  # Seed skripty
└── public/                   # Statické súbory
```

---

## 🔧 Configuration

### Environment Variables

**Backend** (`.env` v `backend/`):
```env
OPENAI_API_KEY=sk-your-api-key-here
PORT=8000
ENV=production
```

**Frontend** (`src/environments/environment.development.ts`):
```typescript
export const environment = {
    llamaApiUrl: 'http://localhost:11434/api/generate',
    llamaModel: 'llama3.2:3b'
};
```

### Firebase Security Rules

Nastav Firestore security rules v Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userFitnessProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{subcollection=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🧪 Testing

```bash
# Frontend tests
ng test

# Backend tests (ak existujú)
cd backend
pytest
```

---

## 🐛 Troubleshooting

### CORS Errors
- Skontroluj či backend beží na porte 8000
- Over `allow_origins` v `backend/main.py`

### Firebase Errors
- Skontroluj či `firebase-service-account.json` existuje
- Over Firebase credentials v `app.config.ts`

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID [číslo] /F

# Linux/Mac
lsof -ti:8000 | xargs kill
```

### Module Not Found
```bash
# Frontend
npm install

# Backend
pip install -r requirements.txt
```

---

## 🤝 Contributing

Contributions sú vítané! Pre veľké zmeny:

1. Forkni projekt
2. Vytvor feature branch (`git checkout -b feature/AmazingFeature`)
3. Commitni zmeny (`git commit -m 'Add some AmazingFeature'`)
4. Pushni do branchu (`git push origin feature/AmazingFeature`)
5. Otvor Pull Request

---

## 📄 License

Tento projekt je licencovaný pod MIT License - pozri [LICENSE](LICENSE) súbor pre detaily.

---

## 👤 Author

**Adrian Marjak**

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: adrianmarjak2156165@gmail.com

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) za GPT-4o-mini API
- [Firebase](https://firebase.google.com/) za backend služby
- [Angular](https://angular.io/) za framework
- [FastAPI](https://fastapi.tiangolo.com/) za backend framework

---

## 📊 Project Status

✅ **Aktívny vývoj**

- [x] AI integrácia
- [x] Firebase autentifikácia
- [x] Fitness tracking
- [x] Automatické ukladanie dát
- [ ] Mobile app (plánované)
- [ ] Analytics dashboard (plánované)

---

<div align="center">

**Made with ❤️ using Angular, FastAPI, and OpenAI**

⭐ Ak sa ti projekt páči, daj mu hviezdu!

</div>






