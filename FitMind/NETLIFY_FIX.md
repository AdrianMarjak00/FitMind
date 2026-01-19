# 🔧 Netlify 404 Error - Riešenie

## Problém
Netlify zobrazuje **"Page not found"** namiesto aplikácie.

## ✅ Riešenie krok-po-kroku

### 1. Skontroluj Build Settings v Netlify Dashboard

Choď na: https://app.netlify.com/sites/[tvoja-site]/settings/deploys

**MUSÍ byť nastavené:**
```
Build command: npm run build
Publish directory: dist/FitMind/browser
```

⚠️ **POZOR:** Ak máš nastavené `dist/FitMind` alebo `dist`, zmeň to na `dist/FitMind/browser`!

---

### 2. Overte Environment Variables

Choď na: https://app.netlify.com/sites/[tvoja-site]/settings/env

**Skontroluj či máš:**
- Žiadne environment variables NIE SÚ potrebné pre frontend (Firebase config je v kóde)
- Ak máš nejaké premenné, uisti sa, že nezasahujú do buildu

---

### 3. Vymaž Cache a Rebuild

V Netlify Dashboard:
1. Choď na **Deploys**
2. Klikni na **Trigger deploy** → **Clear cache and deploy site**

![Clear cache](https://docs.netlify.com/configure-builds/manage-dependencies/#clear-cache)

---

### 4. Skontroluj Deploy Log

Po deployi choď na **Deploy log** a hľadaj chyby:

**Dobrý build vyzerá takto:**
```
❯ Building...
✔ Building...
Application bundle generation complete.
Output location: /opt/build/repo/dist/FitMind
```

**Zlý build:**
```
ERROR: Module not found
Build failed
```

Ak vidíš ERROR, skopíruj celý log a nájdi problém.

---

### 5. Overte správnosť súborov

**Lokálne spusti build:**
```bash
npm run build
```

**Skontroluj output:**
```bash
ls dist/FitMind/browser
```

**Musíš vidieť:**
- index.html ✅
- _redirects ✅
- *.js súbory ✅
- favicon.ico ✅

---

### 6. Netlify konfigurácia súbory

**Máš 2 súbory:**

#### a) `netlify.toml` (v root priečinku)
```toml
[build]
  command = "npm run build"
  publish = "dist/FitMind/browser"

[[redirects]]
  from = "/api/*"
  to = "https://fitmind-581538831484.europe-west1.run.app/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### b) `public/_redirects`
```
/* /index.html  200
```

---

## 🚀 Quick Fix - Spusti Teraz

### Možnosť A: Redeploy z Git

1. **Commit a Push:**
   ```bash
   git add .
   git commit -m "Fix Netlify config"
   git push
   ```

2. Netlify automaticky rebuild-ne

### Možnosť B: Manual Deploy

1. **Build lokálne:**
   ```bash
   npm run build
   ```

2. **Choď na Netlify Dashboard**

3. **Drag & Drop:**
   - Prejdi na: Deploys tab
   - Drag & drop priečinok `dist/FitMind/browser` do Netlify

---

## 🔍 Ladenie (Debugging)

### Test 1: Skontroluj či index.html existuje
```bash
curl https://[tvoja-netlify-url]/index.html
```

Ak funguje → redirects nefungujú
Ak nefunguje → build path je zlý

### Test 2: Skontroluj Network tab
1. Otvor Chrome DevTools (F12)
2. Choď na Network tab
3. Načítaj stránku
4. Hľadaj 404 errors

### Test 3: Skontroluj _redirects
```bash
curl https://[tvoja-netlify-url]/_redirects
```

Mal by vrátiť obsah súboru, nie 404.

---

## ❌ Časté chyby

### 1. **Zlý publish directory**
```
❌ dist
❌ dist/FitMind
✅ dist/FitMind/browser
```

### 2. **Node version mismatch**
Netlify používa staršiu verziu Node. Pridaj do root priečinka `.nvmrc`:
```
20
```

### 3. **Build command zlyhá**
Skontroluj, či lokálne funguje:
```bash
npm clean-install
npm run build
```

### 4. **Missing dependencies**
Uisti sa, že všetky dependencies sú v `package.json` dependencies, NIE devDependencies:
- @angular/fire
- firebase
- echarts
- ngx-echarts
- sweetalert2

---

## 📞 Ešte stále nefunguje?

**Skontroluj Deploy Log na Netlify:**
1. Choď na Deploys
2. Klikni na posledný deploy
3. Prečítaj si celý log
4. Skopíruj chybové hlášky

**Typické chyby v logu:**
- `Module not found` → chýbajúce dependencies
- `Build script returned non-zero exit code` → build zlyhal
- `Publish directory not found` → zlá publish path

---

## ✅ Checklist

Pred tým, ako kontaktuješ support, overte:

- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist/FitMind/browser`
- [ ] `netlify.toml` existuje v root priečinku
- [ ] `public/_redirects` existuje
- [ ] Lokálny build funguje (`npm run build`)
- [ ] `dist/FitMind/browser/index.html` existuje
- [ ] `dist/FitMind/browser/_redirects` existuje
- [ ] Cache vymazaná a nový deploy spustený
- [ ] Deploy log neobsahuje chyby

---

## 🎯 Najrýchlejšie riešenie

```bash
# 1. Vyčisti všetko
rm -rf node_modules dist

# 2. Nainštaluj znova
npm install

# 3. Build
npm run build

# 4. Overte output
ls dist/FitMind/browser/index.html

# 5. Commit
git add .
git commit -m "Rebuild for Netlify"
git push

# 6. Na Netlify klikni "Clear cache and deploy site"
```

Hotovo! 🚀
