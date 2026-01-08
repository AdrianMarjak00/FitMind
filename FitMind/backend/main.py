# FitMind Backend - Hlavný API server
# Tento súbor obsahuje všetky API endpointy pre frontend

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import os
from dotenv import load_dotenv
from firebase_admin import firestore

# Import služieb - pokúsi sa najprv relatívny import, ak zlyhá, použije absolútny
try:
    from .firebase_service import FirebaseService
    from .ai_service import AIService
    from .stats_service import StatsService
    from .coach_service import CoachService
except ImportError:
    from firebase_service import FirebaseService
    from ai_service import AIService
    from stats_service import StatsService
    from coach_service import CoachService

# Načítaj premenné prostredia z .env súboru
load_dotenv()

# Vytvor FastAPI aplikáciu
app = FastAPI(title="FitMind AI Backend - Personal Coach Edition")

# Povol CORS (Cross-Origin Resource Sharing) - umožní frontendu komunikovať s backendom
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializuj služby (Firebase, AI, Stats, Coach)
firebase = FirebaseService()
ai_service = AIService()
stats_service = StatsService()
coach_service = CoachService(firebase)

# Definície dátových modelov pre API requesty
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

# API Endpointy

@app.get("/")
async def root():
    """Kontrola, či backend beží"""
    return {
        "message": "FitMind AI Backend bezi!",
        "firebase": "pripojene" if firebase.is_connected() else "odpojene"
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    AI Chat endpoint - pokročilý personalizovaný kouč s pamäťou konverzácie
    Automaticky zaznamenáva údaje a poskytuje personalizované rady
    """
    user_id = request.user_id
    message = request.message
    
    # Skús bezpečne vytlačiť správu (bez emoji pre Windows)
    try:
        safe_msg = message.encode("ascii", "ignore").decode()
        print(f"[USER] {user_id}: {safe_msg}")
    except Exception:
        print(f"[USER] {user_id}: <message>")
    
    # Načítaj profil a záznamy používateľa z databázy
    profile = firebase.get_user_profile(user_id)
    entries = {
        'food': firebase.get_entries(user_id, 'food', days=7, limit=10),
        'exercise': firebase.get_entries(user_id, 'exercise', days=7, limit=10),
        'mood': firebase.get_entries(user_id, 'mood', days=7, limit=5),
        'stress': firebase.get_entries(user_id, 'stress', days=7, limit=5),
        'sleep': firebase.get_entries(user_id, 'sleep', days=7, limit=5)
    }
    
    # Získaj konverzačnú históriu (posledných 10 správ)
    conversation_history = firebase.get_chat_history(user_id, limit=10)
    
    # Vytvor systémový prompt pre AI s informáciami o používateľovi a históriou
    system_prompt = ai_service.create_system_prompt(profile or {}, entries, conversation_history)
    
    try:
        # Pošli správu do OpenAI s históriou konverzácie
        message_response = ai_service.chat(message, system_prompt, conversation_history)
        ai_odpoved = message_response.content
        saved_entries = []
        
        # Ak AI chce zavolať funkciu (napr. uložiť jedlo), spracuj to
        if message_response.function_call:
            function_name = message_response.function_call.name
            function_args = json.loads(message_response.function_call.arguments)
            
            print(f"[AI] Vola funkciu: {function_name}")
            
            # Mapovanie názvov funkcií na typy záznamov
            function_map = {
                'save_food_entry': ('food', '🍽️ Jedlo ulozene'),
                'save_exercise_entry': ('exercise', '💪 Cvicenie ulozene'),
                'save_stress_entry': ('stress', '😰 Stres ulozeny'),
                'save_mood_entry': ('mood', '😊 Nalada ulozena'),
                'save_sleep_entry': ('sleep', '😴 Spanok ulozeny'),
                'save_weight_entry': ('weight', '⚖️ Vaha ulozena')
            }
            
            # Ulož záznam do databázy
            if function_name in function_map:
                entry_type, msg = function_map[function_name]
                if firebase.save_entry(user_id, entry_type, function_args):
                    saved_entries.append(msg)
            elif function_name == 'update_profile':
                if firebase.update_profile(user_id, function_args):
                    saved_entries.append('✅ Profil aktualizovany')
            
            # Získaj finálnu odpoveď od AI po uložení dát
            messages = [
                {"role": "system", "content": system_prompt},
                *conversation_history,
                {"role": "user", "content": message},
                {"role": "assistant", "content": ai_odpoved, "function_call": message_response.function_call},
                {"role": "function", "name": function_name, "content": json.dumps({"success": True})}
            ]
            ai_odpoved = ai_service.get_final_response(messages) or ai_odpoved
        
        # Ulož správy do histórie
        firebase.save_chat_message(user_id, 'user', message)
        if ai_odpoved:
            firebase.save_chat_message(user_id, 'assistant', ai_odpoved, 
                                      metadata={'saved_entries': saved_entries})
        
        # Vytlač preview odpovede
        try:
            preview = (ai_odpoved or "").encode("ascii", "ignore").decode()[:100]
        except Exception:
            preview = "<non-ascii>"
        print(f"[AI] {preview if preview else 'Function call'}...")
        
        # Vráť odpoveď frontendu
        return {
            "odpoved": ai_odpoved or "Data ulozene!",
            "saved_entries": saved_entries,
            "user_id": user_id
        }
    
    except Exception as e:
        print(f"[ERROR] CHYBA: {e}")
        raise HTTPException(status_code=500, detail=f"AI chyba: {str(e)}")

@app.get("/api/stats/{user_id}")
async def get_stats(user_id: str, days: Optional[int] = 30):
    """Získa všetky štatistiky pre používateľa"""
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

@app.get("/api/chart/{user_id}/{chart_type}")
async def get_chart_data(user_id: str, chart_type: str, days: Optional[int] = 30):
    """Získa dáta pre konkrétny graf (kalórie, cvičenie, nálada, atď.)"""
    try:
        data = stats_service.get_chart_data(user_id, chart_type, days)
        return {"chart_type": chart_type, "data": data, "days": days}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/entries/{user_id}/{entry_type}")
async def get_entries(user_id: str, entry_type: str, days: Optional[int] = 30, limit: Optional[int] = 100):
    """Získa záznamy pre používateľa (jedlo, cvičenie, atď.)"""
    try:
        entries = firebase.get_entries(user_id, entry_type, days, limit)
        return {"entry_type": entry_type, "entries": entries, "count": len(entries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/check/{user_id}")
async def check_admin(user_id: str):
    """Kontroluje, či je používateľ admin"""
    try:
        is_admin = firebase.is_admin(user_id)
        return {"user_id": user_id, "isAdmin": is_admin}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/check-email/{email}")
async def check_admin_by_email(email: str):
    """Kontroluje, či je email admin"""
    try:
        is_admin = firebase.is_admin_by_email(email)
        return {"email": email, "isAdmin": is_admin}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/add")
async def add_admin(request: AddAdminRequest):
    """Pridá admina do databázy"""
    try:
        success = firebase.add_admin(request.user_id, request.email)
        if success:
            return {"success": True, "message": f"Admin {request.email} pridaný"}
        else:
            raise HTTPException(status_code=500, detail="Nepodarilo sa pridať admina")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/list")
async def list_admins():
    """Získa zoznam všetkých adminov"""
    try:
        admins = firebase.get_all_admins()
        return {"admins": admins, "count": len(admins)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str):
    """Získa profil používateľa"""
    try:
        profile = firebase.get_user_profile(user_id)
        if not profile:
            return {"user_id": user_id, "profile": None, "exists": False}
        return {"user_id": user_id, "profile": profile, "exists": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/profile")
async def save_profile(request: ProfileRequest):
    """Uloží alebo aktualizuje profil používateľa (používa sa pri onboarding)"""
    try:
        # Vytvor slovník s dátami profilu
        profile_data = {
            "userId": request.user_id,
            "updatedAt": firestore.SERVER_TIMESTAMP
        }
        
        # Pridaj len tie polia, ktoré boli zadané
        if request.name:
            profile_data["name"] = request.name
        if request.age:
            profile_data["age"] = request.age
        if request.height:
            profile_data["height"] = request.height
        if request.gender:
            profile_data["gender"] = request.gender
        if request.activityLevel:
            profile_data["activityLevel"] = request.activityLevel
        if request.goals:
            profile_data["goals"] = request.goals
        if request.problems:
            profile_data["problems"] = request.problems
        if request.helps:
            profile_data["helps"] = request.helps
        if request.targetWeight:
            profile_data["targetWeight"] = request.targetWeight
        if request.targetCalories:
            profile_data["targetCalories"] = request.targetCalories
        
        # Skontroluj či profil už existuje
        existing = firebase.get_user_profile(request.user_id)
        if existing:
            # Aktualizuj existujúci profil
            success = firebase.update_profile(request.user_id, profile_data)
        else:
            # Vytvor nový profil
            profile_data["createdAt"] = firestore.SERVER_TIMESTAMP
            user_ref = firebase.db.collection('userFitnessProfiles').document(request.user_id)
            user_ref.set(profile_data, merge=True)
            success = True
        
        if success:
            return {"success": True, "message": "Profil ulozeny", "user_id": request.user_id}
        else:
            raise HTTPException(status_code=500, detail="Nepodarilo sa ulozit profil")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === PERSONALIZOVANÉ KOUČ ENDPOINTY ===

@app.get("/api/coach/weekly-report/{user_id}")
async def get_weekly_report(user_id: str):
    """Získa týždenný report pre používateľa s analýzou pokroku"""
    try:
        report = coach_service.generate_weekly_report(user_id)
        return {"user_id": user_id, "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/coach/monthly-report/{user_id}")
async def get_monthly_report(user_id: str):
    """Získa mesačný report pre používateľa s dlhodobými trendmi"""
    try:
        report = coach_service.generate_monthly_report(user_id)
        return {"user_id": user_id, "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/coach/recommendations/{user_id}")
async def get_recommendations(user_id: str):
    """Získa personalizované odporúčania pre používateľa"""
    try:
        recommendations = coach_service.get_personalized_recommendations(user_id)
        return {
            "user_id": user_id,
            "recommendations": recommendations,
            "count": len(recommendations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/coach/goal-progress/{user_id}")
async def get_goal_progress(user_id: str):
    """Kontroluje pokrok k stanoveným cieľom"""
    try:
        progress = coach_service.check_goal_progress(user_id)
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/history/{user_id}")
async def get_chat_history(user_id: str, limit: Optional[int] = 50):
    """Získa históriu konverzácie s AI"""
    try:
        history = firebase.get_chat_history(user_id, limit)
        return {
            "user_id": user_id,
            "messages": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chat/history/{user_id}")
async def clear_chat_history(user_id: str):
    """Vymaže históriu konverzácie"""
    try:
        success = firebase.clear_chat_history(user_id)
        if success:
            return {"success": True, "message": "Chat historia vymazana", "user_id": user_id}
        else:
            raise HTTPException(status_code=500, detail="Nepodarilo sa vymazat historiu")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Spustenie servera
if __name__ == "__main__":
    import uvicorn
    import socket
    import subprocess
    import platform
    
    # Nastavenia z environment premenných alebo default hodnoty
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENV", "production") == "development"
    
    def kill_process_on_port(port_num):
        """Ukončí proces používajúci daný port (ak je port obsadený)"""
        try:
            if platform.system() == "Windows":
                # Windows: nájdi a ukonči proces na porte
                result = subprocess.run(
                    ["netstat", "-ano"],
                    capture_output=True,
                    text=True,
                    shell=True
                )
                for line in result.stdout.split('\n'):
                    if f":{port_num}" in line and "LISTENING" in line:
                        parts = line.split()
                        if len(parts) > 4:
                            pid = parts[-1]
                            try:
                                subprocess.run(["taskkill", "/F", "/PID", pid], 
                                             capture_output=True, shell=True)
                                print(f"[INFO] Ukoncil proces {pid} na porte {port_num}")
                            except:
                                pass
            else:
                # Linux/Mac: nájdi a ukonči proces
                result = subprocess.run(
                    ["lsof", "-ti", f":{port_num}"],
                    capture_output=True,
                    text=True
                )
                if result.stdout.strip():
                    pid = result.stdout.strip()
                    subprocess.run(["kill", "-9", pid], capture_output=True)
                    print(f"[INFO] Ukoncil proces {pid} na porte {port_num}")
        except Exception:
            pass
    
    # Skontroluj či je port voľný
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    
    # Ak je port obsadený, ukonči starý proces
    if result == 0:
        print(f"[WARNING] Port {port} je obsadeny, pokusam sa ukoncit proces...")
        kill_process_on_port(port)
        import time
        time.sleep(1)  # Počkaj sekundu
    
    # Spusti server
    print(f"[START] Spustam FitMind Backend na porte {port}")
    print(f"[INFO] URL: http://localhost:{port}")
    print(f"[INFO] Rezim: {'Vyvoj' if reload else 'Produkcia'}")
    
    uvicorn.run(app, host="0.0.0.0", port=port, reload=reload, log_level="info")
