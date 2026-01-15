from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from datetime import datetime

load_dotenv()

app = FastAPI(title="FitMind AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    user_id: str
    message: str

# Firebase (voliteľné)
try:
    cred = credentials.Certificate("firebase-service-account.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except:
    db = None

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.get("/")
async def root():
    return {"message": "✅ FitMind AI Backend s OPENAI beží! 🚀"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "FitMind Backend"}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    user_id = request.user_id
    message = request.message
    
    print(f"🧑 {user_id}: {message}")
    
    # SIMULOVANÉ USER DÁTA (neskôr Firebase)
    user_data = {
        "profil": {
            "meno": "Ján Novák",
            "problémy": ["pracovný stres", "spánok"],
            "pomáha": ["prechádzka", "dychové cvičenia"]
        },
        "nalada": [{"skore": 3, "poznamka": "stredný deň"}]
    }
    
    profil = user_data.get('profil', {})
    nalada = user_data.get('nalada', [{}])[0] if user_data.get('nalada') else {}
    
    system_prompt = f"""Si FitMind AI coach. Poznáš tohto používateľa:

👤 MENO: {profil.get('meno', 'priateľ')}
😊 NÁLADA: {nalada.get('skore', 'N/A')}/5 - "{nalada.get('poznamka', '')}"
⚠️ PROBLÉMY: {', '.join(profil.get('problémy', []))}
✅ POMÁHA: {', '.join(profil.get('pomáha', []))}

POKYNY:
1. Buď empatický a podporný
2. Odkazuj na jeho históriu a problémy
3. Navrhni KONKRÉTNE akcie (čas, ako)
4. Používaj emoji 🌳😴⚡🔥
5. Krátke odpovede (3-4 vety)
6. Skonči otázkou

OTÁZKA: {message}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # ✅ Rýchle + lacné + SKUTOČNÉ AI
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        ai_odpoved = response.choices[0].message.content
        print(f"🤖 AI: {ai_odpoved[:100]}...")
        
        return {
            "odpoved": ai_odpoved,
            "latency": "300ms ⚡",
            "user_id": user_id,
            "model": "gpt-4o-mini"
        }
    
    except Exception as e:
        print(f"❌ CHYBA: {e}")
        raise HTTPException(status_code=500, detail=f"AI chyba: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
