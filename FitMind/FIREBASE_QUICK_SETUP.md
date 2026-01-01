# 🔥 Firebase Databáza - Rýchly Setup

## 📋 Čo potrebuješ

1. Google účet
2. 5-10 minút času
3. Firebase projekt (môžeš použiť existujúci `fitmind-dba6a` alebo vytvoriť nový)

---

## 🚀 Krok 1: Vytvorenie/Overenie Firebase Projektu

### A) Ak už máš projekt `fitmind-dba6a`:
1. Otvor [Firebase Console](https://console.firebase.google.com/)
2. Vyber projekt `fitmind-dba6a`
3. Prejdi na **Krok 2**

### B) Ak chceš vytvoriť nový projekt:
1. Otvor [Firebase Console](https://console.firebase.google.com/)
2. Klikni **Add project** (alebo **Pridať projekt**)
3. Zadaj názov: `FitMind` (alebo akýkoľvek iný)
4. Klikni **Continue**
5. **Google Analytics** - môžeš vypnúť (alebo nechať zapnuté)
6. Klikni **Create project**
7. Počkaj na vytvorenie (30-60 sekúnd)
8. Klikni **Continue**

---

## 🗄️ Krok 2: Vytvorenie Firestore Databázy

1. V Firebase Console klikni na **Firestore Database** (v ľavom menu)
2. Ak vidíš **Create database**, klikni na to
3. Ak už máš databázu, preskoč na **Krok 3**

### Nastavenie databázy:
1. **Security rules**: Vyber **Start in test mode** (pre vývoj)
   - ⚠️ **Dôležité**: Neskôr nastavíme správne pravidlá!
2. **Location**: Vyber najbližšiu lokáciu (napr. `europe-west1` pre Európu)
3. Klikni **Enable**

---

## 🔐 Krok 3: Nastavenie Security Rules

1. V **Firestore Database** klikni na záložku **Rules**
2. Nahraď existujúce pravidlá týmto kódom:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper funkcia na kontrolu admin statusu
    function isAdmin() {
      return exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Admin kolekcia - len admini môžu čítať svoj status
    match /admins/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Backend používa service account
    }
    
    // Hlavná kolekcia: userFitnessProfiles
    match /userFitnessProfiles/{userId} {
      // Používateľ môže čítať a písať len svoje dáta
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Všetky subkolekcie (foodEntries, exerciseEntries, atď.)
      match /{subcollection=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Admini môžu čítať všetko (pre debugging a správu)
    match /{document=**} {
      allow read: if request.auth != null && isAdmin();
    }
  }
}
```

3. Klikni **Publish** (alebo **Publikovať**)

**Čo to znamená:**
- ✅ Každý používateľ vidí len svoje dáta
- ✅ Používateľ môže písať len do svojich záznamov
- ✅ Admin (tvoj email) môže čítať všetko pre debugging

---

## 🔑 Krok 4: Vytvorenie Service Account (Pre Backend)

1. V Firebase Console klikni na **⚙️ Project Settings** (ikona ozubeného kolieska)
2. Prejdi na záložku **Service accounts**
3. Klikni na **Generate new private key**
4. V dialógu klikni **Generate key**
5. Súbor sa stiahne (napr. `fitmind-dba6a-firebase-adminsdk-xxxxx.json`)

### Premenovanie súboru:
1. Premenuj stiahnutý súbor na: `firebase-service-account.json`
2. Presuň ho do priečinka `backend/`
3. **Dôležité**: Tento súbor obsahuje citlivé údaje - NIKDY ho necommitni do Gitu!

---

## 📊 Krok 5: Štruktúra Databázy (Automaticky sa vytvorí)

Tvoja databáza bude mať túto štruktúru:

```
userFitnessProfiles/              # Hlavná kolekcia
  {userId}/                        # Dokument pre každého používateľa
    ├── userId: "abc123"
    ├── name: "Ján"
    ├── age: 25
    ├── height: 180
    ├── goals: ["schudnúť", "fit"]
    ├── createdAt: Timestamp
    ├── updatedAt: Timestamp
    │
    ├── foodEntries/              # Subkolekcia - Jedlo
    │   ├── {entryId}/
    │   │   ├── name: "Raňajky"
    │   │   ├── calories: 500
    │   │   ├── protein: 30
    │   │   ├── carbs: 50
    │   │   ├── fats: 20
    │   │   ├── mealType: "breakfast"
    │   │   └── timestamp: Timestamp
    │
    ├── exerciseEntries/           # Subkolekcia - Cvičenie
    │   ├── {entryId}/
    │   │   ├── type: "beh"
    │   │   ├── duration: 30
    │   │   ├── intensity: "medium"
    │   │   ├── caloriesBurned: 300
    │   │   └── timestamp: Timestamp
    │
    ├── stressEntries/             # Subkolekcia - Stres
    │   ├── {entryId}/
    │   │   ├── level: 7
    │   │   ├── source: "práca"
    │   │   └── timestamp: Timestamp
    │
    ├── moodEntries/               # Subkolekcia - Nálada
    │   ├── {entryId}/
    │   │   ├── score: 4
    │   │   ├── note: "Dobrý deň"
    │   │   └── timestamp: Timestamp
    │
    ├── sleepEntries/              # Subkolekcia - Spánok
    │   ├── {entryId}/
    │   │   ├── hours: 8
    │   │   ├── quality: "good"
    │   │   └── timestamp: Timestamp
    │
    └── weightEntries/             # Subkolekcia - Váha
        ├── {entryId}/
        │   ├── weight: 75.5
        │   └── timestamp: Timestamp
```

**Dôležité:**
- ✅ Kolekcie a subkolekcie sa vytvoria automaticky pri prvom zápise
- ✅ Nemusíš nič vytvárať manuálne - backend to urobí za teba
- ✅ Každý záznam má automaticky `timestamp`

---

## 🧪 Krok 6: Testovanie Pripojenia

### Test 1: Backend pripojenie
1. Spusti backend: `cd backend && .\start.ps1`
2. Mala by sa zobraziť správa: `[OK] Firebase pripojene!`
3. Ak vidíš chybu, skontroluj:
   - ✅ Súbor `firebase-service-account.json` je v `backend/` adresári
   - ✅ Súbor má správny názov (presne `firebase-service-account.json`)
   - ✅ Súbor nie je poškodený

### Test 2: Vytvorenie prvého záznamu
1. Spusti Angular frontend: `ng serve`
2. Prihlás sa do aplikácie
3. Otvor AI Chat
4. Napíš: "Zjedol som raňajky: 2 vajíčka, 200 kcal"
5. AI by malo uložiť záznam do Firebase
6. V Firebase Console > Firestore Database by si mal vidieť:
   - Kolekciu `userFitnessProfiles`
   - Dokument s tvojim `userId`
   - Subkolekciu `foodEntries` s prvým záznamom

---

## 📈 Krok 7: Indexy (Voliteľné, ale Odporúčané)

Firebase automaticky vytvorí indexy, ale pre rýchlejšie dotazy môžeš pridať manuálne:

1. V **Firestore Database** klikni na **Indexes**
2. Klikni **Create Index**

### Indexy, ktoré odporúčam:

**Index 1: foodEntries**
- Collection ID: `userFitnessProfiles/{userId}/foodEntries`
- Fields:
  - `timestamp` - Ascending
- Query scope: Collection

**Index 2: exerciseEntries**
- Collection ID: `userFitnessProfiles/{userId}/exerciseEntries`
- Fields:
  - `timestamp` - Ascending
- Query scope: Collection

**Opakuj pre:**
- `stressEntries`
- `moodEntries`
- `sleepEntries`
- `weightEntries`

**Poznámka:** Firebase ti pošle email, keď indexy budú pripravené (môže to trvať niekoľko minút).

---

## 🔒 Krok 8: Firebase Authentication (Ak ešte nie je nastavené)

1. V Firebase Console klikni na **Authentication**
2. Ak vidíš **Get started**, klikni na to
3. Klikni na **Sign-in method**
4. Povol **Email/Password**:
   - Klikni na **Email/Password**
   - Zapni **Enable**
   - Klikni **Save**

**Poznámka:** Angular frontend už má nastavené Firebase Auth, takže toto by malo byť hotové.

---

## ✅ Kontrolný Zoznam

- [ ] Firebase projekt vytvorený/overený
- [ ] Firestore Database vytvorená
- [ ] Security Rules nastavené a publikované
- [ ] Service Account JSON stiahnutý a umiestnený v `backend/`
- [ ] Backend sa úspešne pripojil k Firebase
- [ ] Prvý záznam úspešne uložený cez AI Chat
- [ ] Indexy vytvorené (voliteľné)

---

## 🚨 Časté Problémy

### Problém 1: "Permission denied"
**Riešenie:**
- Skontroluj Security Rules (Krok 3)
- Over, či používateľ je prihlásený v aplikácii
- Skontroluj, či `userId` v pravidlách zodpovedá `request.auth.uid`

### Problém 2: "Firebase chyba: File not found"
**Riešenie:**
- Skontroluj, či `firebase-service-account.json` je v `backend/` adresári
- Over správny názov súboru (presne `firebase-service-account.json`)
- Skontroluj, či máš oprávnenia na čítanie súboru

### Problém 3: "Index required"
**Riešenie:**
- Firebase automaticky vytvorí index
- Alebo vytvor manuálne v Console (Krok 7)
- Počkaj na email, že index je pripravený

### Problém 4: "Collection not found"
**Riešenie:**
- To je v poriadku! Kolekcie sa vytvoria automaticky pri prvom zápise
- Skús uložiť prvý záznam cez AI Chat

---

## 📚 Ďalšie Zdroje

- [Firebase Dokumentácia](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

## 💡 Tipy pre Budúcnosť

1. **Backup**: Pravidelne exportuj dáta z Firebase Console
2. **Monitoring**: Sleduj usage v Firebase Console > Usage
3. **Optimalizácia**: Používaj indexy pre rýchlejšie dotazy
4. **Security**: Pravidelne kontroluj Security Rules
5. **Testing**: Vytvor testovací projekt pre vývoj

---

**Hotovo! 🎉** Tvoja Firebase databáza je pripravená na použitie!

