# FitMind Backend - Hlavný API server (STABLE VERSION)
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
    SecurityHeadersMiddleware,
    RequestSizeLimitMiddleware,
    validate_user_id,
    sanitize_error_message,
    verify_firebase_token,
    check_admin_auth
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
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware, max_size=10 * 1024 * 1024)

# --- 3. CORS KONFIGURÁCIA (Outer layer) ---
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

# Inicializuj služby
firebase = FirebaseService()
ai_service = AIService()
stats_service = StatsService()
coach_service = CoachService(firebase)

class ChatRequest(BaseModel):
    user_id: str
    message: str

# --- API ENDPOINTY ---

@app.get("/api/status")
def api_status():
    return {
        "status": "online", 
        "firebase": "connected" if firebase.is_connected() else "disconnected",
        "ai": "operational" if ai_service.model else "limited"
    }

@app.get("/api/health")
def health():
    return {"status": "healthy", "timestamp": time.time()}

@app.post("/api/chat", dependencies=[Depends(verify_firebase_token)])
def chat(request: ChatRequest):
    validate_user_id(request.user_id)
    user_id = request.user_id
    message = request.message
    
    print(f"[CHAT] {user_id}: {message[:50]}...")
    
    try:
        profile = firebase.get_user_profile(user_id)
        entries = {
            'food': firebase.get_entries(user_id, 'food', days=7),
            'exercise': firebase.get_entries(user_id, 'exercise', days=7)
        }
        history = firebase.get_chat_history(user_id, limit=5)
        
        system_prompt = ai_service.create_system_prompt(profile or {}, entries)
        message_response = ai_service.chat(message, system_prompt, history)
        
        ai_odpoved = message_response.content
        saved_entries = []
        
        if message_response.function_call:
            fc_name = message_response.function_call.name
            fc_args = json.loads(message_response.function_call.arguments)
            
            mapping = {'save_food_entry': 'food', 'save_exercise_entry': 'exercise', 'save_mood_entry': 'mood', 'save_weight_entry': 'weight'}
            if fc_name in mapping:
                if firebase.save_entry(user_id, mapping[fc_name], fc_args):
                    saved_entries.append(f"Zaznamenané do {mapping[fc_name]}")
                    ai_odpoved = ai_service.get_final_response([])
        
        firebase.save_chat_message(user_id, 'user', message)
        if ai_odpoved:
            firebase.save_chat_message(user_id, 'assistant', ai_odpoved)
        
        return {"odpoved": ai_odpoved, "saved_entries": saved_entries}
        
    except Exception as e:
        print(f"[CHAT ERROR] {str(e)}")
        return {
            "odpoved": "Ospravedlňujem sa, ale momentálne mám technické potiaže pri komunikácii s AI. Skúste to prosím o chvíľu.", 
            "saved_entries": [],
            "error_detail": str(e) if not IS_PRODUCTION else None
        }

@app.get("/api/chart/{user_id}/{chart_type}", dependencies=[Depends(verify_firebase_token)])
def get_chart_data_api(user_id: str, chart_type: str, days: Optional[int] = 30):
    validate_user_id(user_id)
    try:
        data = stats_service.get_chart_data(user_id, chart_type, days)
        return {"chart_type": chart_type, "data": data, "days": days}
    except Exception as e:
        return {"chart_type": chart_type, "data": {}, "days": days, "error": str(e)}

@app.get("/api/stats/{user_id}", dependencies=[Depends(verify_firebase_token)])
def get_stats_api(user_id: str, days: Optional[int] = 30):
    validate_user_id(user_id)
    return {
        "calories": stats_service.get_calories_summary(user_id, days),
        "exercise": stats_service.get_exercise_summary(user_id, days)
    }

@app.get("/api/profile/{user_id}", dependencies=[Depends(verify_firebase_token)])
def get_profile_api(user_id: str):
    p = firebase.get_user_profile(user_id)
    return {"profile": p, "exists": p is not None}

@app.get("/api/coach/recommendations/{user_id}", dependencies=[Depends(verify_firebase_token)])
def get_recommendations_api(user_id: str):
    recs = coach_service.get_personalized_recommendations(user_id)
    return {"user_id": user_id, "recommendations": recs, "count": len(recs)}

@app.get("/api/chat/history/{user_id}", dependencies=[Depends(verify_firebase_token)])
def get_history_api(user_id: str, limit: Optional[int] = 50):
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
