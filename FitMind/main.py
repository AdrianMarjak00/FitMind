import sys
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Pridaj priečinok backend do cesty pre importy
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Importuj existujúcu FastAPI aplikáciu z tvojho backendu
from backend.main import app as api_app

# Hlavná aplikácia, ktorá spojí všetko dokopy
app = FastAPI()

# 1. Pripoj API endpointy pod cestu /api
app.mount("/api", api_app)

# 2. Nastav cestu k zostavenému Angular frontendu
# Render uloží súbory do priečinka 'dist/FitMind/browser'
frontend_path = os.path.join(os.path.dirname(__file__), "dist/FitMind/browser")

if os.path.exists(frontend_path):
    # Slúž statické súbory (JS, CSS, obrázky)
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
    
    # Zabezpeč Angular routing (všetko čo nie je API, vráti index.html)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            return # Nechaj API na api_app
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"message": "Frontend not found. Make sure you built the Angular app."}
