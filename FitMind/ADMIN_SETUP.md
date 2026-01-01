# 👤 Admin Účty v Databáze - Setup Guide

## 📋 Prehľad

Admin účty sú teraz spravované cez Firestore databázu namiesto hardcoded emailu v kóde. To umožňuje:
- ✅ Pridať/odstrániť adminov bez zmeny kódu
- ✅ Spravovať admin účty cez Firebase Console
- ✅ Viacero adminov naraz
- ✅ Jednoduchšiu správu oprávnení

---

## 🗄️ Štruktúra Databázy

### Kolekcia: `admins`

```
admins/
  {userId}/                    # Dokument ID = Firebase Auth User ID
    ├── userId: "abc123"
    ├── email: "admin@example.com"
    ├── isAdmin: true
    ├── createdAt: Timestamp
    └── updatedAt: Timestamp
```

**Dôležité:**
- `userId` musí zodpovedať Firebase Auth User ID
- `isAdmin` musí byť `true` pre admin prístup
- `email` sa používa na identifikáciu (voliteľné, ale odporúčané)

---

## 🚀 Metóda 1: Pridanie Admina cez Firebase Console (Najjednoduchšie)

### Krok 1: Získaj User ID
1. Spusti Angular aplikáciu: `ng serve`
2. Prihlás sa s účtom, ktorý chceš urobiť adminom
3. Otvor Developer Tools (F12) > Console
4. Spusti tento kód:
```javascript
import { getAuth } from 'firebase/auth';
const auth = getAuth();
console.log('User ID:', auth.currentUser?.uid);
```
5. Skopíruj User ID

### Krok 2: Vytvor Admin Dokument v Firebase Console
1. Otvor [Firebase Console](https://console.firebase.google.com/)
2. Prejdi na **Firestore Database**
3. Klikni **Start collection** (ak kolekcia `admins` neexistuje)
4. Collection ID: `admins`
5. Document ID: **vlož User ID z kroku 1**
6. Pridaj polia:
   - `userId` (string): User ID
   - `email` (string): Email používateľa
   - `isAdmin` (boolean): `true`
   - `createdAt` (timestamp): Aktuálny čas
   - `updatedAt` (timestamp): Aktuálny čas
7. Klikni **Save**

**Príklad:**
```
Collection: admins
Document ID: abc123xyz789
Fields:
  userId: "abc123xyz789"
  email: "admin@example.com"
  isAdmin: true
  createdAt: [aktuálny timestamp]
  updatedAt: [aktuálny timestamp]
```

---

## 🔧 Metóda 2: Pridanie Admina cez Backend API

### Krok 1: Získaj User ID
Rovnako ako v Metóde 1, Krok 1.

### Krok 2: Volaj Backend API
```bash
# PowerShell
$body = @{
    user_id = "abc123xyz789"
    email = "admin@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/admin/add" -Method POST -Body $body -ContentType "application/json"
```

Alebo cez curl:
```bash
curl -X POST http://localhost:8000/api/admin/add \
  -H "Content-Type: application/json" \
  -d '{"user_id": "abc123xyz789", "email": "admin@example.com"}'
```

**Odpoveď:**
```json
{
  "success": true,
  "message": "Admin admin@example.com pridaný"
}
```

---

## 🐍 Metóda 3: Pridanie Admina cez Python Script

Vytvor súbor `backend/add_admin.py`:

```python
from firebase_service import FirebaseService

firebase = FirebaseService()

# Pridaj admina
user_id = "abc123xyz789"  # Firebase Auth User ID
email = "admin@example.com"

if firebase.add_admin(user_id, email):
    print(f"✅ Admin {email} pridaný!")
else:
    print(f"❌ Chyba pri pridávaní admina")
```

Spusti:
```powershell
cd backend
python add_admin.py
```

---

## ✅ Overenie Admin Statusu

### Frontend (Angular)
Admin status sa automaticky kontroluje v `AuthService.isAdmin()`, ktorý:
1. Získa aktuálneho používateľa z Firebase Auth
2. Skontroluje dokument v kolekcii `admins/{userId}`
3. Vráti `true` ak `isAdmin === true`

### Backend API
```bash
# Kontrola podľa User ID
GET http://localhost:8000/api/admin/check/{user_id}

# Kontrola podľa Emailu
GET http://localhost:8000/api/admin/check-email/{email}
```

**Príklad:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/check/abc123xyz789"
```

**Odpoveď:**
```json
{
  "user_id": "abc123xyz789",
  "isAdmin": true
}
```

---

## 🗑️ Odstránenie Admina

### Metóda 1: Firebase Console
1. Otvor Firestore Database
2. Prejdi na kolekciu `admins`
3. Nájdi dokument s User ID
4. Klikni na dokument > **Delete**

### Metóda 2: Backend (Python)
```python
from firebase_service import FirebaseService

firebase = FirebaseService()
user_id = "abc123xyz789"

if firebase.remove_admin(user_id):
    print(f"✅ Admin {user_id} odstránený!")
```

---

## 📋 Zoznam Všetkých Adminov

### Backend API
```bash
GET http://localhost:8000/api/admin/list
```

**Príklad:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/list"
```

**Odpoveď:**
```json
{
  "admins": [
    {
      "userId": "abc123xyz789",
      "email": "admin@example.com",
      "isAdmin": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

## 🔐 Security Rules

Aktualizuj Security Rules v Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Admin kolekcia - len admini môžu čítať
    match /admins/{userId} {
      // Používateľ môže čítať len svoj vlastný admin status
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Len existujúci admini môžu písať (cez backend service account)
      allow write: if false; // Backend používa service account, nie auth
    }
    
    // Hlavná kolekcia: userFitnessProfiles
    match /userFitnessProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{subcollection=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Admini môžu čítať všetko (cez helper funkciu)
    function isAdmin() {
      return exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /{document=**} {
      allow read: if request.auth != null && isAdmin();
    }
  }
}
```

**Poznámka:** Security Rules pre `admins` kolekciu sú nastavené tak, aby:
- Používateľ môže čítať len svoj vlastný admin status
- Zápis je zakázaný cez auth (backend používa service account)

---

## 🧪 Testovanie

### Test 1: Overenie Admin Statusu
1. Prihlás sa s admin účtom
2. Skús otvoriť admin stránku (napr. `/piechart`)
3. Mala by sa otvoriť bez chyby

### Test 2: Overenie Non-Admin
1. Prihlás sa s bežným účtom
2. Skús otvoriť admin stránku
3. Mala by sa zobraziť chyba a redirect na home

### Test 3: Backend API
```bash
# Kontrola admin statusu
curl http://localhost:8000/api/admin/check/{user_id}

# Zoznam adminov
curl http://localhost:8000/api/admin/list
```

---

## 🚨 Časté Problémy

### Problém 1: "Permission denied" pri čítaní admin statusu
**Riešenie:**
- Skontroluj Security Rules pre kolekciu `admins`
- Over, či používateľ je prihlásený
- Skontroluj, či dokument existuje v `admins/{userId}`

### Problém 2: Admin Guard nefunguje
**Riešenie:**
- Skontroluj, či `isAdmin()` v `AuthService` správne kontroluje Firestore
- Over, či dokument má `isAdmin: true`
- Skontroluj console logy v prehliadači

### Problém 3: User ID sa nezhoduje
**Riešenie:**
- User ID v `admins` kolekcii musí zodpovedať Firebase Auth User ID
- Skontroluj User ID v Firebase Console > Authentication
- Over, či používaš správny User ID pri vytváraní admin dokumentu

---

## 📚 Súvisiace Súbory

- `src/app/services/auth.service.ts` - Admin kontrola
- `src/guards/admin.guard.ts` - Admin guard pre routes
- `backend/firebase_service.py` - Backend metódy pre admin správu
- `backend/main.py` - Admin API endpoints

---

## ✅ Kontrolný Zoznam

- [ ] Kolekcia `admins` vytvorená v Firestore
- [ ] Prvý admin pridaný (tvoj účet)
- [ ] Security Rules aktualizované
- [ ] Admin Guard funguje správne
- [ ] Backend API endpoints fungujú
- [ ] Testovanie s admin a non-admin účtom

---

**Hotovo! 🎉** Admin účty sú teraz spravované cez databázu!



