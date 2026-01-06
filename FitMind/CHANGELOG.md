# 📋 FitMind Changelog

## [2.0.0] - Personal Coach Edition - Január 2026

### 🎉 Hlavné Novinky

#### 🤖 Pokročilý AI Coach
- **Konverzačná pamäť**: AI si pamätá celú históriu konverzácií a poskytuje kontextové odpovede
- **Automatické zaznamenávanie**: Jednoducho povedzte AI čo ste jedli/cvičili a všetko sa automaticky uloží
- **Personalizované odpovede**: AI reaguje na základe vášho profilu, cieľov a histórie

#### 📊 Reporty a Analýzy
- **Týždenný report**: Komplexná analýza vášho týždňa s úspechmi a odporúčaniami
- **Mesačný report**: Dlhodobé trendy a pokrok
- **Real-time insights**: Okamžitý prehľad o vašom pokroku priamo v chate

#### 🎯 Sledovanie Cieľov
- **Cieľová váha**: Sledujte pokrok k vašej cieľovej váhe
- **Kalorický cieľ**: Monitorujte denný príjem kalórií
- **Vizuálne progress bary**: Viditeľný pokrok motivuje

#### 💡 Personalizované Odporúčania
- **Šité na mieru**: Rady založené na vašich cieľoch (chudnutie, svaly, energia)
- **Top 5 odporúčaní**: Najdôležitejšie akcie pre váš aktuálny stav
- **Dynamické**: Aktualizujú sa podľa vášho pokroku

### 🔧 Backend Zmeny

#### Nové Súbory
- `backend/coach_service.py` - Pokročilé analytické a kouč funkcie
  - `generate_weekly_report()` - Týždenný report
  - `generate_monthly_report()` - Mesačný report
  - `get_personalized_recommendations()` - Personalizované rady
  - `check_goal_progress()` - Sledovanie cieľov

#### Rozšírené Súbory
- `backend/ai_service.py`
  - `analyze_user_progress()` - Analýza trendov
  - Konverzačná história v `chat()`
  - Vylepšený `create_system_prompt()` s kontextom

- `backend/firebase_service.py`
  - `save_chat_message()` - Ukladanie konverzácií
  - `get_chat_history()` - Načítanie histórie
  - `clear_chat_history()` - Vymazanie histórie

- `backend/main.py`
  - Nové endpointy pre kouč funkcie
  - Vylepšený `/api/chat` s históriou

#### Nové API Endpointy
```
GET  /api/coach/weekly-report/{user_id}
GET  /api/coach/monthly-report/{user_id}
GET  /api/coach/recommendations/{user_id}
GET  /api/coach/goal-progress/{user_id}
GET  /api/chat/history/{user_id}
DELETE /api/chat/history/{user_id}
```

### 🎨 Frontend Zmeny

#### Rozšírené Súbory
- `src/app/services/ai.service.ts`
  - Nové interfaces: `WeeklyReport`, `MonthlyReport`, `GoalProgress`
  - Nové metódy pre všetky kouč funkcie

- `src/app/ai-chat/ai-chat.ts`
  - Insights panel s 3 tabmi
  - Automatické načítavanie reportov
  - Real-time refresh po uložení dát

- `src/app/ai-chat/ai-chat.html`
  - Insights panel UI
  - Vizualizácia reportov a pokroku
  - Progress bary pre ciele

- `src/app/ai-chat/ai-chat.scss`
  - Styling pre insights panel
  - Responzívny dizajn
  - Animácie a prechody

### 📚 Dokumentácia

#### Nové Dokumenty
- `AI_COACH_GUIDE.md` - Kompletný návod na používanie AI coacha
- `CHANGELOG.md` - Tento súbor

#### Aktualizované Dokumenty
- `README.md` - Pridaná sekcia o verzii 2.0
- `backend/API_DOCUMENTATION.md` - Dokumentácia nových endpointov

### 🗄️ Databázové Zmeny

#### Nová Kolekcia
```
userFitnessProfiles/{userId}/chatHistory/{messageId}
{
  role: "user" | "assistant",
  content: string,
  timestamp: Timestamp,
  metadata: {
    saved_entries: string[]
  }
}
```

#### Rozšírený Profil
```
userFitnessProfiles/{userId}
{
  // Existujúce polia
  userId: string,
  name: string,
  age: number,
  height: number,
  
  // Nové polia
  goals: string[],
  problems: string[],
  helps: string[],
  targetWeight: number,
  targetCalories: number
}
```

### 🐛 Opravy

- Vylepšené error handling v AI chate
- Lepšie spracovanie emoji na Windows
- Optimalizácia načítavania dát z Firestore

### ⚡ Výkonnostné Vylepšenia

- Cachovanie konverzačnej histórie
- Limit 10 najnovších správ pre kontext (znížená latencia)
- Lazy loading insights panelu

---

## [1.0.0] - Prvé Vydanie - December 2025

### ✨ Funkcie
- Dashboard s grafmi
- AI Chat (základná verzia)
- Tréningové plány
- Jedálničky
- Firebase autentifikácia
- Firestore databáza
- Responsive design

### 🔧 Technológie
- Angular 19 (standalone components)
- Python FastAPI backend
- Firebase (Auth + Firestore)
- OpenAI GPT-4o-mini
- NgxEcharts
- SCSS

---

## Plánované Funkcie (Budúcnosť)

### Verzia 2.1
- [ ] Push notifikácie s daily reminders
- [ ] Export reportov do PDF
- [ ] Zdieľanie pokroku na sociálnych sieťach

### Verzia 2.2
- [ ] Rozpoznávanie jedla z fotografie
- [ ] Hlasový vstup (Speech-to-Text)
- [ ] Automatické naplánovanie tréningov

### Verzia 3.0
- [ ] Mobilná aplikácia (iOS + Android)
- [ ] Integrácia s wearables (Fitbit, Apple Watch)
- [ ] Komunitné výzvy a súťaže
- [ ] Premium tier s pokročilými funkciami

---

**FitMind Team** - Robíme fitness dostupným pre každého! 💪🚀

