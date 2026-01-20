# 🔒 FitMind - Bezpečnostné vylepšenia

Tento dokument popisuje všetky bezpečnostné vylepšenia implementované v projekte FitMind.

## ✅ Implementované zabezpečenia

### 1. **Rate Limiting (Obmedzenie požiadaviek)**
- ✅ Rate limiting middleware pre všetky API endpointy (100 req/min)
- ✅ Denný limit správ pre AI chat (5 správ/deň na používateľa)
- ✅ IP-based tracking s podporou proxy serverov (X-Forwarded-For)

### 2. **Autentifikácia a Autorizácia**
- ✅ Firebase token validácia na všetkých chránených endpointoch
- ✅ User ID overenie - zabezpečenie aby používateľ videl len svoje dáta
- ✅ Token expiration handling
- ✅ Admin role checking (pre budúce admin endpointy)

### 3. **Input Validation (Validácia vstupov)**
- ✅ User ID format validation (alphanumeric + dashes/underscores)
- ✅ Message length limits pre chat (max 2000 znakov)
- ✅ Request size limiting (max 10 MB)
- ✅ Sanitácia chybových správ v produkcii

### 4. **Security Headers**
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY (ochrana pred clickjacking)
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Content-Security-Policy (CSP) s whitelistom povolených domén
- ⚠️ HSTS (Strict-Transport-Security) - pripravené pre HTTPS

### 5. **CORS Konfigurácia**
- ✅ Presne definované allowed origins (whitelist)
- ✅ Credentials support len pre dôveryhodné domény
- ✅ Žiadne wildcard `*` origins

### 6. **Ochrana citlivých údajov**
- ✅ `.gitignore` zabezpečuje že `.env` a `serviceAccountKey.json` nie sú vo verzovaní
- ✅ Environment variables pre API kľúče
- ✅ Separácia production/development konfigurácií
- ✅ Generické error messages v produkcii (žiadne stack traces)

### 7. **AI Bezpečnosť**
- ✅ Function calling security - len definované funkcie
- ✅ User context isolation - každý používateľ má vlastnú históriu
- ✅ AI rate limiting (5 správ/deň)
- ✅ Sanitácia AI odpovedí

## 🔴 KRITICKÉ - Musíš urobiť manuálne

### 1. **Odstráň serviceAccountKey.json z Git histórie**
Tento súbor **NESMIE** byť vo verzovaní! Obsahuje prístupové údaje k Firebase.

```powershell
# 1. Pridaj do .gitignore (už je pridané)
# 2. Odstráň zo staging
git rm --cached backend/serviceAccountKey.json

# 3. Commitni zmenu
git commit -m "Remove sensitive serviceAccountKey.json from version control"

# 4. Force push (AK JE REPO IBA TVOJE)
git push origin main --force

# 5. Vygeneruj NOVÝ serviceAccountKey v Firebase Console
# (starý môže byť kompromitovaný ak je na GitHube!)
```

### 2. **Nastav production environment variables na Render.com**
V Render.com dashboard → Environment → Environment Variables:

```
GOOGLE_API_KEY=<tvoj-skutočný-gemini-api-key>
ENV=production
PORT=8000
```

**NIKDY** nepridávaj skutočné API kľúče do `.env` súboru, ktorý je vo verzovaní!

### 3. **Firebase Service Account na Render**
Na Render.com musíš nahrať `serviceAccountKey.json` ako secret súbor:
- Render Dashboard → Settings → Secret Files
- Pridaj súbor: `backend/serviceAccountKey.json`

## ⚠️ Další odporúčania

### HTTPS Only (Pre produkciu)
Zapni HSTS header v `middleware/security.py` keď budeš používať HTTPS:
```python
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
```

### Monitoring & Logging
Zvážte integráciu:
- **Sentry** - pre error tracking
- **LogDNA/Datadog** - pre centralizované logy
- **Firebase Analytics** - pre user behavior tracking

### Regular Security Audits
- Pravidelne aktualizuj dependencies: `pip list --outdated`
- Sleduj CVE databázy pre `fastapi`, `firebase-admin`, `google-generativeai`
- Testuj API s nástrojmi ako **OWASP ZAP** alebo **Burp Suite**

### Additional Rate Limits
Ak budeš zdieľať aplikáciu verejne, zvážte:
- Captcha pre registráciu/login
- Progressive rate limiting (znižovanie limitu pri opakovanom porušovaní)
- IP blacklisting pre opakovaných útočníkov

## 📋 Security Checklist

- [x] Rate limiting na API
- [x] Firebase auth na všetkých endpointoch
- [x] Input validation
- [x] Security headers
- [x] CORS whitelist
- [x] Error message sanitization
- [x] Request size limits
- [x] User data isolation
- [ ] **KRITICKÉ: Odstráň serviceAccountKey.json z gitu**
- [ ] **KRITICKÉ: Nastav production ENV vars na Render**
- [x] .gitignore pre citlivé súbory
- [x] AI rate limiting
- [x] Function calling security

## 🚨 Emergency Response

Ak si myslíš, že tvoje API kľúče boli kompromitované:

1. **Okamžite revokuj všetky API kľúče**
   - Firebase Console → Project Settings → Service Accounts → Generate New Key
   - Google Cloud Console → API & Services → Credentials → Revoke Gemini API key

2. **Vygeneruj nové kľúče**

3. **Aktualizuj Render.com environment variables**

4. **Sleduj Firebase usage logs** pre neautorizované prístupy

5. **Zmař podozrivé Firebase user accounts**

## 📞 Podpora

Ak máte ďalšie bezpečnostné otázky alebo objavíte zraniteľnosti, kontaktujte vývojára.

---

**Posledná aktualizácia:** 2026-01-20
**Verzia:** 1.0
