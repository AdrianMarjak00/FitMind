# 🚨 KRITICKÉ BEZPEČNOSTNÉ VAROVANIE!

## ⚠️ serviceAccountKey.json je vo verzovanom systéme Git!

Zistil som, že tvoj **Firebase Service Account Key** (`serviceAccountKey.json`) je vo verzovanom systéme Git. Toto je **KRITICKÝ bezpečnostný problém**!

### Prečo je to nebezpečné?

- Tento súbor obsahuje **úplné administrátorské prístupy** k tvojej Firebase databáze
- Ktokoľvek s prístupom k tvojmu Git repozitáru (GitHub, GitLab, atď.) môže:
  - Čítať všetky dáta v databáze
  - Mazať dáta
  - Upravovať dáta
  - Vytvárať falošných používateľov
  - Ukradnúť osobné údaje

### ✅ Čo musíš OKAMŽITE urobiť:

#### 1. **Odstráň súbor z Git (ale ponechaj lokálne)**

```powershell
# Prejdi do projektu
cd c:\Users\adria\Desktop\FitMind\FitMind

# Odstráň zo staginprostitional
git rm --cached backend/serviceAccountKey.json
git rm --cached scripts/serviceAccountKey.json

# Commit zmenu
git commit -m "🔒 SECURITY: Remove Firebase credentials from version control"

# Push na server
git push origin main
```

⚠️ **POZNÁMKA**: `git rm --cached` odstráni súbor iba z Gitu, NIE z tvojho disku!

#### 2. **Vygeneruj NOVÝ Service Account Key**

**Prečo?** Starý kľúč môže byť už kompromitovaný (ktokoľvek kto mal prístup k Git repozitáru ho videl).

1. Choď do [Firebase Console](https://console.firebase.google.com/)
2. Vyber tvoj projekt
3. ⚙️ **Project Settings** → **Service Accounts**
4. Klikni na tri bodky vedľa existujúceho kľúča → **Revoke** (Odvolaj starý kľúč)
5. Klikni **"Generate new private key"**
6. Stiahni nový JSON súbor
7. Ulož ho ako `backend/serviceAccountKey.json` (LOKÁLNE, nie do Gitu!)

#### 3. **Skontroluj že .gitignore funguje**

Už som aktualizoval tvoj `.gitignore`, ale over to:

```powershell
# Mal by vypísať .gitignore pravidlá
git check-ignore -v backend/serviceAccountKey.json

# Tento príkaz by NEMAL vypísať nič (súbor nie je tracked)
git ls-files | findstr serviceAccountKey
```

#### 4. **Aktualizuj Render.com**

Keď budeš mať nový `serviceAccountKey.json`:

1. Choď do [Render Dashboard](https://dashboard.render.com/)
2. Vyber tvoj Web Service
3. **Environment** → Nájdi `FIREBASE_SERVICE_ACCOUNT`
4. Odstráň staré credentials
5. Otvor nový `serviceAccountKey.json`, skopíruj celý JSON
6. Pridaj ho ako nový `FIREBASE_SERVICE_ACCOUNT` environment variable
7. Zaškrtni **"Add as Secret"**
8. Klikni **"Save Changes"**
9. Render automaticky redeploy-ne aplikáciu

#### 5. **Sleduj Firebase Usage**

Počas nasledujúcich 24-48 hodín sleduj:
- Firebase Console → **Usage and Billing**
- Neočakávané množstvo requestov?
- Prístupy z cudzích IP adries?

Ak niečo vyzerá podozrivo:
1. Deaktivuj Firebase projekt dočasne
2. Kontaktuj Firebase Support
3. Zmeň všetky prístupové údaje

---

## 📝 Príkazy na skopírovanie (postupne):

```powershell
# 1. Odstráň z Git
cd c:\Users\adria\Desktop\FitMind\FitMind
git rm --cached backend/serviceAccountKey.json
git rm --cached scripts/serviceAccountKey.json

# 2. Commit
git commit -m "🔒 SECURITY: Remove Firebase credentials from version control"

# 3. Push
git push origin main

# 4. Over že to fungovalo
git ls-files | findstr serviceAccountKey
# (Toto by nemalo vypísať nič!)

# 5. Over že súbor je stále lokálne (mal by existovať)
Test-Path backend\serviceAccountKey.json
# (Malo by vrátiť: True)
```

---

## ⏭️ Ďalšie kroky po odstránení

Keď dokončíš vyššie uvedené:
1. Vygeneruj nový Firebase Service Account Key
2. Ulož ho lokálne ako `backend/serviceAccountKey.json`
3. Aktualizuj Render environment variables
4. Testuj že aplikácia funguje s novými credentials

---

**Potrebuješ pomoc s niektorým krokom? Daj mi vedieť!**
