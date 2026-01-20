# 🔒 FitMind Security Quick Reference

## 🚨 KRITICKÉ - UROB TERAZ!

```powershell
# 1. Odstráň Firebase credentials z Git
cd c:\Users\adria\Desktop\FitMind\FitMind
git rm --cached backend/serviceAccountKey.json
git rm --cached scripts/serviceAccountKey.json
git commit -m "🔒 SECURITY: Remove credentials"
git push origin main

# 2. Vygeneruj NOVÝ Firebase Service Account Key
# → Firebase Console → Settings → Service Accounts → Generate new key

# 3. Over že .gitignore funguje
git ls-files | findstr serviceAccountKey
# (Nemalo by vypísať nič!)
```

---

## 📋 Security Checklist

- [ ] `serviceAccountKey.json` odstránený z Git
- [ ] Nový Firebase Service Account Key vygenerovaný
- [ ] Render environment variables nastavené (GOOGLE_API_KEY, FIREBASE_SERVICE_ACCOUNT)
- [ ] `ENV=production` na Render
- [ ] `.env` súbor má skutočné API kľúče (lokálne, NIE v gite!)
- [ ] Security audit prešiel: `python backend/security_audit.py`
- [ ] Rate limiting testovaný (>100 req/min = 429)
- [ ] Auth testovaný (bez tokenu = 401)
- [ ] Aplikácia funguje na Render

---

## 🛡️ Implementované Bezpečnosti

| Typ | Implementácia | Súbor |
|-----|--------------|-------|
| **Rate Limiting** | 100 req/min na IP | `middleware/security.py` |
| **AI Limit** | 5 správ/deň na user | `firebase_service.py` |
| **Auth** | Firebase token vždy povinný | `middleware/auth.py` |
| **Input Validation** | Max 2000 znakov, format check | `main.py` |
| **Security Headers** | CSP, XSS, Clickjacking | `middleware/security.py` |
| **CORS** | Whitelist domén | `main.py` |
| **Error Sanitization** | Žiadne stack traces v prod | `middleware/security.py` |

---

## 🔑 Environment Variables

### Lokálne (`.env` súbor):
```env
GOOGLE_API_KEY=tvoj-gemini-key
ENV=development
PORT=8000
```

### Render.com (Dashboard → Environment):
```env
GOOGLE_API_KEY=<secret>        # Add as Secret ✓
FIREBASE_SERVICE_ACCOUNT=<json> # Add as Secret ✓
ENV=production
PORT=8000
ALLOWED_ORIGINS=https://www.fit-mind.sk,https://fitmind-dba6a.web.app
```

---

## 🧪 Bezpečnostné Testy

### Test 1: Rate Limiting
```powershell
# Posli >100 requestov za minútu
for ($i=1; $i -le 105; $i++) {
  Invoke-WebRequest https://tvoja-url.onrender.com/api/status
}
# Posledné by mali vrátiť 429
```

### Test 2: Auth
```bash
# Bez tokenu = 401
curl -X POST https://tvoja-url.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","message":"hi"}'
```

### Test 3: CORS
```javascript
// Z inej domény = CORS error (v konzole prehliadača)
fetch('https://tvoja-url.onrender.com/api/status')
```

---

## 🚨 Emergency Response

### Ak API kľúč unikol:
1. **Firebase**: Console → Service Accounts → Revoke key
2. **Gemini**: Google Cloud → Credentials → Delete key
3. Vygeneruj nové kľúče
4. Aktualizuj Render env vars
5. Redeploy

### Ak databáza kompromitovaná:
1. Firebase → Authentication → Delete podozrivých users
2. Firebase → Firestore → Rules → Strihni prístup
3. Skontroluj logs pre podozrivé operácie
4. Resetuj všetky sessions (Force logout)

---

## 📞 Dokumenty

| Dokument | Účel |
|----------|------|
| `SECURITY_SUMMARY.md` | Kompletné zhrnutie všetkého |
| `SECURITY_IMPROVEMENTS.md` | Detailný popis všetkých security features |
| `DEPLOYMENT_SECURITY.md` | Návod na bezpečný deployment |
| `CRITICAL_SECURITY_WARNING.md` | Návod na odstránenie credentials z Git |
| `security_audit.py` | Automatický security audit script |

---

## 🎯 Bezpečnostné Skóre

**Aktuálne:** 8/10 (po implementácii manuálnych krokov)

**Chýba do 10/10:**
- HTTPS Strict-Transport-Security
- WAF (Cloudflare)
- Centralizovaný logging (Sentry)

---

**Ak máš akúkoľvek otázku, skontroluj príslušný dokument vyššie!**
