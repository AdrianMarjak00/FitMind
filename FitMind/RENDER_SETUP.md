# Návod na nastavenie FitMind na Render.com

## Krok 1: Nastavenie Environment premenných

1. Prejdite na **Render Dashboard**: https://dashboard.render.com/
2. Otvorte váš backend service: **fitmind-backend**
3. Kliknite na záložku **Environment**
4. Pridajte tieto premenné:

### A) GOOGLE_API_KEY
```
GOOGLE_API_KEY=váš-google-gemini-api-kľúč
```
**Ako získať:**
- Prejdite na: https://aistudio.google.com/app/apikey
- Prihláste sa Google účtom
- Kliknite "Create API Key"
- Skopírujte kľúč a vložte vyššie

### B) FIREBASE_CREDENTIALS

**Kde nájsť:** Súbor `backend/serviceAccountKey.json` vo vašom projekte

**Ako nastaviť:**
1. Otvorte súbor `backend/serviceAccountKey.json`
2. Skopírujte CELÝ obsah súboru (musí to byť jeden riadok JSON)
3. Na Render Dashboard vložte do premennej `FIREBASE_CREDENTIALS`

**Tip:** Použite online nástroj na minifikáciu JSON (odstránenie medzier a nových riadkov):
- https://codebeautify.org/jsonminifier

Alebo príkazom:
```bash
cat backend/serviceAccountKey.json | tr -d '\n'
```

5. Kliknite **Save Changes**
6. Render automaticky reštartuje váš service

## Krok 2: Deploynite zmeny

Po pridaní environment premenných:

```bash
git add .
git commit -m "Fix: Aktualizacia backend URL pre Render"
git push origin main
```

Render automaticky spustí nový deploy.

## Krok 3: Overenie

Po deployi otvorte:
- Backend API status: https://fitmind-backend-fvq7.onrender.com/api/status
- Frontend: https://www.fit-mind.sk/

Malo by fungovať:
✅ Grafy na Dashboard
✅ AI Chat odpovedá na správy
✅ Všetky štatistiky sa načítavajú

## Riešenie problémov

### Backend vracia 500 Internal Server Error
- Skontrolujte či ste nastavili GOOGLE_API_KEY
- Skontrolujte či ste nastavili FIREBASE_CREDENTIALS
- Pozrite si logy na Render Dashboard → Logs

### Grafy sa nezobrazujú
- Skontrolujte konzolu v prehliadači (F12)
- Overte že frontend volá správnu URL: `https://fitmind-backend-fvq7.onrender.com/api`

### AI Chat neodpovedá
- Skontrolujte či máte platný Google Gemini API kľúč
- Overte že backend beží (status endpoint)
