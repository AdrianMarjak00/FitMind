# 📊 FitMind - Systém pre správu klientov

## ✅ Čo bolo vytvorené

### 1. 📝 Rozšírený registračný formulár

**Umiestnenie:** `src/app/register/`

#### **3-krokový registračný proces:**

**Krok 1: Základné údaje** 
- Meno a priezvisko
- E-mail a heslo
- Vek a pohlavie

**Krok 2: Fyzické parametre**
- Výška (cm)
- Aktuálna váha (kg)
- Cieľová váha (kg)
- Automatický výpočet BMI

**Krok 3: Fitness ciele**
- Hlavný cieľ (schudnúť, nabrať svaly, udržať váhu, zlepšiť zdravie)
- Úroveň aktivity (sedavý → veľmi aktívny)
- Zdravotné obmedzenia (voliteľné)
- Diétne obmedzenia (voliteľné)

#### **Funkcie:**
✅ Progresívne kroky s vizuálnou indikáciou
✅ Validácia dát na každom kroku
✅ Automatické ukladanie do Firebase
✅ Responzívny dizajn
✅ Moderné Material UI komponenty

---

### 2. 📊 Optimálny Dashboard Layout

**Umiestnenie:** `src/app/dashboard/`

#### **Rozloženie (2-panelový systém):**

**ĽAVÝ PANEL** - Vstupný formulár (350px wide, sticky)
- 📝 Tab-based rozhranie pre rôzne typy záznamov
- 🔄 Real-time pridávanie dát
- ✅ Okamžitá aktualizácia grafov

**PRAVÝ PANEL** - Grafy a štatistiky (flexible width)
- 📈 6 interaktívnych grafov
- 🎨 Moderná vizualizácia s ECharts
- 📱 Responzívny grid layout

#### **Dashboard Header:**
- 👋 Personalizované privítanie
- 📊 3 quick stats cards:
  - Aktuálna váha
  - Cieľová váha  
  - BMI

---

### 3. 📝 Formuláre pre denné záznamy

#### **6 typov záznamov:**

**1. 🍽️ Kalórie**
- Typ jedla (raňajky, obed, večera, desiata)
- Popis jedla
- Počet kalórií

**2. 💪 Cvičenie**
- Typ (kardio, posilňovanie, strečing, šport)
- Trvanie (minúty)
- Intenzita (nízka, stredná, vysoká)

**3. ⚖️ Váha**
- Aktuálna váha (kg)

**4. 😊 Nálada**
- Skóre 1-10
- Poznámka (voliteľné)

**5. 😴 Spánok**
- Počet hodín
- Kvalita (slabá, priemerná, dobrá, výborná)

**6. 😰 Stres**
- Úroveň 1-10
- Spúšťače stresu

#### **Features:**
✅ Tab-based navigácia
✅ Okamžité ukladanie do Firebase
✅ Automatická aktualizácia grafov
✅ Notifikácie o úspechu/chybe

---

### 4. 📈 Vizualizácia dát

#### **6 typov grafov:**

**1. Kalórie - Pie Chart**
- Rozdelenie podľa typu jedla
- Percentuálne zobrazenie

**2. Cvičenie - Pie Chart**
- Rozdelenie podľa typu cvičenia
- Prehľad aktivity

**3. Váha - Line Chart**
- Trend váhy za posledných 90 dní
- Area fill pre lepšiu vizualizáciu

**4. Nálada - Line Chart**
- Trend nálady za posledných 30 dní
- Gra

dient fill

**5. Spánok - Bar Chart**
- Kvalita spánku podľa kategórií
- Prehľadné stĺpce

**6. Stres - Line Chart**
- Trend stresu za posledných 30 dní
- Identifikácia období s vysokým stresom

---

## 🗄️ Firebase databázová štruktúra

```
firestore/
├── users/                          # Hlavná kolekcia používateľov
│   └── {userId}/                   # Dokument pre každého používateľa
│       ├── email: string
│       ├── firstName: string
│       ├── lastName: string
│       ├── age: number
│       ├── gender: 'male'|'female'|'other'
│       ├── height: number (cm)
│       ├── currentWeight: number (kg)
│       ├── targetWeight: number (kg)
│       ├── fitnessGoal: string
│       ├── activityLevel: string
│       ├── medicalConditions: string[]
│       ├── dietaryRestrictions: string[]
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
├── userFitnessProfiles/           # Fitness profily (starý formát)
│   └── {userId}/
│       ├── foodEntries/           # Podkolekcia - jedlo
│       │   └── {entryId}/
│       │       ├── name: string
│       │       ├── calories: number
│       │       ├── mealType: string
│       │       └── timestamp: Timestamp
│       │
│       ├── exerciseEntries/       # Podkolekcia - cvičenie
│       │   └── {entryId}/
│       │       ├── type: string
│       │       ├── duration: number
│       │       ├── intensity: string
│       │       └── timestamp: Timestamp
│       │
│       ├── moodEntries/           # Podkolekcia - nálada
│       ├── stressEntries/         # Podkolekcia - stres
│       ├── sleepEntries/          # Podkolekcia - spánok
│       └── weightEntries/         # Podkolekcia - váha
```

---

## 🎨 Dizajn a UX

### **Farebná schéma:**
- **Primárna:** #3ddc84 (zelená)
- **Pozadie:** Radial gradient (#0f2f1f → #050505)
- **Karty:** #0b0b0b
- **Borders:** #1e1e1e
- **Text:** #cfcfcf / #ffffff

### **Layout princípy:**
✅ **Ľavý panel (formulár):** Sticky positioning, vždy na dosah
✅ **Pravý panel (grafy):** Grid layout, automatické prispôsobenie
✅ **Header:** Fixed výška, quick stats v jednom riadku
✅ **Responzivita:** Mobile-first prístup

### **UX Features:**
- 🎯 Jeden formulár viditeľný naraz (tabs)
- 📊 Grafy sa automaticky aktualizujú po pridaní záznamu
- ✅ Okamžité potvrdenie akcie
- 🔄 Smooth animácie a prechody
- 📱 Plne funkčné na mobile

---

## 🚀 Ako používať

### **Registrácia nového klienta:**

1. **Naviguj na `/register`**
2. **Vyplň 3 kroky:**
   - Základné údaje
   - Fyzické parametre
   - Fitness ciele
3. **Klikni "Vytvoriť účet"**
4. **Profil sa automaticky uloží do Firebase**

### **Používanie Dashboardu:**

1. **Prihlás sa** na `/login`
2. **Prejdi na Dashboard** (`/dashboard`)
3. **V ľavom paneli:**
   - Vyber typ záznamu (tabs)
   - Vyplň formulár
   - Klikni "Pridať záznam"
4. **V pravom paneli:**
   - Sleduj automaticky aktualizované grafy
   - Analyzuj trendy

---

## 📁 Súborová štruktúra

```
src/app/
├── register/
│   ├── register.html              # 3-krokový formulár
│   ├── register.ts                # Logika registrácie
│   └── register.scss              # Štýly registrácie
│
├── dashboard/
│   ├── dashboard.html             # 2-panelový layout
│   ├── dashboard.ts               # Logika dashboardu + grafy
│   └── dashboard.scss             # Moderné štýly
│
├── models/
│   ├── user-profile.interface.ts  # Nový UserProfile interface
│   └── user-fitness-data.interface.ts # Fitness záznamy
│
└── services/
    └── user-fitness.service.ts    # Firebase CRUD operácie
```

---

## 🔧 API Metódy (UserFitnessService)

### **Profil:**
```typescript
createUserProfile(profile: UserProfile): Observable<void>
getUserProfileNew(userId: string): Observable<UserProfile | null>
```

### **Záznamy:**
```typescript
addFoodEntry(userId, entry): Observable<string>
addExerciseEntry(userId, entry): Observable<string>
addMoodEntry(userId, entry): Observable<string>
addStressEntry(userId, entry): Observable<string>
addSleepEntry(userId, entry): Observable<string>
addWeightEntry(userId, entry): Observable<string>
```

---

## 📊 Optimálne rozloženie - Visual Guide

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER - Profile Summary                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Váha: 70kg  │ │ Cieľ: 65kg  │ │ BMI: 24.2   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────────────────────────────────────┐
│  ĽAVÝ PANEL  │  PRAVÝ PANEL                                 │
│  (350px)     │  (flexible)                                  │
│              │                                              │
│ ┌──────────┐ │  ┌─────────┐  ┌─────────┐                  │
│ │   TABS   │ │  │ Kalórie │  │ Cvičenie│                  │
│ └──────────┘ │  └─────────┘  └─────────┘                  │
│              │                                              │
│ ┌──────────┐ │  ┌─────────┐  ┌─────────┐                  │
│ │ FORMULÁR │ │  │  Váha   │  │ Nálada  │                  │
│ │          │ │  └─────────┘  └─────────┘                  │
│ │  sticky  │ │                                              │
│ │          │ │  ┌─────────┐  ┌─────────┐                  │
│ └──────────┘ │  │ Spánok  │  │  Stres  │                  │
│              │  └─────────┘  └─────────┘                  │
└──────────────┴──────────────────────────────────────────────┘
```

---

## ✅ Výhody tohto riešenia

**1. Efektívne používanie priestoru:**
- Ľavý panel: Vždy viditeľný, sticky
- Pravý panel: Maximalizuje priestor pre grafy

**2. Minimalizácia scrollovania:**
- Formulár vždy v dosahu
- Grafy v optimálnej veľkosti

**3. Jasný workflow:**
- Zadaj dáta vľavo → Vidíš výsledky vpravo

**4. Modulárnosť:**
- Ľahko pridať nové typy záznamov
- Ľahko pridať nové grafy

**5. Responzivita:**
- Desktop: 2 panely vedľa seba
- Mobile: 1 panel pod druhým

---

## 🎯 Záver

Systém pre správu klientov je:
- ✅ **Kompletný** - Registrácia + Dashboard
- ✅ **Funkčný** - Všetky CRUD operácie fungujú
- ✅ **Moderný** - Najnovšie Angular technológie
- ✅ **Prehľadný** - Optimálne rozloženie pre produktivitu
- ✅ **Škálovateľný** - Ľahko rozšíriteľný

**Ready for production! 🚀**

