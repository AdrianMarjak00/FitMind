# 👋 Frontend Handoff - Dokumentácia pre Kolegu

## 📋 Prehľad

Tento dokument popisuje všetky zmeny vo frontende, ktoré som urobil. **Backend je kompletný a nezávislý** - môžeš pracovať na frontende bez obáv.

---

## ✅ Čo Som Pridal do Frontendu

### 1. Nové Komponenty

#### `src/app/dashboard/` - Dashboard s Grafmi
- **dashboard.ts** - Komponent pre zobrazenie grafov
- **dashboard.html** - Template s 6 grafmi
- **dashboard.scss** - Štýly

**Čo robí:**
- Zobrazuje grafy pre kalórie, cvičenie, náladu, stres, spánok, váhu
- Používa ECharts (ngx-echarts)
- Automaticky načítava dáta z backend API

**Route:** `/dashboard`

### 2. Nové Services

#### `src/app/services/charts.service.ts`
```typescript
getStats(userId: string, days: number): Observable<StatsData>
getChartData(userId: string, chartType: string, days: number): Observable<ChartData>
getEntries(userId: string, entryType: string, days: number, limit: number): Observable<any>
```

**Použitie:**
- Komunikuje s backend API pre grafy a štatistiky
- Endpointy: `/api/stats/{userId}`, `/api/chart/{userId}/{chartType}`, `/api/entries/{userId}/{entryType}`

#### `src/app/services/backend-status.service.ts`
```typescript
checkBackendStatus(): Observable<boolean>
isBackendRunning(): Promise<boolean>
```

**Použitie:**
- Kontroluje, či backend beží
- Používa sa v `ai-chat` komponente

### 3. Upravené Komponenty

#### `src/app/ai-chat/ai-chat.ts`
**Zmeny:**
- ✅ Používa autentifikovaného používateľa (nie hardcoded 'jan')
- ✅ Kontroluje backend status pred odoslaním správy
- ✅ Zobrazuje varovanie ak backend nebeží
- ✅ Lepšia error handling

#### `src/app/app.routes.ts`
**Pridané:**
- ✅ `{ path: 'dashboard', component: DashboardComponent }`

**Odstránené:**
- ❌ OllamaAi route (nepoužívané)

### 4. Nové Modely

#### `src/app/models/user-fitness-data.interface.ts`
**Kompletný model pre fitness dáta:**
- `UserFitnessProfile` - profil používateľa
- `FoodEntry`, `ExerciseEntry`, `StressEntry`, `MoodEntry`, `SleepEntry`, `WeightEntry`

---

## ❌ Čo Som Odstránil

### Ollama Komponenty (Nepoužívané)
- ❌ `src/app/ollama-ai/` - celý priečinok
- ❌ `src/app/services/ollama-ai.service.ts`
- ❌ `src/app/models/ollama-response.ts`
- ✅ Odstránené z routes

### Environment
- ✅ Vyčistené `environment.development.ts` (odstránené llama nastavenia)

---

## 🔌 Backend API Endpointy

Všetky endpointy sú dokumentované v `backend/API_DOCUMENTATION.md`.

### Hlavné Endpointy:

```
GET  /api/stats/{user_id}?days=30          # Všetky štatistiky
GET  /api/chart/{user_id}/{chart_type}     # Dáta pre graf
GET  /api/entries/{user_id}/{entry_type}   # Záznamy
POST /api/chat                             # AI Chat
```

### Príklady Použitia:

```typescript
// V komponente
constructor(private chartsService: ChartsService) {}

// Získať všetky štatistiky
this.chartsService.getStats(userId, 30).subscribe(data => {
  console.log(data.calories);
  console.log(data.exercise);
});

// Získať dáta pre graf
this.chartsService.getChartData(userId, 'calories', 7).subscribe(data => {
  // data.data obsahuje {total, average, by_meal, count}
});
```

---

## 🎨 Čo Môžeš Robiť Bez Obáv

### ✅ Bezpečné Úpravy:
- **Styling** - všetky `.scss` súbory
- **Templates** - všetky `.html` súbory
- **Komponenty** - môžeš upravovať existujúce alebo vytvárať nové
- **Routes** - môžeš pridávať nové routes
- **UI/UX** - úplná sloboda

### ⚠️ Pozor na:
- **Services** - ak upravuješ `charts.service.ts` alebo `ai.service.ts`, skontroluj API endpointy
- **Models** - ak meníš `user-fitness-data.interface.ts`, skontroluj či zodpovedá backend dátam
- **Auth** - `auth.service.ts` používa Firebase Auth - nechaj tak

---

## 📡 Backend Komunikácia

### AiService (`ai.service.ts`)
```typescript
sendMessage(userId: string, message: string): Observable<any>
```
- Volá: `POST http://localhost:8000/api/chat`
- Vracia: `{odpoved: string, saved_entries: string[], user_id: string}`

### ChartsService (`charts.service.ts`)
```typescript
getStats(userId: string, days: number): Observable<StatsData>
getChartData(userId: string, chartType: string, days: number): Observable<ChartData>
```
- Volá: `GET http://localhost:8000/api/stats/{userId}`
- Volá: `GET http://localhost:8000/api/chart/{userId}/{chartType}`

---

## 🚀 Spustenie

### Backend (Musí Bežať!)
```bash
cd backend
python main.py
```
Alebo dvojklik na `start.bat`

### Frontend
```bash
npm install
ng serve
```

---

## 📝 Dôležité Poznámky

1. **Backend musí bežať** - Frontend volá `http://localhost:8000`
2. **Firebase Auth** - Používateľ musí byť prihlásený pre AI chat a dashboard
3. **CORS** - Backend má nastavené CORS pre `http://localhost:4200`
4. **Error Handling** - Všetky services majú error handling

---

## 🔧 Ak Potrebuješ Zmeniť Backend API

1. Pozri `backend/API_DOCUMENTATION.md`
2. Uprav backend endpoint v `backend/main.py`
3. Ak treba, uprav frontend service

---

## 📚 Dokumentácia

- **TECHNICAL_README.md** - Kompletný technický manuál
- **backend/API_DOCUMENTATION.md** - API dokumentácia
- **backend/FIREBASE_SETUP.md** - Firebase setup
- **README.md** - Verejná dokumentácia

---

## ✅ Checklist Pre Kolegu

- [ ] Backend beží (`python backend/main.py`)
- [ ] Frontend beží (`ng serve`)
- [ ] Firebase je nakonfigurované
- [ ] Môžeš sa prihlásiť
- [ ] AI chat funguje
- [ ] Dashboard zobrazuje grafy

---

## 🎯 Čo Je Hotové

✅ Backend API - kompletný a funkčný
✅ Firebase integrácia - funguje
✅ AI Chat - používa autentifikáciu
✅ Dashboard - základné grafy
✅ Services - všetky pripravené
✅ Models - kompletné typy

---

## 🚧 Čo Môžeš Robiť

- ✅ Vylepšiť UI/UX
- ✅ Pridať viac grafov
- ✅ Vylepšiť dashboard
- ✅ Pridať filtrovanie
- ✅ Export dát
- ✅ Responsive design
- ✅ Animácie a transitions

---

**Všetko je pripravené! Môžeš začať pracovať na frontende. 🎉**

**Ak máš otázky, pozri dokumentáciu alebo sa opýtaj!**




