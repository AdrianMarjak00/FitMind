from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import os
from dotenv import load_dotenv
from datetime import datetime
from firebase_admin import firestore

try:
    from .firebase_service import FirebaseService
    from .ai_service import AIService
    from .stats_service import StatsService
except ImportError:
    from firebase_service import FirebaseService
    from ai_service import AIService
    from stats_service import StatsService

load_dotenv()

app = FastAPI(title="FitMind AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

firebase = FirebaseService()
ai_service = AIService()
stats_service = StatsService()
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

@app.get("/")
async def root():
    return {
        "message": "FitMind AI Backend bezi!",
        "firebase": "pripojene" if firebase.is_connected() else "odpojene"
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """AI Chat endpoint"""
    user_id = request.user_id
    message = request.message
    
    try:
        safe_msg = message.encode("ascii", "ignore").decode()
        print(f"[USER] {user_id}: {safe_msg}")
    except Exception:
        print(f"[USER] {user_id}: <message>")
    
    # Načítaj dáta
    profile = firebase.get_user_profile(user_id)
    entries = {
        'food': firebase.get_entries(user_id, 'food', days=7, limit=5),
        'exercise': firebase.get_entries(user_id, 'exercise', days=7, limit=5),
        'mood': firebase.get_entries(user_id, 'mood', days=7, limit=1),
        'stress': firebase.get_entries(user_id, 'stress', days=7, limit=1),
        'sleep': firebase.get_entries(user_id, 'sleep', days=7, limit=1)
    }
    
    # Vytvor prompt
    system_prompt = ai_service.create_system_prompt(profile or {}, entries)
    
    try:
        # Volaj AI
        message_response = ai_service.chat(message, system_prompt)
        ai_odpoved = message_response.content
        saved_entries = []
        
        # Spracuj function calls
        if message_response.function_call:
            function_name = message_response.function_call.name
            function_args = json.loads(message_response.function_call.arguments)
            
            print(f"[AI] Vola funkciu: {function_name}")
            
            # Mapovanie funkcií (bez emoji pre Windows)
            function_map = {
                'save_food_entry': ('food', 'Jedlo ulozene'),
                'save_exercise_entry': ('exercise', 'Cvicenie ulozene'),
                'save_stress_entry': ('stress', 'Stres ulozeny'),
                'save_mood_entry': ('mood', 'Nalada ulozena'),
                'save_sleep_entry': ('sleep', 'Spanok ulozeny'),
                'save_weight_entry': ('weight', 'Vaha ulozena')
            }
            
            if function_name in function_map:
                entry_type, msg = function_map[function_name]
                if firebase.save_entry(user_id, entry_type, function_args):
                    saved_entries.append(msg)
            elif function_name == 'update_profile':
                if firebase.update_profile(user_id, function_args):
                    saved_entries.append('Profil aktualizovany')
            
            # Finálna odpoveď
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
                {"role": "assistant", "content": ai_odpoved, "function_call": message_response.function_call},
                {"role": "function", "name": function_name, "content": json.dumps({"success": True})}
            ]
            ai_odpoved = ai_service.get_final_response(messages) or ai_odpoved
        
        try:
            preview = (ai_odpoved or "").encode("ascii", "ignore").decode()[:100]
        except Exception:
            preview = "<non-ascii>"
        print(f"[AI] {preview if preview else 'Function call'}...")
        
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
    try:
        data = stats_service.get_chart_data(user_id, chart_type, days)
        return {"chart_type": chart_type, "data": data, "days": days}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/entries/{user_id}/{entry_type}")
async def get_entries(user_id: str, entry_type: str, days: Optional[int] = 30, limit: Optional[int] = 100):
    try:
        entries = firebase.get_entries(user_id, entry_type, days, limit)
        return {"entry_type": entry_type, "entries": entries, "count": len(entries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/check/{user_id}")
async def check_admin(user_id: str):
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
    try:
        admins = firebase.get_all_admins()
        return {"admins": admins, "count": len(admins)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str):
    try:
        profile = firebase.get_user_profile(user_id)
        if not profile:
            return {"user_id": user_id, "profile": None, "exists": False}
        return {"user_id": user_id, "profile": profile, "exists": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/profile")
async def save_profile(request: ProfileRequest):
    try:
        profile_data = {
            "userId": request.user_id,
            "updatedAt": firestore.SERVER_TIMESTAMP
        }
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
        
        # Skontroluj či profil existuje
        existing = firebase.get_user_profile(request.user_id)
        if existing:
            # Aktualizuj
            success = firebase.update_profile(request.user_id, profile_data)
        else:
            # Vytvor nový
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

if __name__ == "__main__":
    import uvicorn
    import socket
    import subprocess
    import platform
    
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENV", "production") == "development"
    
    # Kontrola a ukončenie procesu na porte 8000
    def kill_process_on_port(port_num):
        """Ukončí proces používajúci daný port"""
        try:
            if platform.system() == "Windows":
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
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    
    if result == 0:
        print(f"[WARNING] Port {port} je obsadeny, pokusam sa ukoncit proces...")
        kill_process_on_port(port)
        import time
        time.sleep(1)
    
    print(f"[START] Spustam FitMind Backend na porte {port}")
    print(f"[INFO] URL: http://localhost:{port}")
    print(f"[INFO] Rezim: {'Vyvoj' if reload else 'Produkcia'}")
    
    uvicorn.run(app, host="0.0.0.0", port=port, reload=reload, log_level="info")
