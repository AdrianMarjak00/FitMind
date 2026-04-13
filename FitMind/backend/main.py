# FitMind Backend - Hlavný API server (Refactored & Stable)
import json
import os
import sys
import time
import traceback
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Request, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from dotenv import load_dotenv

# Pridaj aktuálny priečinok do sys.path pre lokálne importy
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Načítaj premenné prostredia
def load_render_secrets():
    """
    Načíta Render 'Secret Files' z /etc/secrets/ do environment variables.
    Rieši problém, keď užívateľ použil 'Secret Files' namiesto 'Environment Variables'.
    """
    secrets_dir = "/etc/secrets"
    if os.path.exists(secrets_dir):
        print(f"[System] Detegovaný priečinok {secrets_dir}, načítavam tajné súbory...")
        for filename in os.listdir(secrets_dir):
            file_path = os.path.join(secrets_dir, filename)
            if os.path.isfile(file_path):
                try:
                    with open(file_path, "r") as f:
                        content = f.read().strip()
                        # Nastav hodnotu do environment variables
                        os.environ[filename] = content
                        print(f"[System] Načítaný secret do env: {filename}")
                except Exception as e:
                    print(f"[System] Chyba pri načítaní {filename}: {e}")

load_render_secrets()
# Načítaj premenné (v produkcii ich nastavuje Render/Docker)
load_dotenv()
IS_PRODUCTION = os.getenv("ENV", "development").lower() == "production"

# --- ŠTART BACKENDU (Ošetrenie double-printu pri uvicorne) ---
if os.environ.get("UVICORN_STARTED") != "1":
    print(f"[FitMind] Spúšťam backend (IS_PRODUCTION={IS_PRODUCTION})")
    os.environ["UVICORN_STARTED"] = "1"

# Import služieb
from firebase_databaza import FirebaseService
from ai_trener import AIService
from statistiky import StatsService
from coach_service import CoachService
from stripe_plat_brana import StripeService
from email_service import EmailService
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
    "http://localhost:4500",
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:65403" # Pridaný port z logu
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
email_service = EmailService()

@app.get("/api/health", tags=["System"])
def health():
    """Zdravotná kontrola aplikácie a služieb."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "firebase": {
                "connected": firebase.is_connected(),
                "db_initialized": firebase._db is not None
            },
            "stripe": {
                "configured": stripe_service.is_configured() if 'stripe_service' in globals() else False
            },
            "ai": {
                "configured": ai_service.is_configured() if 'ai_service' in globals() else False
            }
        },
        "environment": {
            "production": IS_PRODUCTION
        }
    }

# --- API ENDPOINTY: ADMIN PANEL ---

@app.get("/api/admin/user-debug/{email}", tags=["Admin"])
def admin_get_user_debug(email: str, admin_auth: dict = Depends(check_admin_auth)):
    """Vyhľadá používateľa a vráti jeho kompletné dáta (len pre adminov)."""
    user_data = firebase.get_user_by_email(email)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Pridaj informácie o subscription zo Stripe (ak má customer_id)
    stripe_info = None
    if user_data.get('stripe_customer_id'):
        try:
             import stripe
             stripe_info = stripe.Customer.retrieve(user_data['stripe_customer_id'])
        except:
             pass

    return {
        "firebase": user_data,
        "stripe": stripe_info
    }


@app.post("/api/admin/subscription/cancel", tags=["Admin"])
def admin_cancel_subscription(request: CancelSubscriptionRequest, admin_auth: dict = Depends(check_admin_auth)):
    """Natvrdo zruší predplatné používateľovi v Stripe aj Firebase."""
    user_data = firebase.get_user_by_email(request.email)
    if not user_data:
        raise HTTPException(status_code=404, detail="User with this email not found")
    
    user_id = user_data['uid']
    subscription = user_data.get('subscription', {})
    sub_id = subscription.get('subscription_id')

    stripe_success = False
    if sub_id:
        stripe_success = stripe_service.cancel_subscription(sub_id)
    
    db_success = firebase.delete_user_subscription(user_id)

    return {
        "success": db_success,
        "stripe_canceled": stripe_success,
        "message": f"Subscription for {request.email} processed."
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

    # 1. Zisti plán používateľa a nastav limity
    subscription = firebase.get_user_subscription(user_id)
    plan_type = subscription.get("plan_type", "free") if subscription else "free"
    plan_status = subscription.get("status", "none") if subscription else "none"

    # Limity podľa plánu (ak je subscription aktívna)
    plan_limits = {
        "free": 10,
        "basic": 10000,    # Premium plán
        "pro": 10000       # Premium plán
    }

    # Ak subscription nie je aktívna, použij free limit
    if plan_status != "active":
        daily_limit = plan_limits["free"]
        effective_plan = "free"
    else:
        daily_limit = plan_limits.get(plan_type, 20)
        effective_plan = plan_type

    # 2. Kontrola limitov
    limit_check = firebase.check_daily_message_limit(user_id, daily_limit=daily_limit)
    if not limit_check.get('allowed', False):
        upgrade_msg = ""
        if effective_plan == "free":
            upgrade_msg = " Pre viac správ si aktivuj platený plán na /training."
        return {
            "odpoved": f"Dosiahli ste denný limit ({daily_limit} správ).{upgrade_msg} Obnoví sa o {limit_check.get('reset_at')}.",
            "rate_limit": {"limited": True, "remaining": 0, "plan": effective_plan}
        }

    try:
        # 2. Príprava kontextu
        conv_id = request.conversation_id or firebase.get_or_create_default_conversation(user_id)
        profile = firebase.get_user_profile(user_id) or {}
        entries = {
            'food': firebase.get_entries(user_id, 'food', days=3),
            'exercise': firebase.get_entries(user_id, 'exercise', days=3),
            'weight': firebase.get_entries(user_id, 'weight', days=7),
            'mood': firebase.get_entries(user_id, 'mood', days=3),
            'sleep': firebase.get_entries(user_id, 'sleep', days=3),
            'stress': firebase.get_entries(user_id, 'stress', days=3)
        }
        history = firebase.get_conversation_messages(user_id, conv_id, limit=8)
        
        system_prompt = ai_service.create_system_prompt(profile, entries)

        # 3. Volanie AI
        response = ai_service.chat(message, system_prompt, history)
        ai_odpoved = response.content
        saved_entries = []

        # 4. Spracovanie zápisov (Function Calling)
        # response.function_calls je teraz zoznam objektov UdajeOFunkcii
        if response.function_calls:
            mapping = {
                "save_food_entry": "food",
                "save_exercise_entry": "exercise",
                "save_mood_entry": "mood",
                "save_weight_entry": "weight",
                "save_sleep_entry": "sleep",
                "save_stress_entry": "stress"
            }
            
            for fc in response.function_calls:
                fc_name = fc.name
                try:
                    fc_args = json.loads(fc.arguments) if isinstance(fc.arguments, str) else fc.arguments
                    print(f"[AI ACTION] Calling {fc_name} with: {fc_args}")
                    
                    if fc_name in mapping:
                        # Poistka pre číselné hodnoty (niektoré modely pošlú string)
                        for key in ['calories', 'protein', 'carbs', 'fats', 'duration', 'score', 'weight']:
                            if key in fc_args and isinstance(fc_args[key], str):
                                try: fc_args[key] = float(fc_args[key])
                                except: pass

                        if firebase.save_entry(user_id, mapping[fc_name], fc_args):
                            item_name = fc_args.get('name') or fc_args.get('type') or mapping[fc_name]
                            saved_entries.append(f"{item_name}")
                except Exception as e:
                    print(f"[CRITICAL ERROR] Failed to execute function {fc_name}: {e}")
                    traceback.print_exc()
            
            if not saved_entries:
                print(f"[AI WARNING] Action mapping failed or no entry saved. Function calls: {[f.name for f in response.function_calls]}")

            # Ak AI nevygenerovalo odpoveď, ale vykonalo akcie, dajme default
            if not ai_odpoved and saved_entries:
                ai_odpoved = "Ok! Zapísal som ti to do denníka. Ak chceš vedieť detaily alebo zmeniť množstvá, daj mi vedieť."
            elif not ai_odpoved:
                ai_odpoved = "Rozumiem. Máš ešte nejakú požiadavku, alebo chceš v niečom poradiť?"

        # 5. Uloženie a aktualizácia limitov
        firebase.save_conversation_message(user_id, conv_id, 'user', message)
        if ai_odpoved:
            firebase.save_conversation_message(user_id, conv_id, 'assistant', ai_odpoved)

        firebase.increment_message_count(user_id)
        remaining = firebase.check_daily_message_limit(user_id, daily_limit=daily_limit).get('remaining', 0)

        return {
            "odpoved": ai_odpoved,
            "saved_entries": saved_entries,
            "rate_limit": {"remaining": remaining, "total": daily_limit, "plan": effective_plan}
        }
    except Exception as e:
        print(f"[CHAT CRITICAL ERROR] {e}")
        traceback.print_exc()
        return {"odpoved": sanitize_error_message(e, IS_PRODUCTION), "error_detail": str(e) if not IS_PRODUCTION else None}

# --- API ENDPOINTY: ŠTATISTIKY ---

@app.get("/api/chart/{user_id}/{chart_type}", tags=["Statistics"])
def get_chart_data_api(
    user_id: str, 
    chart_type: ChartType, 
    days: int = 30, 
    decoded_token: dict = Depends(verify_firebase_token)
):
    user_id = get_authorized_user_id(user_id, decoded_token)
    return {
        "chart_type": chart_type, 
        "data": stats_service.get_chart_data(user_id, chart_type.value, days), 
        "days": days
    }

@app.get("/api/entries/{user_id}/{entry_type}", tags=["Statistics"])
def get_entries_api(
    user_id: str, 
    entry_type: EntryType, 
    days: int = 30, 
    limit: int = 100, 
    decoded_token: dict = Depends(verify_firebase_token)
):
    user_id = get_authorized_user_id(user_id, decoded_token)
    return firebase.get_entries(user_id, entry_type.value, days, limit)

@app.post("/api/entries/{user_id}/{entry_type}", tags=["Entries"])
def add_entry_api(
    user_id: str, 
    entry_type: EntryType, 
    data: dict = Body(...), 
    decoded_token: dict = Depends(verify_firebase_token)
):
    user_id = get_authorized_user_id(user_id, decoded_token)
    print(f"[API] Adding {entry_type} entry for {user_id}: {data}")
    success = firebase.save_entry(user_id, entry_type.value, data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save entry")
    return {"status": "ok", "message": f"{entry_type} entry saved"}

@app.delete("/api/entries/{user_id}/{entry_type}/{entry_id}", tags=["Entries"])
def delete_entry_api(
    user_id: str, 
    entry_type: EntryType, 
    entry_id: str, 
    decoded_token: dict = Depends(verify_firebase_token)
):
    user_id = get_authorized_user_id(user_id, decoded_token)
    print(f"[API] Deleting {entry_type} entry {entry_id} for {user_id}")
    success = firebase.delete_entry(user_id, entry_type.value, entry_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete entry")
    return {"status": "ok", "message": f"{entry_type} entry deleted"}

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

@app.post("/api/payment/verify-session", tags=["Payment"])
def verify_session(request: dict, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = decoded_token.get("uid")
    session_id = request.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
        
    # Overenie session v Stripe
    try:
        import stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == "paid":
            # Manual update DB
            plan = session.metadata.get("plan_type", "basic")
            customer_id = session.customer
            subscription_id = session.subscription
            
            # Uloženie do Firebase
            success = firebase.save_payment_info(user_id, customer_id, plan, "active", subscription_id)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to update subscription in database")
            
            return {"status": "verified", "plan": plan}
        else:
            return {"status": "unpaid"}
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VERIFY ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

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
            customer_email = data.get("customer_details", {}).get("email") or data.get("customer_email")
            amount = (data.get("amount_total", 0) or 0) / 100  # Stripe používa centy

            if user_id and plan:
                # Ulož informácie o platbe
                firebase.save_payment_info(user_id, data.get("customer"), plan, "active", data.get("subscription"))

                # Odošli email o úspešnej platbe
                if customer_email:
                    profile = firebase.get_user_profile(user_id)
                    first_name = profile.get("firstName", "Používateľ") if profile else "Používateľ"
                    email_service.send_payment_success_email(customer_email, first_name, plan, amount)
                    print(f"[EMAIL] Payment success email sent to {customer_email}")

        elif etype == "customer.subscription.updated":
            subscription_id = data.get("id")
            status = data.get("status")
            customer_id = data.get("customer")
            plan_type = data.get("metadata", {}).get("plan_type")

            # Nájdi používateľa podľa customer_id alebo subscription_id
            user_id = data.get("metadata", {}).get("user_id")
            if not user_id and customer_id:
                # Skús nájsť cez Firebase
                user_id = firebase.get_user_by_stripe_customer(customer_id)

            if user_id:
                firebase.update_subscription_status(user_id, status, data.get("current_period_end"), subscription_id, plan_type)

                # Ak bola subscription obnovená (invoice.paid), odošli email
                if status == "active":
                    profile = firebase.get_user_profile(user_id)
                    if profile and profile.get("email"):
                        from datetime import datetime
                        period_end = data.get("current_period_end")
                        next_date = datetime.fromtimestamp(period_end).strftime("%d.%m.%Y") if period_end else "N/A"
                        amount = (data.get("plan", {}).get("amount", 0) or 0) / 100
                        email_service.send_subscription_renewed_email(
                            profile["email"],
                            profile.get("firstName", "Používateľ"),
                            plan_type or "basic",
                            amount,
                            next_date
                        )

        elif etype == "customer.subscription.deleted":
            subscription_id = data.get("id")
            customer_id = data.get("customer")
            plan_type = data.get("metadata", {}).get("plan_type")

            user_id = data.get("metadata", {}).get("user_id")
            if not user_id and customer_id:
                user_id = firebase.get_user_by_stripe_customer(customer_id)

            if user_id:
                firebase.update_subscription_status(user_id, "canceled", data.get("current_period_end"), subscription_id, plan_type)

                # Odošli email o zrušení
                profile = firebase.get_user_profile(user_id)
                if profile and profile.get("email"):
                    from datetime import datetime
                    period_end = data.get("current_period_end")
                    end_date = datetime.fromtimestamp(period_end).strftime("%d.%m.%Y") if period_end else "N/A"
                    email_service.send_subscription_canceled_email(
                        profile["email"],
                        profile.get("firstName", "Používateľ"),
                        plan_type or "basic",
                        end_date
                    )

    except Exception as e:
        print(f"[WEBHOOK ERROR] {e}")
        import traceback
        print(traceback.format_exc())

    return {"received": True}

@app.post("/api/payment/customer-portal", tags=["Payment"])
def create_customer_portal(decoded_token: dict = Depends(verify_firebase_token)):
    """Vytvorí URL pre Stripe Customer Portal na správu predplatného."""
    user_id = decoded_token.get("uid")

    if not stripe_service.is_configured():
        raise HTTPException(status_code=503, detail="Payment service not configured")

    # Získaj stripe_customer_id z Firebase
    subscription = firebase.get_user_subscription(user_id)
    customer_id = subscription.get("stripe_customer_id") if subscription else None

    if not customer_id:
        raise HTTPException(status_code=404, detail="No Stripe customer found. Please subscribe first.")

    result = stripe_service.create_customer_portal_session(customer_id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create portal session")

    return result

@app.get("/api/payment/status/{user_id}", tags=["Payment"])
def get_payment_status(user_id: str, decoded_token: dict = Depends(verify_firebase_token)):
    user_id = get_authorized_user_id(user_id, decoded_token)
    sub = firebase.get_user_subscription(user_id)
    return {"user_id": user_id, "subscription": sub or {"plan_type": "free", "status": "none"}}

# --- API ENDPOINTY: EMAIL NOTIFIKÁCIE ---

@app.post("/api/email/welcome", tags=["Email"])
def send_welcome_email_endpoint(request: SendWelcomeEmailRequest, decoded_token: dict = Depends(verify_firebase_token)):
    """Odošle uvítací email novému používateľovi."""
    if not email_service.is_configured():
        return {"sent": False, "message": "Email service not configured"}

    success = email_service.send_welcome_email(request.email, request.first_name)
    return {"sent": success}

# --- API ENDPOINTY: AKTUALIZÁCIA PROFILU ---

@app.put("/api/profile/{user_id}", tags=["User"])
def update_profile_api(user_id: str, request: UpdateProfileRequest, decoded_token: dict = Depends(verify_firebase_token)):
    """Aktualizuje profil používateľa."""
    user_id = get_authorized_user_id(user_id, decoded_token)

    # Filtrovať len nenulové hodnoty
    updates = {k: v for k, v in request.model_dump().items() if v is not None}

    if not updates:
        return {"updated": False, "message": "No updates provided"}

    success = firebase.update_profile(user_id, updates)
    return {"updated": success}

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
    port = int(os.getenv("PORT", 8000))
    print(f"\n FitMind Backend startuje na http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not IS_PRODUCTION)

