# 📚 FitMind - Technický Manuál

## 📋 Obsah
1. [Prehľad Architektúry](#prehľad-architektúry)
2. [Frontend (Angular)](#frontend-angular)
3. [Backend (FastAPI)](#backend-fastapi)
4. [Firebase Integrácia](#firebase-integrácia)
5. [AI Integrácia](#ai-integrácia)
6. [Dátové Modely](#dátové-modely)
7. [Services a Dependency Injection](#services-a-dependency-injection)
8. [Routing a Guards](#routing-a-guards)
9. [Importy a Závislosti](#importy-a-závislosti)
10. [Spustenie a Deployment](#spustenie-a-deployment)

---

## 🏗️ Prehľad Architektúry

### Technologický Stack
- **Frontend**: Angular 20 (Standalone Components)
- **Backend**: FastAPI (Python)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **AI**: OpenAI GPT-4o-mini
- **Styling**: SCSS

### Štruktúra Projektu
```
FitMind/
├── src/                    # Angular frontend
│   ├── app/
│   │   ├── components/     # UI komponenty
│   │   ├── services/       # Business logika
│   │   ├── models/         # TypeScript interfaces
│   │   ├── guards/         # Route guards
│   │   └── Shared/         # Zdieľané komponenty
│   ├── environments/       # Environment konfigurácia
│   └── main.ts            # Entry point
├── backend/               # FastAPI backend
│   └── main.py           # Backend API
├── scripts/               # Seed skripty
└── public/               # Statické súbory
```

---

## 🎨 Frontend (Angular)

### Entry Point - `src/main.ts`
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```
**Čo robí**: Spúšťa Angular aplikáciu s konfiguráciou z `app.config.ts`.

### Hlavná Konfigurácia - `src/app/app.config.ts`

#### Importy:
```typescript
// Angular Core
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

// Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
```

#### Firebase Konfigurácia:
```typescript
const firebaseConfig = {
    apiKey: "AIzaSyArvOFbqncllijGFJPoHNEgtPdZPIuCqjQ",
    authDomain: "fitmind-dba6a.firebaseapp.com",
    projectId: "fitmind-dba6a",
    // ... ďalšie konfiguračné údaje
};
```

**Čo robí**: 
- Inicializuje Firebase (Auth + Firestore)
- Nastavuje HTTP klienta pre API volania
- Konfiguruje routing
- Povoľuje animácie

### Hlavný Komponent - `src/app/app.ts`

```typescript
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './Shared/header/header'; 
import { AiChatComponent } from './ai-chat/ai-chat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, AiChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('FitMind');
}
```

**Čo robí**:
- `standalone: true` - komponent nepotrebuje NgModule
- `imports` - importuje potrebné komponenty a direktívy
- `signal('FitMind')` - reactive hodnota (Angular Signals)

### Routing - `src/app/app.routes.ts`

```typescript
export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'contact', component: Contact },
    { path: 'piechart', component: Piechart, canActivate: [AdminGuard] },
    { path: 'review', component: ReviewsComponent },
    { path: 'jedalnicek', component: Jedalnicek },
    { path: 'training', component: Training },
    { path: '**', redirectTo: '' }  // 404 -> home
];
```

**Podmienky**:
- `canActivate: [AdminGuard]` - `/piechart` je chránená admin guardom
- `path: '**'` - catch-all pre neexistujúce routes

---

## 🔧 Services a Dependency Injection

### Ako funguje Dependency Injection v Angular

Všetky services sú označené `@Injectable({ providedIn: 'root' })`, čo znamená:
- **Singleton** - jedna inštancia pre celú aplikáciu
- **Lazy Loading** - načíta sa len keď je potrebná
- **Automatická injekcia** - Angular ju automaticky poskytne

### Kľúčové Services

#### 1. AuthService (`src/app/services/auth.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private auth: Auth) {}
  
  register(email: string, password: string): Observable<User>
  login(email: string, password: string): Observable<User>
  logout(): Observable<void>
  getCurrentUser(): Observable<User | null>
  isAdmin(): Observable<boolean>
}
```

**Importy**:
- `@angular/fire/auth` - Firebase Auth
- `rxjs` - Observable pre async operácie

**Použitie**:
```typescript
constructor(private authService: AuthService) {}

this.authService.login(email, password).subscribe(user => {
  // Spracuj úspešné prihlásenie
});
```

#### 2. AiService (`src/app/services/ai.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = 'http://localhost:8000/api/chat';
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  
  sendMessage(userId: string, message: string): Observable<any>
}
```

**Čo robí**:
- Komunikuje s FastAPI backendom
- Udržiava stav správ cez `BehaviorSubject`
- Vystavuje `messages$` Observable pre komponenty

**Importy**:
- `@angular/common/http` - HttpClient pre HTTP požiadavky
- `rxjs` - BehaviorSubject, Observable

#### 3. UserFitnessService (`src/app/services/user-fitness.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class UserFitnessService {
  private readonly COLLECTION_NAME = 'userFitnessProfiles';
  
  getUserProfile(userId: string): Observable<UserFitnessProfile | null>
  addFoodEntry(userId: string, entry: Omit<FoodEntry, 'id'>): Observable<string>
  addExerciseEntry(...)
  // ... ďalšie metódy
}
```

**Čo robí**:
- CRUD operácie pre fitness dáta
- Komunikuje s Firebase Firestore
- Automaticky pridáva timestampy

**Importy**:
- `@angular/fire/firestore` - Firestore operácie
- `rxjs` - Observable, from, map

---

## 🛡️ Routing a Guards

### AdminGuard (`src/guards/admin.guard.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService) {}
  
  canActivate(): Observable<boolean> {
    return this.authService.isAdmin();
  }
}
```

**Podmienka**:
- Kontroluje či používateľ má admin email: `adrianmarjak2156165@gmail.com`
- Ak nie je admin → redirect na home
- Používa sa v route: `{ path: 'piechart', canActivate: [AdminGuard] }`

**Ako funguje**:
1. Angular volá `canActivate()` pred navigáciou
2. Guard volá `authService.isAdmin()`
3. Ak vráti `false` → navigácia sa zruší

---

## 📦 Dátové Modely

### UserFitnessProfile (`src/app/models/user-fitness-data.interface.ts`)

```typescript
export interface UserFitnessProfile {
  userId: string;
  name?: string;
  age?: number;
  height?: number;
  goals?: string[];
  foodEntries?: FoodEntry[];
  exerciseEntries?: ExerciseEntry[];
  stressEntries?: StressEntry[];
  moodEntries?: MoodEntry[];
  sleepEntries?: SleepEntry[];
  weightEntries?: WeightEntry[];
}
```

**Typy záznamov**:
- `FoodEntry` - jedlo (kalórie, bielkoviny, sacharidy, tuky)
- `ExerciseEntry` - cvičenie (typ, trvanie, intenzita)
- `StressEntry` - stres (úroveň 1-10, zdroj)
- `MoodEntry` - nálada (skóre 1-5)
- `SleepEntry` - spánok (hodiny, kvalita)
- `WeightEntry` - váha (kg)

---

## 🔥 Firebase Integrácia

### Firestore Collections

```
userFitnessProfiles/
  {userId}/
    ├── foodEntries/        # Subkolekcia
    ├── exerciseEntries/     # Subkolekcia
    ├── stressEntries/       # Subkolekcia
    ├── moodEntries/         # Subkolekcia
    ├── sleepEntries/        # Subkolekcia
    └── weightEntries/       # Subkolekcia
```

### Ako sa používa v kóde

```typescript
// V UserFitnessService
const profileRef = doc(this.firestore, 'userFitnessProfiles', userId);
const entryRef = collection(this.firestore, 'userFitnessProfiles', userId, 'foodEntries');
```

**Dôležité**:
- `doc()` - pre jeden dokument
- `collection()` - pre kolekciu
- Subkolekcie sa vytvárajú automaticky pri prvom zápise

---

## 🤖 AI Integrácia

### Frontend → Backend Komunikácia

```
AiChatComponent 
  → AiService.sendMessage()
    → HTTP POST http://localhost:8000/api/chat
      → FastAPI Backend
        → OpenAI API
          → Response späť
```

### Backend AI Flow (`backend/main.py`)

1. **Príjme request**:
```python
@app.post("/api/chat")
async def chat(request: ChatRequest):
    user_id = request.user_id
    message = request.message
```

2. **Načíta dáta z Firebase**:
```python
profile = get_user_profile(user_id)
recent_entries = get_recent_entries(user_id, days=7)
```

3. **Vytvorí system prompt** s dátami používateľa

4. **Volá OpenAI s Function Calling**:
```python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    functions=functions,  # Definície funkcií pre ukladanie dát
    function_call="auto"
)
```

5. **Ak AI zavolá funkciu** (napr. `save_food_entry`):
   - Uloží dáta do Firebase
   - Získa finálnu odpoveď od AI

### Function Calling

AI môže automaticky volať tieto funkcie:
- `save_food_entry` - uloží jedlo
- `save_exercise_entry` - uloží cvičenie
- `save_stress_entry` - uloží stres
- `save_mood_entry` - uloží náladu
- `save_sleep_entry` - uloží spánok
- `save_weight_entry` - uloží váhu
- `update_profile` - aktualizuje profil

---

## 🐍 Backend (FastAPI)

### Štruktúra `backend/main.py`

#### Importy:
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from pydantic import BaseModel
```

#### CORS Middleware:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Angular dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**Prečo**: Angular beží na porte 4200, backend na 8000 → potrebuje CORS

#### Firebase Inicializácia:
```python
try:
    cred = credentials.Certificate("firebase-service-account.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    db = None  # Graceful fallback
```

#### OpenAI Client:
```python
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
```

### API Endpoints

#### GET `/`
```python
@app.get("/")
async def root():
    return {"message": "✅ FitMind AI Backend s OPENAI beží! 🚀"}
```

#### POST `/api/chat`
```python
@app.post("/api/chat")
async def chat(request: ChatRequest):
    # 1. Načítaj dáta používateľa
    # 2. Vytvor AI prompt
    # 3. Volaj OpenAI
    # 4. Spracuj function calls
    # 5. Vráť odpoveď
```

### Pomocné Funkcie

#### `get_user_profile(user_id: str)`
- Načíta profil z `userFitnessProfiles/{userId}`
- Vráti `None` ak neexistuje

#### `get_recent_entries(user_id: str, days: int = 7)`
- Načíta záznamy z posledných N dní
- Vráti dict s kľúčmi: `food`, `exercise`, `stress`, `mood`, `sleep`, `weight`

#### `save_data_entry(user_id: str, entry_type: str, data: Dict)`
- Uloží záznam do príslušnej subkolekcie
- Automaticky vytvorí profil ak neexistuje

#### `update_user_profile(user_id: str, updates: Dict)`
- Aktualizuje základné informácie profilu

---

## 📥 Importy a Závislosti

### Frontend Dependencies (`package.json`)

#### Angular Core:
- `@angular/core` - základný framework
- `@angular/router` - routing
- `@angular/common/http` - HTTP klient
- `@angular/forms` - formuláre
- `@angular/material` - UI komponenty

#### Firebase:
- `@angular/fire` - Angular Firebase wrapper
- `firebase` - Firebase SDK

#### Ostatné:
- `rxjs` - reactive programming (Observable, Subject)
- `chart.js`, `ng2-charts` - grafy
- `sweetalert2` - notifikácie

### Backend Dependencies (`requirements.txt`)

```txt
fastapi==0.115.0          # Web framework
uvicorn==0.30.6           # ASGI server
openai                     # OpenAI API
firebase-admin==6.5.0     # Firebase Admin SDK
python-dotenv==1.0.1      # Environment variables
pydantic==2.9.2           # Data validation
```

---

## 🚀 Spustenie a Deployment

### Frontend Development

```bash
# Inštalácia
npm install

# Spustenie dev servera
ng serve
# alebo
npm start

# Build pre produkciu
ng build --configuration production
```

**Port**: `http://localhost:4200`

### Backend Development

```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Port**: `http://localhost:8000`

### Backend Production (Nonstop beh)

#### PM2 (Odporúčané):
```bash
npm install -g pm2
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Windows Service:
```bash
# Spusti ako Administrator
install_service.bat
```

---

## 🔐 Environment Variables

### Backend (`.env` v `backend/`)
```env
OPENAI_API_KEY=sk-...
PORT=8000
ENV=production
```

### Frontend (`src/environments/environment.development.ts`)
```typescript
export const environment = {
    llamaApiUrl: 'http://localhost:11434/api/generate',
    llamaModel: 'llama3.2:3b'
};
```

---

## 🐛 Časté Problémy a Riešenia

### 1. CORS Chyby
**Problém**: Frontend nemôže volať backend API
**Riešenie**: Skontroluj `allow_origins` v `backend/main.py`

### 2. Firebase Chyby
**Problém**: `firebase-service-account.json` neexistuje
**Riešenie**: Umiestni súbor do `backend/` priečinka

### 3. Port už používaný
**Problém**: Port 8000 je obsadený
**Riešenie**: 
```bash
netstat -ano | findstr :8000
taskkill /PID [číslo] /F
```

### 4. Module not found
**Problém**: Chýbajúce závislosti
**Riešenie**:
```bash
npm install          # Frontend
pip install -r requirements.txt  # Backend
```

---

## 📝 Dôležité Poznámky

1. **Standalone Components**: Všetky komponenty sú standalone (nie sú v NgModule)
2. **Observable Pattern**: Services používajú RxJS Observable pre async operácie
3. **Firebase Security**: Firestore rules musia byť nastavené v Firebase Console
4. **AI Function Calling**: AI automaticky rozpozná a uloží dáta z konverzácie
5. **TypeScript**: Všetky modely sú TypeScript interfaces pre type safety

---

## 🔄 Data Flow

### Príklad: Uloženie jedla cez AI

```
1. Používateľ napíše: "Zjedol som raňajky: 2 vajíčka, 200 kcal"
   ↓
2. AiChatComponent.sendMessage()
   ↓
3. AiService.sendMessage() → HTTP POST /api/chat
   ↓
4. Backend chat() endpoint
   ↓
5. OpenAI rozpozná jedlo → volá save_food_entry()
   ↓
6. save_data_entry() → Firebase Firestore
   ↓
7. AI vráti odpoveď: "Super! Uložil som tvoje raňajky..."
   ↓
8. Frontend zobrazí notifikáciu: "🍽️ Jedlo uložené"
```

---

## 📚 Ďalšie Zdroje

- [Angular Documentation](https://angular.io/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

**Posledná aktualizácia**: 2025-12-26






