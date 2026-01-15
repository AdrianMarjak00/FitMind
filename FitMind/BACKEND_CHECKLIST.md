# FitMind Backend - Deployment Checklist

## ✅ Stav projektu (2026-01-15)

### Backend konfiguracia - READY FOR DEPLOYMENT

#### 1. FastAPI aplikacia ([backend/main.py](backend/main.py))
- ✅ `app = FastAPI()` správne vytvorená
- ✅ Root endpoint `/` funguje
- ✅ Health check `/health` funguje
- ✅ Všetky API endpointy pod `/api/...`
- ✅ **ŽIADNY** `if __name__ == "__main__":` blok
- ✅ **ŽIADNY** `uvicorn.run()` v kóde

#### 2. Dependencies ([backend/requirements.txt](backend/requirements.txt))
```
fastapi==0.115.0
uvicorn[standard]==0.30.6
firebase-admin==6.5.0
python-dotenv==1.0.1
pydantic==2.9.2
google-generativeai==0.8.3
slowapi==0.1.9
```
- ✅ Všetky verzie sú špecifikované
- ✅ `uvicorn[standard]` pre production features

#### 3. Deployment súbory

**[start.sh](start.sh)** (Railpack primary)
```bash
#!/bin/sh
cd backend
python -m pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "Starting FitMind Backend..."
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**[Procfile](Procfile)** (Railpack fallback)
```
web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

#### 4. Firebase konfigurácia
- ✅ `firebase-service-account.json` v [backend/](backend/)
- ⚠️ **CRITICAL**: Súbor NESMIE byť v git (je v .gitignore)
- ⚠️ Na Railpacku MUSÍ byť nahraný manuálne alebo cez env variable

---

## 🚀 Lokálne testovanie (Windows)

### Možnosť 1: Test script (odporúčané)
```cmd
cd backend
test_local.bat
```

### Možnosť 2: Manuálne
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Testovanie endpointov
```
http://127.0.0.1:8000/          → {"status": "ok"}
http://127.0.0.1:8000/docs      → Swagger UI
http://127.0.0.1:8000/health    → {"status": "healthy"}
```

---

## 📦 Railpack Deployment

### Pred deploymentom - OVERENIE

1. **Git stav**
   ```bash
   git status
   git add .
   git commit -m "Backend ready for production"
   git push
   ```

2. **Firebase credentials**
   - Na Railpacku nahraj `firebase-service-account.json` do `backend/`
   - ALEBO nastav environment variable `FIREBASE_SERVICE_ACCOUNT` s JSON obsahom

3. **Environment variables (Railpack Dashboard)**
   ```
   GEMINI_API_KEY=tvoj_kluc
   FIREBASE_SERVICE_ACCOUNT=obsah_json_suboru (volitelne)
   ```

### Deployment process

1. **Railpack príkazy**
   ```bash
   git push origin AI-posun-trenovanie
   # Railpack auto-detect start.sh a spusti deployment
   ```

2. **Overenie po deployi**
   ```
   https://tvoja-app.railway.app/          → {"status": "ok"}
   https://tvoja-app.railway.app/health    → {"status": "healthy"}
   https://tvoja-app.railway.app/docs      → API dokumentacia
   ```

3. **Monitoring**
   - Railway Dashboard → Logs
   - Hladaj: "Application startup complete"
   - Hladaj: "Uvicorn running on http://0.0.0.0:XXXX"

---

## ⚠️ Časté problémy a riešenia

### Problem: {"detail": "Not Found"}

**Príčina A**: Zlý working directory
```bash
# ZLE
uvicorn main:app  # nie si v backend/

# SPRAVNE
cd backend && uvicorn main:app
```

**Príčina B**: Starý kod s `if __name__`
- ✅ Už opravené - tento blok neexistuje

**Príčina C**: Port nie je nastavený
- Railpack: automaticky nastavuje `$PORT`
- Lokálne: default 8000

### Problem: ModuleNotFoundError

**Riešenie**:
```bash
pip install -r requirements.txt
```

### Problem: Firebase credentials chyba

**Riešenie**:
1. Over že `firebase-service-account.json` existuje v `backend/`
2. ALEBO nastav env variable `FIREBASE_SERVICE_ACCOUNT`

---

## 📋 Final Checklist pre Railpack

- [ ] `start.sh` je executable (`chmod +x start.sh` na Linuxe)
- [ ] `requirements.txt` má všetky verzie
- [ ] `firebase-service-account.json` je na Railpacku
- [ ] Environment variables sú nastavené
- [ ] Git push do správnej vetvy
- [ ] Railway/Railpack build prejde úspešne
- [ ] Health check endpoint odpovedá
- [ ] API dokumentácia (/docs) je dostupná

---

## 🎯 Zhrnutie - Čo bolo opravené

| Položka | Pred | Po |
|---------|------|-----|
| uvicorn.run() | ❌ V kóde | ✅ Odstránené |
| requirements verzie | ❌ Chýbali | ✅ Všetky špecifikované |
| start.sh | ✅ OK | ✅ OK |
| Procfile | ✅ OK | ✅ OK |
| Lokálne testovanie | ⚠️ Komplikované | ✅ test_local.bat |

---

## 📝 Poznámky

- Backend je **production-ready**
- Všetky deployment súbory sú správne
- Lokálne testovanie funguje
- Railpack deployment by mal prejsť na prvý pokus

**Posledná aktualizácia**: 2026-01-15
**Status**: ✅ READY FOR DEPLOYMENT
