# 🚀 Bezpečný Deployment Guide pre FitMind

Tento návod ťa prevedie bezpečným nasadením FitMind aplikácie na Render.com.

## 📋 Pred deploymentom - Security Checklist

### 1. **Spusti bezpečnostný audit**

```powershell
cd backend
python security_audit.py
```

Uprav všetky problémy ktoré audit nájde!

### 2. **Odstráň citlivé súbory z Git histórie**

⚠️ **KRITICKÉ**: Skontroluj či `serviceAccountKey.json` nie je v Git histórii:

```powershell
# Skontroluj históriu
git log --all --full-history -- backend/serviceAccountKey.json

# Ak niečo nájde, MUSÍŠ ho odstrániť:
git rm --cached backend/serviceAccountKey.json
git commit -m "Remove serviceAccountKey.json from version control"

# Potom VYGENERUJ NOVÝ serviceAccountKey v Firebase Console!
# (Starý môže byť kompromitovaný)
```

### 3. **Aktualizuj .gitignore**

Uisti sa že `.gitignore` obsahuje:
```
*.env
.env
.env.local
.env.production
serviceAccountKey.json
firebase-adminsdk*.json
```

### 4. **Skontroluj že máš .env.example**

`.env.example` by mal obsahovať iba placeholder hodnoty, NIKDY skutočné API kľúče!

---

## 🔑 Príprava credentials

### Firebase Service Account Key

1. Choď do [Firebase Console](https://console.firebase.google.com/)
2. Vyber tvoj projekt → ⚙️ Project Settings → Service Accounts
3. Klikni **"Generate new private key"**
4. Stiahni JSON súbor a ulož ho ako `serviceAccountKey.json` (lokálne, NIE do gitu!)

### Google Gemini API Key

1. Choď na [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Klikni **"Create API key"**
3. Skopíruj kľúč (ukáže sa len raz!)

---

## 🌐 Deployment na Render.com

### Krok 1: Vytvor Web Service

1. Choď na [Render.com Dashboard](https://dashboard.render.com/)
2. Klikni **"New +"** → **"Web Service"**
3. Pripoj tvoj GitHub repository

### Krok 2: Nastavenia Web Service

**Basic Settings:**
- **Name:** `fitmind-backend` (alebo iný názov)
- **Region:** Europe (Frankfurt) - najbližšie k SK
- **Branch:** `main`
- **Root Directory:** Nechaj prázdne (ak je backend v root) alebo `./backend`
- **Environment:** `Docker`
- **Dockerfile Path:** `./Dockerfile` (alebo `./backend/Dockerfile`)

**Instance Type:**
- Free tier (pre začiatok)

### Krok 3: Environment Variables

V sekcii **Environment** → **Environment Variables**, pridaj:

| Key | Value | Poznámka |
|-----|-------|----------|
| `GOOGLE_API_KEY` | `tvoj-gemini-api-key` | ⚠️ Skrytý (Add as Secret) |
| `ENV` | `production` | |
| `PORT` | `8000` | |
| `ALLOWED_ORIGINS` | `https://www.fit-mind.sk,https://fit-mind.sk,https://fitmind-dba6a.web.app` | Tvoje frontend domény |

⚠️ **DÔLEŽITÉ**: Pre `GOOGLE_API_KEY` zaškrtni **"Add as Secret"** aby ho nikto nevidel!

### Krok 4: Secret Files (Firebase Credentials)

Render neumožňuje nahrať súbory priamo, takže musíme použiť environment variable:

1. Otvor tvoj lokálny `serviceAccountKey.json`
2. Skopíruj celý obsah (je to JSON)
3. V Render, pridaj environment variable:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Celý JSON obsah (priamo skopírovaný)
   - **Zaškrtni:** "Add as Secret"

4. Uprav tvoj `backend/firebase_service.py` aby čítal z environment variable:

```python
import os
import json

# V __init__ metóde FirebaseService:
service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
if service_account_json:
    # Načítaj z environment variable
    service_account = json.loads(service_account_json)
    cred = credentials.Certificate(service_account)
else:
    # Fallback na lokálny súbor (development)
    cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    cred = credentials.Certificate(cred_path)
```

### Krok 5: Deploy!

Klikni **"Create Web Service"** a počkaj kým sa build dokončí (5-10 minút).

---

## 🔒 Post-Deployment Security

### 1. **Otestuj Auth**

```bash
# Skús pristúpiť k chráneným endpointom bez tokenu
curl https://tvoja-render-url.onrender.com/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","message":"hello"}'

# Malo by vrátiť 401 Unauthorized
```

### 2. **Otestuj Rate Limiting**

Spusti 101 požiadaviek za 1 minútu - 101. by mala byť odmietnutá s 429 Too Many Requests.

### 3. **Sleduj logy**

V Render Dashboard → Logs sleduj:
- `[AUTH ERROR]` - neautorizované pokusy
- `[SECURITY]` - security incidenty
- `429` HTTP kódy - rate limit violations

### 4. **Nastav HTTPS Only**

Render automaticky používa HTTPS, ale uisti sa že tvoj frontend VŽDY používa `https://` URL.

### 5. **Firewall Rules (Voliteľné)**

Ak chceš extra bezpečnosť, nastav Render firewall aby blokoval všetky IP okrem tvojich frontend domén.

---

## 🚨 Emergency Response Plan

### Ak si myslíš že API kľúč unikol:

1. **OKAMŽITE revokuj starý kľúč:**
   - Firebase: Project Settings → Service Accounts → Manage service account → Disable key
   - Gemini: Google Cloud Console → API & Services → Credentials → Delete key

2. **Vygeneruj nový kľúč**

3. **Aktualizuj Render environment variables**

4. **Redeploy aplikáciu**

5. **Sleduj Firebase Usage** pre podozrivú aktivitu

### Ak niekto získal prístup k databáze:

1. Skontroluj Firebase Authentication → Users pre neznámych používateľov
2. Skontroluj Firestore logs pre podozrivé operácie
3. Zmeň Firebase security rules (ustrihni prístup)
4. Resetuj všetky user sessions (Force logout)

---

## 📊 Monitoring & Alerts

### Odporúčané nástroje:

1. **Sentry** - Error tracking
   ```bash
   pip install sentry-sdk
   ```

2. **Firebase Performance Monitoring** - Performance tracking

3. **Render Alerts** - Nastav upozornenia na:
   - High CPU usage (možný DoS attack)
   - High memory usage
   - Error rate > 5%

---

## ✅ Post-Deployment Checklist

- [ ] Backend je live na Render URL
- [ ] HTTPS funguje
- [ ] Firebase auth funguje (testované)
- [ ] AI chat odpovede fungujú
- [ ] Rate limiting funguje (testované)
- [ ] CORS je nastavený správne
- [ ] Environment variables sú nastavené ako secrets
- [ ] serviceAccountKey.json NIE JE vo verzovaní
- [ ] Frontend sa pripája na production backend
- [ ] Logy sa zbierajú a monitorujú
- [ ] Error tracking je aktívny (Sentry)

---

## 📞 Troubleshooting

### Backend sa nedá pripojiť k Firebase
- Skontroluj FIREBASE_SERVICE_ACCOUNT env var
- Skontroluj Firebase project ID v JSON
- Skontroluj Firebase IAM permissions

### AI chat nefunguje
- Skontroluj GOOGLE_API_KEY env var
- Skontroluj Gemini API quota v Google Cloud Console
- Skontroluj logy pre "[AI ERROR]"

### CORS errors
- Skontroluj ALLOWED_ORIGINS env var
- Skontroluj že frontend URL je v whitelist
- Skontroluj že frontend odosiela credentials

### 429 Too Many Requests (stále)
- Zvýš rate limit v main.py (RateLimitMiddleware)
- Alebo použi CDN/proxy pred backendom

---

🔒 **Pamätaj: Bezpečnosť je kontinuálny proces, nie jednorázová úloha!**

Pravidelne aktualizuj dependencies, sleduj CVE databázy a testuj svoju aplikáciu.
