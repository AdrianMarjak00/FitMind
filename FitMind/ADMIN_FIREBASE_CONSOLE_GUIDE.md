# 👤 Pridanie Admin Kolekcie - Firebase Console Guide

## 📋 Čo vidíš teraz

V tvojej Firebase Console máš:
- ✅ Kolekciu `pieStats`
- ✅ Kolekciu `reviews`
- ✅ Firestore Database je nastavená

## 🎯 Čo potrebuješ pridať

**Kolekcia: `admins`**

Táto kolekcia bude obsahovať admin účty, ktoré môžu pristupovať k admin funkciám.

---

## 🚀 Krok za Krokom: Vytvorenie Admin Kolekcie

### Krok 1: Získaj svoj User ID

**Metóda A: Cez Angular aplikáciu**
1. Spusti Angular: `ng serve`
2. Prihlás sa do aplikácie
3. Otvor Developer Tools (F12) > Console
4. Vlož tento kód:
```javascript
import { getAuth } from 'firebase/auth';
const auth = getAuth();
console.log('User ID:', auth.currentUser?.uid);
console.log('Email:', auth.currentUser?.email);
```
5. Skopíruj **User ID** (nie email!)

**Metóda B: Cez Firebase Console**
1. V Firebase Console klikni na **Authentication** (v ľavom menu)
2. Prejdi na záložku **Users**
3. Nájdi svoj email
4. Klikni na svoj účet
5. Skopíruj **User UID** (dlhý reťazec znakov)

---

### Krok 2: Vytvor Kolekciu `admins`

1. V Firebase Console > **Firestore Database**
2. Klikni na **"+ Start collection"** (alebo **"+ Add collection"**)
3. **Collection ID**: `admins`
4. Klikni **Next**

---

### Krok 3: Vytvor Prvý Admin Dokument

1. **Document ID**: Vlož svoj **User ID** (z Kroku 1)
   - ⚠️ **Dôležité**: Použi User ID, nie email!
   - Príklad: `abc123xyz789def456ghi012`

2. Klikni **Add field** a pridaj tieto polia:

   **Pole 1: `userId`**
   - Type: **string**
   - Value: Tvoj User ID (rovnaký ako Document ID)
   - Príklad: `abc123xyz789def456ghi012`

   **Pole 2: `email`**
   - Type: **string**
   - Value: Tvoj email
   - Príklad: `adrianmarjak2156165@gmail.com`

   **Pole 3: `isAdmin`**
   - Type: **boolean**
   - Value: `true` (zaškrtni checkbox)

   **Pole 4: `createdAt`**
   - Type: **timestamp**
   - Value: Klikni na ikonu kalendára a vyber aktuálny čas
   - Alebo klikni **Set to current time**

   **Pole 5: `updatedAt`**
   - Type: **timestamp**
   - Value: Rovnako ako `createdAt` (aktuálny čas)

3. Klikni **Save**

---

## ✅ Ako to má vyzerať

Po vytvorení by si mal vidieť:

```
Firestore Database
  └── (default)
      ├── pieStats          (tvoja existujúca kolekcia)
      ├── reviews           (tvoja existujúca kolekcia)
      └── admins            (NOVÁ kolekcia)
          └── {tvoj-user-id}    (dokument)
              ├── userId: "abc123xyz789..."
              ├── email: "adrianmarjak2156165@gmail.com"
              ├── isAdmin: true
              ├── createdAt: [timestamp]
              └── updatedAt: [timestamp]
```

---

## 🧪 Testovanie

### Test 1: Overenie v Firebase Console
1. Otvor kolekciu `admins`
2. Mala by sa zobraziť tvoja User ID ako dokument
3. Klikni na dokument
4. Over, že všetky polia sú správne:
   - ✅ `isAdmin` = `true`
   - ✅ `userId` = tvoj User ID
   - ✅ `email` = tvoj email

### Test 2: Overenie v Aplikácii
1. Spusti Angular: `ng serve`
2. **Odhlás sa** (ak si prihlásený)
3. **Prihlás sa znova** (aby sa načítal admin status)
4. Skús otvoriť admin stránku (napr. `/piechart`)
5. Mala by sa otvoriť bez chyby ✅

### Test 3: Backend API
```bash
# PowerShell
$userId = "tvoj-user-id"
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/check/$userId"
```

**Očakávaná odpoveď:**
```json
{
  "user_id": "abc123xyz789...",
  "isAdmin": true
}
```

---

## 📸 Vizuálny Príklad

### Firebase Console View:

```
┌─────────────────────────────────────────┐
│ Firestore Database                      │
├─────────────────────────────────────────┤
│ Collections:                             │
│                                         │
│  📁 pieStats                            │
│  📁 reviews                             │
│  📁 admins  ← NOVÁ KOLEKCIA            │
│     └── 📄 abc123xyz789...              │
│         ├── userId: "abc123xyz789..."   │
│         ├── email: "admin@example.com" │
│         ├── isAdmin: true               │
│         ├── createdAt: [timestamp]     │
│         └── updatedAt: [timestamp]     │
└─────────────────────────────────────────┘
```

---

## 🚨 Časté Chyby

### Chyba 1: "Permission denied"
**Príčina:** Security Rules nie sú nastavené správne
**Riešenie:** Aktualizuj Security Rules podľa `ADMIN_SETUP.md`

### Chyba 2: Admin Guard stále nefunguje
**Príčina:** 
- Použil si email namiesto User ID
- `isAdmin` nie je `true`
- Neodhlásil si sa a neprihlásil znova

**Riešenie:**
1. Skontroluj, či Document ID = User ID (nie email!)
2. Over, že `isAdmin` = `true` (boolean, nie string!)
3. Odhlás sa a prihlás znova v aplikácii

### Chyba 3: "Collection not found"
**Príčina:** Kolekcia `admins` neexistuje
**Riešenie:** Vytvor kolekciu podľa Kroku 2

---

## ✅ Kontrolný Zoznam

- [ ] User ID získaný (z Authentication alebo Developer Tools)
- [ ] Kolekcia `admins` vytvorená
- [ ] Dokument vytvorený s User ID ako Document ID
- [ ] Pole `userId` = User ID (string)
- [ ] Pole `email` = tvoj email (string)
- [ ] Pole `isAdmin` = `true` (boolean, nie string!)
- [ ] Pole `createdAt` = aktuálny čas (timestamp)
- [ ] Pole `updatedAt` = aktuálny čas (timestamp)
- [ ] Dokument uložený
- [ ] Testovanie v aplikácii úspešné

---

## 📚 Ďalšie Informácie

- Detailný návod: [`ADMIN_SETUP.md`](ADMIN_SETUP.md)
- Security Rules: [`FIREBASE_QUICK_SETUP.md`](FIREBASE_QUICK_SETUP.md) (Krok 3)

---

**Hotovo! 🎉** Po vytvorení admin dokumentu by si mal mať prístup k admin funkciám!



