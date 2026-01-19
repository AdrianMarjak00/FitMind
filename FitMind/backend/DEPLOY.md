# FitMind Backend - Jednoduché Nasadenie na Cloud Run

## 🚀 Jedno-príkazové nasadenie

```bash
gcloud run deploy fitmind \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars ENV=production
```

## 📋 Prvé nasadenie (Setup)

1. **Prihlás sa do Google Cloud:**
   ```bash
   gcloud auth login
   gcloud config set project fitmind-dba6a
   ```

2. **Nasaď aplikáciu z backend priečinka:**
   ```bash
   cd backend
   gcloud run deploy fitmind \
     --source . \
     --region europe-west1 \
     --platform managed \
     --allow-unauthenticated
   ```

3. **Nastav environment variables (RUČNE v konzole):**
   - Choď na: https://console.cloud.google.com/run
   - Vyber `fitmind` service
   - Klikni "EDIT & DEPLOY NEW REVISION"
   - V sekcii "Variables & Secrets" pridaj:
     - `ENV` = `production`
     - `GOOGLE_API_KEY` = `tvoj-gemini-api-key`
     - `FIREBASE_CREDENTIALS` = obsah `serviceAccountKey.json` (celý JSON ako string)

4. **Deploy zmeny:**
   Klikni "DEPLOY"

## 🔄 Aktualizácia (Update)

Keď zmeníš kód, jednoducho spusti z backend priečinka:

```bash
gcloud run deploy fitmind --source . --region europe-west1
```

To je všetko! ✅

## 🔍 Užitočné príkazy

**Zobraz logy:**
```bash
gcloud run services logs read fitmind --region europe-west1
```

**Zisti URL:**
```bash
gcloud run services describe fitmind --region europe-west1 --format='value(status.url)'
```

**Otvor v browseri:**
```bash
gcloud run services browse fitmind --region europe-west1
```

## ⚙️ Čo sa deje na pozadí

1. `gcloud run deploy --source .` automaticky:
   - Vytvorí Docker image z Dockerfile
   - Pushne ho do Google Container Registry
   - Nasadí na Cloud Run

2. Dockerfile už je správne nakonfigurovaný (Python 3.11, Gunicorn, port 8080)

3. Cloud Run automaticky použije $PORT environment variable

## 🎯 Hotovo!

Tvoja aplikácia beží na:
`https://fitmind-581538831484.europe-west1.run.app`

API endpoints:
- `https://fitmind-581538831484.europe-west1.run.app/api/health`
- `https://fitmind-581538831484.europe-west1.run.app/api/chat`
- atď.
