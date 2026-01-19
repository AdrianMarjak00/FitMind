# FitMind Backend - Hlavný API server
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional
import json
import os
import sys
import time
from dotenv import load_dotenv
from firebase_admin import firestore

# Pridaj aktuálny priečinok do sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Načítaj premenné prostredia
load_dotenv()

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
    sanitize_error_message,
    verify_firebase_token,
    check_admin_auth
)

print("[START] Inicializujem FastAPI...")
app = FastAPI(title="FitMind AI Backend")

# Is production?
is_production = os.getenv("ENV", "production") == "production"

# --- 1. CORS KONFIGURÁCIA ---
allowed_origins = [
    "https://www.fit-mind.sk",
    "https://fit-mind.sk",
    "https://fitmind-dba6a.web.app",
    "https://fitmind-dba6a.firebaseapp.com",
    "https://fitmind-backend-fvq7.onrender.com",
    "http://localhost:4200"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. KOMPRESIA (Pre rýchlejšie JS/CSS) ---
app.add_middleware(GZipMiddleware, minimum_size=500)

# --- 3. JEDNODUCHÝ LOGGER ---
@app.middleware("http")
async def simple_log(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        print(f"[{request.method}] {request.url.path} - {response.status_code} ({duration:.3f}s)")
        return response
    except Exception as e:
        print(f"[CRITICAL ERROR] {request.method} {request.url.path} failed: {str(e)}")
        raise e

# --- 4. BEZPEČNOSŤ ---
app.add_middleware(SecurityHeadersMiddleware)
# Rate limiting dočasne vypnutý pre elimináciu chýb pri štarte
# app.add_middleware(RateLimitMiddleware, requests_per_minute=100)
app.add_middleware(RequestSizeLimitMiddleware, max_size=10 * 1024 * 1024)

# Inicializuj služby
print("[START] Inicializujem Firebase a AI...")
firebase = FirebaseService()
ai_service = AIService()
stats_service = StatsService()
coach_service = CoachService(firebase)

# Modely pre API
class ChatRequest(BaseModel):
    user_id: str
    message: str

class AddAdminRequest(BaseModel):
    user_id: str
    email: str

class ProfileRequest(BaseModel):
    user_id: str
    name: Optional[str] = None
    age: Optional[int] = None
    height: Optional[int] = None
    gender: Optional[str] = None
    activityLevel: Optional[str] = None
    goals: Optional[list] = None
    problems: Optional[list] = None
    helps: Optional[list] = None
    targetWeight: Optional[float] = None
    targetCalories: Optional[int] = None

# --- API ENDPOINTY ---

@app.get("/api/status")
@app.get("/api/status/")
async def api_status():
    return {
        "status": "online", 
        "firebase": "connected" if firebase.is_connected() else "disconnected",
        "ai": "operational" if ai_service.model else "limited"
    }

@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": time.time()}

@app.post("/api/chat", dependencies=[Depends(verify_firebase_token)])
async def chat(request: ChatRequest):
    validate_user_id(request.user_id)
    user_id = request.user_id
    message = request.message
    
    profile = firebase.get_user_profile(user_id)
    entries = {
        'food': firebase.get_entries(user_id, 'food', days=7, limit=10),
        'exercise': firebase.get_entries(user_id, 'exercise', days=7, limit=10),
        'mood': firebase.get_entries(user_id, 'mood', days=7, limit=5),
        'stress': firebase.get_entries(user_id, 'stress', days=7, limit=5),
        'sleep': firebase.get_entries(user_id, 'sleep', days=7, limit=5)
    }
    
    conversation_history = firebase.get_chat_history(user_id, limit=10)
    system_prompt = ai_service.create_system_prompt(profile or {}, entries, conversation_history)
    
    try:
        message_response = ai_service.chat(message, system_prompt, conversation_history)
        ai_odpoved = message_response.content
        saved_entries = []
        
        if message_response.function_call:
            function_name = message_response.function_call.name
            function_args = json.loads(message_response.function_call.arguments)
            
            function_map = {
                'save_food_entry': ('food', '🍽️ Jedlo ulozene'),
                'save_exercise_entry': ('exercise', '💪 Cvicenie ulozene'),
                'save_stress_entry': ('stress', '😰 Stres ulozeny'),
                'save_mood_entry': ('mood', '😊 Nalada ulozena'),
                'save_sleep_entry': ('sleep', '😴 Spanok ulozeny'),
                'save_weight_entry': ('weight', '⚖️ Vaha ulozena')
            }
            
            if function_name in function_map:
                entry_type, msg = function_map[function_name]
                if firebase.save_entry(user_id, entry_type, function_args):
                    saved_entries.append(msg)
            elif function_name == 'update_profile':
                if firebase.update_profile(user_id, function_args):
                    saved_entries.append('✅ Profil aktualizovany')
            
            messages = [
                {"role": "system", "content": system_prompt},
                *conversation_history,
                {"role": "user", "content": message},
                {"role": "assistant", "content": ai_odpoved, "function_call": message_response.function_call},
                {"role": "function", "name": function_name, "content": json.dumps({"success": True})}
            ]
            
            try:
                ai_odpoved = ai_service.get_final_response(messages) or ai_odpoved
            except Exception:
                if not saved_entries: raise
        
        firebase.save_chat_message(user_id, 'user', message)
        if ai_odpoved:
            firebase.save_chat_message(user_id, 'assistant', ai_odpoved, metadata={'saved_entries': saved_entries})
        
        return {"odpoved": ai_odpoved or "Data ulozene!", "saved_entries": saved_entries, "user_id": user_id}
    except Exception as e:
        error_msg = sanitize_error_message(e, production=is_production)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/stats/{user_id}", dependencies=[Depends(verify_firebase_token)])
async def get_stats(user_id: str, days: Optional[int] = 30):
    validate_user_id(user_id)
    try:
        return {
            "calories": stats_service.get_calories_summary(user_id, days),
            "exercise": stats_service.get_exercise_summary(user_id, days),
            "sleep": stats_service.get_sleep_summary(user_id, days),
            "mood_trend": stats_service.get_mood_trend(user_id, days),
            "stress_trend": stats_service.get_stress_trend(user_id, days),
            "weight_trend": stats_service.get_weight_trend(user_id, days)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/profile/{user_id}", dependencies=[Depends(verify_firebase_token)])
async def get_profile(user_id: str):
    try:
        profile = firebase.get_user_profile(user_id)
        return {"user_id": user_id, "profile": profile, "exists": profile is not None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/profile", dependencies=[Depends(verify_firebase_token)])
async def save_profile(request: ProfileRequest):
    try:
        profile_data = {"userId": request.user_id, "updatedAt": firestore.SERVER_TIMESTAMP}
        for field in ["name", "age", "height", "gender", "activityLevel", "goals", "problems", "helps", "targetWeight", "targetCalories"]:
            val = getattr(request, field)
            if val is not None: profile_data[field] = val
        
        success = firebase.update_profile(request.user_id, profile_data)
        if not success:
            profile_data["createdAt"] = firestore.SERVER_TIMESTAMP
            firebase.db.collection('userFitnessProfiles').document(request.user_id).set(profile_data, merge=True)
            success = True
        return {"success": success, "user_id": request.user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ostatné coach endpointy
@app.get("/api/coach/weekly-report/{user_id}", dependencies=[Depends(verify_firebase_token)])
async def get_weekly_report(user_id: str):
    return {"user_id": user_id, "report": coach_service.generate_weekly_report(user_id)}

@app.get("/api/coach/recommendations/{user_id}", dependencies=[Depends(verify_firebase_token)])
async def get_recommendations(user_id: str):
    recs = coach_service.get_personalized_recommendations(user_id)
    return {"user_id": user_id, "recommendations": recs, "count": len(recs)}

@app.get("/api/chat/history/{user_id}", dependencies=[Depends(verify_firebase_token)])
async def get_chat_history(user_id: str, limit: Optional[int] = 50):
    history = firebase.get_chat_history(user_id, limit)
    return {"user_id": user_id, "messages": history, "count": len(history)}

# === SERVOVANIE ANGULAR FRONTENDU ===
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(BASE_DIR, "dist", "FitMind", "browser")

@app.get("/{full_path:path}")
async def serve_angular(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail=f"API not found: {full_path}")

    file_path = os.path.join(DIST_DIR, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return HTMLResponse(content="<h1>FitMind is loading...</h1><p>Please wait a moment.</p>", status_code=200)

print("[START] Backend pripravený.")
