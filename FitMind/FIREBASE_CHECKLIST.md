# ✅ Firebase Setup - Kontrolný Zoznam

Použi tento zoznam na kontrolu, či máš všetko správne nastavené.

---

## 📋 Základné Nastavenie

- [ ] **Firebase projekt vytvorený**
  - [ ] Projekt existuje v [Firebase Console](https://console.firebase.google.com/)
  - [ ] Projekt má názov (napr. `fitmind-dba6a` alebo `FitMind`)

- [ ] **Firestore Database vytvorená**
  - [ ] V Firebase Console vidíš **Firestore Database**
  - [ ] Databáza je v **Production mode** (nie Test mode)
  - [ ] Databáza má nastavenú lokáciu (napr. `europe-west1`)

---

## 🔐 Security Rules

- [ ] **Security Rules nastavené**
  - [ ] V Firestore Database > Rules vidíš správne pravidlá
  - [ ] Pravidlá sú **publikované** (tlačidlo Publish)
  - [ ] Pravidlá obsahujú:
    - [ ] Ochranu pre `userFitnessProfiles/{userId}`
    - [ ] Ochranu pre subkolekcie `{subcollection=**}`
    - [ ] Admin prístup pre tvoj email

**Kontrola pravidiel:**
```javascript
// Mala by byť viditeľná táto štruktúra:
match /userFitnessProfiles/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  match /{subcollection=**} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

---

## 🔑 Service Account

- [ ] **Service Account JSON stiahnutý**
  - [ ] V Project Settings > Service Accounts klikol si na **Generate new private key**
  - [ ] Súbor sa stiahol (napr. `fitmind-dba6a-firebase-adminsdk-xxxxx.json`)

- [ ] **Súbor správne umiestnený**
  - [ ] Súbor je premenovaný na: `firebase-service-account.json`
  - [ ] Súbor je v priečinku `backend/`
  - [ ] Súbor nie je v `.gitignore` (alebo je, ale máš lokálnu kópiu)

**Kontrola:**
```powershell
# V adresári backend
Test-Path "firebase-service-account.json"
# Mala by vrátiť: True
```

---

## 🔌 Backend Pripojenie

- [ ] **Backend sa pripája k Firebase**
  - [ ] Spustil si backend: `cd backend && .\start.ps1`
  - [ ] Vidíš správu: `[OK] Firebase pripojene!`
  - [ ] Nevidíš chybu typu: `File not found` alebo `Permission denied`

**Test:**
```powershell
cd backend
.\start.ps1
# Mala by sa zobraziť: [OK] Firebase pripojene!
```

---

## 🔐 Firebase Authentication

- [ ] **Authentication zapnuté**
  - [ ] V Firebase Console > Authentication vidíš **Sign-in method**
  - [ ] **Email/Password** je **Enabled**
  - [ ] Máš aspoň jedného testovacieho používateľa (alebo si sa registroval cez frontend)

---

## 📊 Testovanie Zápisu Dát

- [ ] **Prvý záznam úspešne uložený**
  - [ ] Spustil si Angular frontend: `ng serve`
  - [ ] Prihlásil si sa do aplikácie
  - [ ] Otvoril si AI Chat
  - [ ] Napísal si správu typu: "Zjedol som raňajky: 2 vajíčka, 200 kcal"
  - [ ] AI uložilo záznam (vidíš notifikáciu: "🍽️ Jedlo uložené")

- [ ] **Dáta viditeľné v Firebase Console**
  - [ ] V Firestore Database vidíš kolekciu `userFitnessProfiles`
  - [ ] Vidíš dokument so svojim `userId`
  - [ ] Vidíš subkolekciu `foodEntries` (alebo inú podľa typu záznamu)
  - [ ] Vidíš aspoň jeden záznam v subkolekcii

**Kontrola v Firebase Console:**
```
Firestore Database
  └── userFitnessProfiles
      └── {tvoj-userId}
          ├── userId: "abc123"
          ├── createdAt: Timestamp
          └── foodEntries (subkolekcia)
              └── {entryId}
                  ├── name: "..."
                  ├── calories: 200
                  └── timestamp: Timestamp
```

---

## 📈 Indexy (Voliteľné, ale Odporúčané)

- [ ] **Indexy vytvorené**
  - [ ] V Firestore Database > Indexes vidíš vytvorené indexy
  - [ ] Alebo Firebase automaticky vytvoril indexy (dostaneš email)

**Odporúčané indexy:**
- [ ] `userFitnessProfiles/{userId}/foodEntries` - timestamp (Ascending)
- [ ] `userFitnessProfiles/{userId}/exerciseEntries` - timestamp (Ascending)
- [ ] `userFitnessProfiles/{userId}/stressEntries` - timestamp (Ascending)
- [ ] `userFitnessProfiles/{userId}/moodEntries` - timestamp (Ascending)
- [ ] `userFitnessProfiles/{userId}/sleepEntries` - timestamp (Ascending)
- [ ] `userFitnessProfiles/{userId}/weightEntries` - timestamp (Ascending)

---

## 🧪 Funkčné Testy

- [ ] **AI Chat funguje**
  - [ ] Môžeš poslať správu AI
  - [ ] AI odpovedá
  - [ ] AI ukladá záznamy (vidíš notifikácie)

- [ ] **Rôzne typy záznamov**
  - [ ] Jedlo: "Zjedol som..."
  - [ ] Cvičenie: "Cvičil som..."
  - [ ] Stres: "Mám stres..."
  - [ ] Nálada: "Cítim sa..."
  - [ ] Spánok: "Spal som..."
  - [ ] Váha: "Vážim..."

- [ ] **Dashboard/Grafy fungujú**
  - [ ] Môžeš otvoriť Dashboard
  - [ ] Grafy sa načítajú (alebo sú prázdne, ak nemáš dáta)
  - [ ] Po pridaní dát sa grafy aktualizujú

---

## 🔒 Bezpečnosť

- [ ] **Service Account súbor nie je v Gite**
  - [ ] `firebase-service-account.json` je v `.gitignore`
  - [ ] Alebo máš lokálnu kópiu a súbor nie je commitnutý

- [ ] **Security Rules sú správne**
  - [ ] Používateľ vidí len svoje dáta
  - [ ] Používateľ môže písať len do svojich záznamov
  - [ ] Admin (tvoj email) môže čítať všetko

---

## 📚 Dokumentácia

- [ ] **Prečítal si dokumentáciu**
  - [ ] [`FIREBASE_QUICK_SETUP.md`](FIREBASE_QUICK_SETUP.md) - Rýchly setup
  - [ ] [`backend/FIREBASE_SETUP.md`](backend/FIREBASE_SETUP.md) - Detailný guide

---

## ✅ Finálna Kontrola

Ak máš všetky položky zaškrtnuté, tvoja Firebase databáza je **pripravená na použitie**! 🎉

**Ak niečo nefunguje:**
1. Skontroluj sekciu "Časté Problémy" v [`FIREBASE_QUICK_SETUP.md`](FIREBASE_QUICK_SETUP.md)
2. Skontroluj backend logy (v termináli, kde beží backend)
3. Skontroluj Firebase Console > Usage (či nie je prekročený limit)
4. Skontroluj Security Rules (či sú správne publikované)

---

**Posledná aktualizácia:** Dnes  
**Status:** ✅ Všetko pripravené



