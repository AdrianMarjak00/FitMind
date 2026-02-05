# FitMind Backend - Hlavný API server (Refactored & Stable)
import json
import os
import sys
import time
import traceback
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Pridaj aktuálny priečinok do sys.path pre lokálne importy
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Načítaj premenné prostredia
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "local", ".env"))
IS_PRODUCTION = os.getenv("ENV", "production").lower() == "production"

# Import služieb
from firebase_databaza import FirebaseService
from ai_trener import AIService
from statistiky import StatsService
from recenzie import CoachService
from stripe_plat_brana import StripeService
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

# --- KONFIGURÁCIA APLIKÁCIE ---
app = FastAPI(
    title="FitMind AI Backend",
    description="Backend API pre inteligentnú fitness a wellness platformu FitMind",
    version="2.0.0"
)

# --- MIDDLEWARE ---

# 1. Logger
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

# 2. Bezpečnostné middleware
app.add_middleware(RateLimitMiddleware, requests_per_minute=100)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware, max_size=10 * 1024 * 1024)

# 3. CORS
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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Dev-Secret", "X-Requested-With"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining"]
)

# --- INICIALIZÁCIA SLUŽIEB (Singletons) ---
firebase = FirebaseService()
ai_service = AIService()
stats_service = StatsService(firebase)
coach_service = CoachService(firebase)
stripe_service = StripeService()

# --- MODELY DÁT ---
class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    conversation_id: Optional[str] = None

class CreateConversationRequest(BaseModel):
    title: Optional[str] = "Nová konverzácia"

class CreateCheckoutRequest(BaseModel):
    plan_type: str  # "basic", "pro"
    success_url: str
    cancel_url: str

# --- API ENDPOINTY: SYSTÉM ---

@app.get("/api/status", tags=["System"])
def api_status():
    """Vráti stav pripojenia k externým službám."""
    return {
        "status": "online", 
        "firebase": "connected" if firebase.is_connected() else "disconnected",
        "ai": "operational",
        "env": "production" if IS_PRODUCTION else "development"
    }

@app.get("/api/health", tags=["System"])
def health():
    """Základný healthcheck pre deployment platformy (napr. Render)."""
    return {"status": "healthy", "timestamp": time.time()}

# --- API ENDPOINTY: TESTOVANIE (Development only) ---

@app.post("/api/test/chat", tags=["Test"])
def test_chat(request: ChatRequest, dev_auth: dict = Depends(verify_dev_secret)):
    """
    🧪 TESTOVACÍ endpoint pre AI chat bez nutnosti Firebase tokenu.
    Vyžaduje hlavičku: X-Dev-Secret
    """
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        system_prompt = ai_service.create_system_prompt({}, {})
        message_response = ai_service.chat(message, system_prompt, [])

        ai_odpoved = message_response.content
        saved_entries = []

        if message_response.function_call:
            fc_name = message_response.function_call.name
            fc_args = json.loads(message_response.function_call.arguments)
            saved_entries.append(f"[TEST] Function called: {fc_name} with args: {fc_args}")
            if not ai_odpoved:
                ai_odpoved = ai_service.get_final_response([])

        return {
            "odpoved": ai_odpoved,
            "saved_entries": saved_entries,
            "test_mode": True
        }
    except Exception as e:
        return {"error": str(e), "test_mode": True}

@app.get("/api/test/status", tags=["Test"])
def test_status(dev_auth: dict = Depends(verify_dev_secret)):
    """Preverenie konfigurácie v testovacom režime."""
    return {
        "firebase_connected": firebase.is_connected(),
        "ai_ready": bool(ai_service.api_key),
        "stripe_ready": stripe_service.is_configured()
    }

# --- API ENDPOINTY: AI CHAT ---

@app.post("/api/chat", tags=["AI Coach"])
def chat(request: ChatRequest, decoded_token: dict = Depends(verify_firebase_token)):
    """Hlavný endpoint pre komunikáciu s AI trénerom."""
    user_id = decoded_token.get("uid")
    validate_user_id(user_id)
    
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # 1. Kontrola limitov
    limit_check = firebase.check_daily_message_limit(user_id, daily_limit=20)
    if not limit_check.get('allowed', False):
        return {
            "odpoved": f"Dosiahli ste denný limit (20 správ). Obnoví sa o {limit_check.get('reset_at')}.",
            "rate_limit": {"limited": True, "remaining": 0}
        }

    try:
        # 2. Príprava kontextu
        conv_id = request.conversation_id or firebase.get_or_create_default_conversation(user_id)
        profile = firebase.get_user_profile(user_id) or {}
        entries = {
            'food': firebase.get_entries(user_id, 'food', days=3),
            'exercise': firebase.get_entries(user_id, 'exercise', days=3)
        }
        history = firebase.get_conversation_messages(user_id, conv_id, limit=8)
        
        system_prompt = ai_service.create_system_prompt(profile, entries)

        # 3. Volanie AI
        response = ai_service.chat(message, system_prompt, history)
        ai_odpoved = response.content
        saved_entries = []

        # 4. Spracovanie zápisov (Function Calling)
        if response.function_call:
            fc_name = response.function_call.name
            fc_args = json.loads(response.function_call.arguments)
            
            mapping = {
                'save_food_entry': 'food',
                'save_exercise_entry': 'exercise',
                'save_mood_entry': 'mood',
                'save_weight_entry': 'weight'
            }
            
            if fc_name in mapping:
                if firebase.save_entry(user_id, mapping[fc_name], fc_args):
                    saved_entries.append(f"Zaznamenané: {mapping[fc_name]}")
                    if not ai_odpoved:
                        ai_odpoved = ai_service.get_final_response([])

        # 5. Uloženie a aktualizácia limitov
        firebase.save_conversation_message(user_id, conv_id, 'user', message)
        if ai_odpoved:
            firebase.save_conversation_message(user_id, conv_id, 'assistant', ai_odpoved)
        
        firebase.increment_message_count(user_id)
        remaining = firebase.check_daily_message_limit(user_id, daily_limit=20).get('remaining', 0)

        return {
            "odpoved": ai_odpoved,
            "saved_entries": saved_entries,
            "rate_limit": {"remaining": remaining, "total": 20}
        }
    except Exception as e:
        return {"odpoved": sanitize_error_message(e, IS_PRODUCTION), "error_detail": str(e) if not IS_PRODUCTION else None}

# --- API ENDPOINTY: ŠTATISTIKY ---

@app.get("/api/chart/{user_id}/{chart_type}", tags=["Statistics"])
def get_chart_data_api(user_id: str, chart_type: str, days: int = 30, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    allowed_types = {'calories', 'exercise', 'mood', 'stress', 'sleep', 'weight'}
    if chart_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid chart type")
    
    return {"chart_type": chart_type, "data": stats_service.get_chart_data(user_id, chart_type, days), "days": days}

@app.get("/api/stats/{user_id}", tags=["Statistics"])
def get_stats_api(user_id: str, days: int = 30, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    return {
        "calories": stats_service.get_calories_summary(user_id, days),
        "exercise": stats_service.get_exercise_summary(user_id, days)
    }

# --- API ENDPOINTY: PROFIL A KONVERZÁCIE ---

@app.get("/api/profile/{user_id}", tags=["User"])
def get_profile_api(user_id: str, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    p = firebase.get_user_profile(user_id)
    return {"profile": p, "exists": p is not None}

@app.get("/api/coach/recommendations/{user_id}", tags=["User"])
def get_recommendations_api(user_id: str, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    return {"recommendations": coach_service.get_personalized_recommendations(user_id)}

@app.get("/api/conversations/{user_id}", tags=["Conversations"])
def get_conversations_api(user_id: str, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    return {"conversations": firebase.get_conversations(user_id)}

@app.post("/api/conversations/{user_id}", tags=["Conversations"])
def create_conversation_api(user_id: str, request: CreateConversationRequest, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    conv_id = firebase.create_conversation(user_id, request.title)
    if not conv_id:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    return {"conversation_id": conv_id}

@app.delete("/api/conversations/{user_id}/{conversation_id}", tags=["Conversations"])
def delete_conversation_api(user_id: str, conversation_id: str, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    if not firebase.delete_conversation(user_id, conversation_id):
        raise HTTPException(status_code=500, detail="Failed to delete conversation")
    return {"deleted": True}

@app.get("/api/conversations/{user_id}/{conversation_id}/messages", tags=["Conversations"])
def get_conversation_messages_api(user_id: str, conversation_id: str, limit: int = 50, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    return {"messages": firebase.get_conversation_messages(user_id, conversation_id, limit)}

# --- API ENDPOINTY: PLATBY ---

@app.post("/api/payment/create-checkout", tags=["Payment"])
def create_checkout_session(request: CreateCheckoutRequest, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = decoded_token.get("uid")
    user_email = decoded_token.get("email", "")

    if request.plan_type == "free":
        return {"session_id": "free_plan", "url": request.success_url + "?status=success&plan=free"}

    if not stripe_service.is_configured():
        raise HTTPException(status_code=503, detail="Payment service not configured")

    result = stripe_service.create_checkout_session(user_id, user_email, request.plan_type, request.success_url, request.cancel_url)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")
    return result

@app.post("/api/payment/webhook", tags=["Payment"])
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    event = stripe_service.verify_webhook_signature(payload, sig_header)
    
    if not event:
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = event.get("data", {}).get("object", {})
    etype = event.get("type")

    try:
        if etype == "checkout.session.completed":
            user_id = data.get("metadata", {}).get("user_id")
            plan = data.get("metadata", {}).get("plan_type")
            if user_id and plan:
                firebase.save_payment_info(user_id, data.get("customer"), plan, "active", data.get("subscription"))
        elif etype in ["customer.subscription.updated", "customer.subscription.deleted"]:
            user_id = data.get("metadata", {}).get("user_id")
            status = "canceled" if etype.endswith("deleted") else data.get("status")
            if user_id:
                firebase.update_subscription_status(user_id, status, data.get("current_period_end"), data.get("id"))
    except Exception as e:
        print(f"[WEBHOOK ERROR] {e}")

    return {"received": True}

@app.get("/api/payment/status/{user_id}", tags=["Payment"])
def get_payment_status(user_id: str, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    sub = firebase.get_user_subscription(user_id)
    return {"user_id": user_id, "subscription": sub or {"plan_type": "free", "status": "none"}}

# --- SERVOVANIE FRONTENDU ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(BASE_DIR, "dist", "FitMind", "browser")

@app.get("/{full_path:path}", tags=["Frontend"])
def serve_angular(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="API route not found")
    
    file_path = os.path.join(DIST_DIR, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return HTMLResponse("<h1>FitMind Loading...</h1>", status_code=200)

# --- SPUSTENIE ---
if __name__ == "__main__":
    import uvicorn
    print(f"\n🚀 FitMind Backend štartuje na http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=not IS_PRODUCTION)
