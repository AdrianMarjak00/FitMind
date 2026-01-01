# 🔑 Ako Získať User ID - Jednoduchý Návod

## ✅ Metóda 1: Firebase Console (Najjednoduchšie - ODPORÚČANÉ)

**Žiadny kód potrebný!**

1. Otvor [Firebase Console](https://console.firebase.google.com/)
2. Vyber projekt **FitMind**
3. V ľavom menu klikni na **Authentication**
4. Prejdi na záložku **Users**
5. Nájdi svoj email v zozname
6. **Klikni na svoj email** (alebo na ikonu oka 👁️)
7. V detailoch účtu nájdeš:
   - **User UID** - toto je tvoj User ID!
   - Skopíruj tento dlhý reťazec znakov

**Príklad:**
```
User UID: abc123xyz789def456ghi012jkl345mno678
```

---

## ✅ Metóda 2: Angular Aplikácia (Bez DevTools)

Vytvor jednoduchú stránku, ktorá zobrazí User ID.

### Krok 1: Vytvor komponent

Vytvor súbor `src/app/get-user-id/get-user-id.ts`:

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-get-user-id',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; max-width: 600px; margin: 50px auto;">
      <h2>🔑 Tvoj User ID</h2>
      <div *ngIf="currentUser; else notLoggedIn">
        <p><strong>Email:</strong> {{ currentUser.email }}</p>
        <p><strong>User ID:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all;">
          <code>{{ currentUser.uid }}</code>
        </div>
        <button (click)="copyToClipboard()" style="margin-top: 10px; padding: 10px 20px;">
          📋 Skopírovať User ID
        </button>
        <p *ngIf="copied" style="color: green; margin-top: 10px;">✅ Skopírované!</p>
      </div>
      <ng-template #notLoggedIn>
        <p>Prosím prihlás sa do aplikácie.</p>
      </ng-template>
    </div>
  `
})
export class GetUserIdComponent implements OnInit {
  currentUser: User | null = null;
  copied = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
    });
  }

  copyToClipboard(): void {
    if (this.currentUser?.uid) {
      navigator.clipboard.writeText(this.currentUser.uid).then(() => {
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
      });
    }
  }
}
```

### Krok 2: Pridaj route

V `src/app/app.routes.ts`:

```typescript
import { GetUserIdComponent } from './get-user-id/get-user-id';

export const routes: Routes = [
  // ... existujúce routes
  { path: 'get-user-id', component: GetUserIdComponent },
  // ...
];
```

### Krok 3: Použi

1. Spusti Angular: `ng serve`
2. Prihlás sa
3. Otvor: `http://localhost:4200/get-user-id`
4. Zobrazí sa tvoj User ID
5. Klikni na "Skopírovať User ID"

---

## ✅ Metóda 3: DevTools Console (Ak chceš použiť konzolu)

### Krok 1: Povoliť vloženie

1. Otvor Developer Tools (F12)
2. Prejdi na záložku **Console**
3. **Napíš**: `allow pasting` (bez úvodzoviek)
4. Stlač **Enter**

### Krok 2: Vlož kód

Teraz môžeš vložiť kód. Ale **jednoduchší spôsob** je:

```javascript
// Jednoduchý spôsob - len napíš:
firebase.auth().currentUser?.uid
```

Alebo ak používaš Angular Fire:

```javascript
// V Angular aplikácii, v konzole:
import { getAuth } from 'firebase/auth';
const auth = getAuth();
console.log('User ID:', auth.currentUser?.uid);
```

---

## ✅ Metóda 4: Backend Log (Ak už máš backend spustený)

1. Spusti backend: `cd backend && .\start.ps1`
2. Spusti Angular: `ng serve`
3. Prihlás sa
4. Použi AI Chat alebo akúkoľvek funkciu, ktorá volá backend
5. V backend termináli uvidíš logy s `user_id`

---

## 🎯 Odporúčanie

**Použi Metódu 1 (Firebase Console)** - je to najjednoduchšie a nevyžaduje žiadny kód!

1. Firebase Console > Authentication > Users
2. Klikni na svoj email
3. Skopíruj User UID

**Hotovo!** 🎉

---

## 📋 Čo ďalej?

Keď máš User ID:
1. Otvor Firebase Console > Firestore Database
2. Vytvor kolekciu `admins` (ak neexistuje)
3. Vytvor dokument s ID = tvoj User ID
4. Pridaj polia podľa `ADMIN_FIREBASE_CONSOLE_GUIDE.md`



