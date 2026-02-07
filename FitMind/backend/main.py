# FitMind Backend - Hlavný API server (STABLE VERSION)
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
import json
import os
import sys
import time
import traceback
from datetime import datetime
from dotenv import load_dotenv

# Pridaj aktuálny priečinok do sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Načítaj premenné prostredia
load_dotenv()
IS_PRODUCTION = os.getenv("ENV", "production").lower() == "production"

# Import služieb
from firebase_service import FirebaseService
from ai_service import AIService
from stats_service import StatsService
from coach_service import CoachService
from middleware import (
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    RequestSizeLimitMiddleware,
    validate_user_id,
    get_authorized_user_id,
    sanitize_error_message,
    verify_firebase_token,
    check_admin_auth,
    verify_dev_secret
)

print(f"[START] Inicializujem FastAPI (Env: {'Prod' if IS_PRODUCTION else 'Dev'})...")
app = FastAPI(title="FitMind AI Backend")

# --- 1. JEDNODUCHÝ LOGGER ---
@app.middleware("http")
async def simple_log(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        path = request.url.path
        if path.startswith("/api") and not path.endswith((".js", ".css", ".png", ".ico")):
            print(f"[{request.method}] {path} - {response.status_code} ({duration:.3f}s)")
        return response
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"[CRITICAL ERROR] {request.method} {request.url.path} failed: {str(e)}")
        print(f"[CRITICAL TRACEBACK] {error_details}")
        return JSONResponse(
            status_code=500, 
            content={"error": "Internal Server Error", "message": str(e)}
        )

# --- 2. BEZPEČNOSŤ ---
# Rate limiting - max 100 požiadaviek za minútu na IP
app.add_middleware(RateLimitMiddleware, requests_per_minute=100)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware, max_size=10 * 1024 * 1024)

# --- 3. CORS KONFIGURÁCIA ---
allowed_origins = [
    "https://www.fit-mind.sk",
    "https://fit-mind.sk",
    "https://fitmind-dba6a.web.app",
    "https://fitmind-dba6a.firebaseapp.com",
    "https://fitmind-backend-fvq7.onrender.com",
    "http://localhost:4200",
    "http://localhost:8080"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Inicializuj služby (Singletons)
firebase = FirebaseService()
ai_service = AIService()
stats_service = StatsService(firebase)
coach_service = CoachService(firebase)

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None  # Optional - backend používa UID z tokenu

    class Config:
        # Validácia dĺžky správy
        str_max_length = 2000

# --- API ENDPOINTY ---

@app.get("/api/status")
def api_status():
    return {
        "status": "online", 
        "firebase": "connected" if firebase.is_connected() else "disconnected",
        "ai": "operational" # Zjednodušený status
    }

@app.get("/api/health")
def health():
    return {"status": "healthy", "timestamp": time.time()}

# === TESTOVACIE ENDPOINTY (chránené DEV_SECRET) ===

@app.post("/api/test/chat")
def test_chat(request: ChatRequest, dev_auth: dict = Depends(verify_dev_secret)):
    """
    🧪 TESTOVACÍ endpoint pre AI chat - BEZ Firebase autentifikácie.
    Vyžaduje hlavičku: X-Dev-Secret: <váš DEV_SECRET>

    ⚠️ POZOR: Tento endpoint je len pre development/testovanie!
    V produkcii používajte /api/chat s Firebase tokenom.
    """
    user_id = "test-user-dev"
    message = request.message

    if not message or len(message.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")

    message = message.strip()
    print(f"[TEST CHAT] Request from dev mode: {message[:50]}...")

    try:
        # Zjednodušený test - bez Firebase kontextu
        system_prompt = ai_service.create_system_prompt({}, {})
        message_response = ai_service.chat(message, system_prompt, [])

        ai_odpoved = message_response.content
        saved_entries = []

        if message_response.function_call:
            fc_name = message_response.function_call.name
            fc_args = json.loads(message_response.function_call.arguments)
            print(f"[TEST CHAT] Function Call: {fc_name}")
            saved_entries.append(f"[TEST] Function called: {fc_name} with args: {fc_args}")
            if not ai_odpoved:
                ai_odpoved = ai_service.get_final_response([])

        return {
            "odpoved": ai_odpoved,
            "saved_entries": saved_entries,
            "test_mode": True,
            "note": "Toto je testovací režim - dáta sa neukladajú do Firebase"
        }

    except Exception as e:
        print(f"[TEST CHAT ERROR] {str(e)}")
        print(traceback.format_exc())
        return {
            "odpoved": f"Chyba AI: {str(e)}",
            "saved_entries": [],
            "test_mode": True,
            "error": str(e)
        }

@app.get("/api/test/status")
def test_status(dev_auth: dict = Depends(verify_dev_secret)):
    """
    🧪 TESTOVACÍ endpoint pre kontrolu stavu služieb.
    Vyžaduje hlavičku: X-Dev-Secret: <váš DEV_SECRET>
    """
    return {
        "status": "online",
        "test_mode": True,
        "firebase": "connected" if firebase.is_connected() else "disconnected",
        "ai_key_configured": bool(ai_service.api_key),
        "env": "development" if not IS_PRODUCTION else "production"
    }

# === PRODUKČNÉ ENDPOINTY ===

@app.post("/api/chat")
def chat(request: ChatRequest, decoded_token: dict = Depends(verify_firebase_token)):
    """
    AI Chat endpoint s denným limitom 20 správ na používateľa.
    VÝZNAMNÁ OPRAVA: Používame user_id priamo z tokenu,
    aby sme zabránili zdieľaniu histórie medzi používateľmi.
    """
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    # Validácia user_id formátu
    validate_user_id(user_id)

    message = request.message
    
    # Validácia dĺžky správy (dodatočná ochrana)
    if not message or len(message.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")
    
    # Sanitácia vstupu - odstránenie nebezpečných znakov
    message = message.strip()
    
    print(f"[CHAT] Request for user {user_id} (Token Verified)")

    # Kontrola denného limitu (20 správ/deň)
    limit_check = firebase.check_daily_message_limit(user_id, daily_limit=20)
    if not limit_check.get('allowed', False):
        remaining = limit_check.get('remaining', 0)
        reset_at = limit_check.get('reset_at', 'polnoc UTC')
        return {
            "odpoved": f"Dosiahli ste denný limit {20} správ. Zostávajúce správy: {remaining}. Limit sa obnoví o {reset_at}.",
            "saved_entries": [],
            "rate_limit": {
                "limited": True,
                "remaining": remaining,
                "reset_at": reset_at
            }
        }

    try:
        # Načítaj kontext konkrétneho používateľa
        profile = firebase.get_user_profile(user_id)
        entries = {
            'food': firebase.get_entries(user_id, 'food', days=3),
            'exercise': firebase.get_entries(user_id, 'exercise', days=3)
        }
        # História len pre tohto používateľa
        history = firebase.get_chat_history(user_id, limit=8)
        
        system_prompt = ai_service.create_system_prompt(profile or {}, entries)
        
        # Volanie AI - teraz stateless (vytvára model vnútri)
        message_response = ai_service.chat(message, system_prompt, history)
        
        ai_odpoved = message_response.content
        saved_entries = []
        
        # Spracovanie funkcií (uloženie do DB)
        if message_response.function_call:
            fc_name = message_response.function_call.name
            fc_args = json.loads(message_response.function_call.arguments)
            print(f"[CHAT] Function Call: {fc_name} for {user_id}")
            
            mapping = {
                'save_food_entry': 'food', 
                'save_exercise_entry': 'exercise', 
                'save_mood_entry': 'mood', 
                'save_weight_entry': 'weight'
            }
            if fc_name in mapping:
                if firebase.save_entry(user_id, mapping[fc_name], fc_args):
                    saved_entries.append(f"Zaznamenané do {mapping[fc_name]}")
                    # Ak AI neposlalo text spoločne s funkciou, doplníme generický
                    if not ai_odpoved or ai_odpoved.startswith("Jasné, už to zapisujem"):
                        ai_odpoved = ai_service.get_final_response([])
        
        # Uloženie do histórie používateľa
        firebase.save_chat_message(user_id, 'user', message)
        if ai_odpoved:
            firebase.save_chat_message(user_id, 'assistant', ai_odpoved)

        # Inkrementuj počítadlo správ
        firebase.increment_message_count(user_id)

        # Zisti zostávajúce správy
        updated_limit = firebase.check_daily_message_limit(user_id, daily_limit=20)
        remaining = updated_limit.get('remaining', 0)

        return {
            "odpoved": ai_odpoved,
            "saved_entries": saved_entries,
            "rate_limit": {
                "remaining": remaining,
                "total": 20
            }
        }
        
    except Exception as e:
        print(f"[CHAT ERROR] {str(e)}")
        print(traceback.format_exc())
        
        # Použiť sanitizáciu chybových správ pre produkciu
        error_message = sanitize_error_message(e, production=IS_PRODUCTION)
        
        return {
            "odpoved": error_message, 
            "saved_entries": [],
            "error_detail": str(e) if not IS_PRODUCTION else None
        }

@app.get("/api/chart/{user_id}/{chart_type}")
def get_chart_data_api(user_id: str, chart_type: str, days: Optional[int] = 30, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    
    # Validácia chart_type - ochrana pred injection
    allowed_types = {'calories', 'exercise', 'mood', 'stress', 'sleep', 'weight'}
    if chart_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid chart type. Allowed: {', '.join(allowed_types)}")
    
    try:
        data = stats_service.get_chart_data(user_id, chart_type, days)
        return {"chart_type": chart_type, "data": data, "days": days}
    except Exception as e:
        return {"chart_type": chart_type, "data": {}, "days": days, "error": str(e)}

@app.get("/api/stats/{user_id}")
def get_stats_api(user_id: str, days: Optional[int] = 30, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    return {
        "calories": stats_service.get_calories_summary(user_id, days),
        "exercise": stats_service.get_exercise_summary(user_id, days)
    }

@app.get("/api/profile/{user_id}")
def get_profile_api(user_id: str, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    p = firebase.get_user_profile(user_id)
    return {"profile": p, "exists": p is not None}

@app.get("/api/coach/recommendations/{user_id}")
def get_recommendations_api(user_id: str, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    recs = coach_service.get_personalized_recommendations(user_id)
    return {"user_id": user_id, "recommendations": recs, "count": len(recs)}

@app.get("/api/chat/history/{user_id}")
def get_history_api(user_id: str, limit: Optional[int] = 50, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    hist = firebase.get_chat_history(user_id, limit)
    return {"messages": hist}

# === SERVOVANIE FRONTENDU ===
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(BASE_DIR, "dist", "FitMind", "browser")

@app.get("/{full_path:path}")
def serve_angular(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail=f"API not found: /{full_path}")
    file_path = os.path.join(DIST_DIR, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h1>FitMind Loading...</h1>", status_code=200)

print("[START] Backend beží.")

# Spustenie servera pri priamom spustení (python main.py)
if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("[START] FitMind Backend Server")
    print("[DOCS] http://localhost:8000/docs")
    print("="*50 + "\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=not IS_PRODUCTION)
