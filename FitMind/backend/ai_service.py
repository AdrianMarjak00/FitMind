# AI Service - Komunikácia s Google Gemini API
import json
from typing import Dict, List, Any, Optional
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool
from datetime import datetime
import os

class AIEncoder(json.JSONEncoder):
    """Pomocník pre serializáciu špeciálnych objektov z Firebase do JSON"""
    def default(self, obj):
        if hasattr(obj, 'to_datetime'):
            return obj.to_datetime().isoformat()
        if hasattr(obj, 'timestamp'):
            try:
                return datetime.fromtimestamp(obj.timestamp()).isoformat()
            except:
                pass
        if isinstance(obj, datetime):
            return obj.isoformat()
        return str(obj)

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        
        if self.api_key:
            print(f"[DEBUG] AI Service: API Key detected ({self.api_key[:8]}...)")
            genai.configure(api_key=self.api_key)
        else:
            print("[WARNING] AI API key missing. AI will not work.")

    def _get_tools(self):
        """Definície nástrojov pre AI"""
        declarations = [
            FunctionDeclaration(
                name="save_food_entry",
                description="Uloží záznam o jedle s nutričnými hodnotami",
                parameters={
                    "type": "object", 
                    "properties": {
                        "name": {"type": "string", "description": "Názov jedla"}, 
                        "calories": {"type": "number", "description": "Celkové kalórie (kcal)"},
                        "protein": {"type": "number", "description": "Bielkoviny v gramoch"},
                        "carbs": {"type": "number", "description": "Sacharidy v gramoch"},
                        "fats": {"type": "number", "description": "Tuky v gramoch"},
                        "mealType": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"]}
                    }, 
                    "required": ["name", "calories", "protein", "carbs", "fats"]
                }
            ),
            FunctionDeclaration(
                name="save_exercise_entry",
                description="Uloží záznam o cvičení",
                parameters={"type": "object", "properties": {"type": {"type": "string"}, "duration": {"type": "number"}}, "required": ["type", "duration"]}
            ),
            FunctionDeclaration(
                name="save_mood_entry",
                description="Uloží záznam o nálade (1-10)",
                parameters={"type": "object", "properties": {"score": {"type": "number"}}, "required": ["score"]}
            ),
            FunctionDeclaration(
                name="save_weight_entry",
                description="Uloží váhu v kg",
                parameters={"type": "object", "properties": {"weight": {"type": "number"}}, "required": ["weight"]}
            )
        ]
        return Tool(function_declarations=declarations)

    def create_system_prompt(self, profile: Dict, entries: Dict) -> str:
        # Serializácia profilu s ošetrením typov
        profile_json = json.dumps(profile, cls=AIEncoder, ensure_ascii=False)
        goals = ", ".join(profile.get('goals', []))
        
        return f"""Si FitMind AI - expert na výživu a fitness tréner. 
Profil používateľa v JSON: {profile_json}. 
Ciele: {goals}.

TVOJE PRAVIDLÁ:
1. Odpovedaj VŽDY v slovenčine.
2. Ak používateľ povie, že niečo jedol, tvojou úlohou je to ZAPÍSAŤ.
3. NIKDY sa nepýtaj na kalórie alebo makroživiny (bielkoviny, sacharidy, tuky). Ty si expert, musíš ich ODHADNUŤ sám na základe vedeckých tabuliek.
4. Ak používateľ povie detaily (napr. "2 vajíčka"), použi presný odhad pre 2 vajíčka. Ak povie len "praženica", použi štandardnú porciu (cca 3 vajíčka).
5. Vždy zavolaj funkciu `save_food_entry` s tvojím odhadom.
6. Po zavolaní funkcie oznám používateľovi, čo si zapísal a aké hodnoty si odhadol (napr. "Zapísal som ti praženicu z 2 vajec (140 kcal, 12g bielkovín...)").
7. To isté platí pre cvičenie (odhadni spálené kalórie podľa dĺžky a typu) a váhu.
8. Buď stručný, motivačný a neospravedlňuj sa, že niečo nemáš v databáze. Ty si tá databáza.
"""

    def chat(self, message: str, system_prompt: str, history: List[Dict] = None) -> Any:
        if not self.api_key:
            raise Exception("AI API kľúč nie je nastavený.")

        # Zoznam modelov podľa priority pre r. 2026
        models_to_try = [
            'gemini-3-flash',      # Najnovší
            'gemini-2.5-flash',    # Odporúčaný používateľom
            'gemini-1.5-flash',    # Stabilný fallback
            'gemini-pro'           # Legacy
        ]
        
        model = None
        last_err = None

        for name in models_to_try:
            try:
                model = genai.GenerativeModel(
                    model_name=name,
                    tools=[self._get_tools()],
                    system_instruction=system_prompt
                )
                # Skúsime krátky testovací stream aby sme videli či model naozaj existuje
                print(f"[DEBUG] Trying model: {name}")
                model.generate_content("hi", generation_config={"max_output_tokens": 1})
                print(f"[DEBUG] Model {name} is active.")
                break
            except Exception as e:
                print(f"[DEBUG] Model {name} failed: {e}")
                last_err = e
                continue
        
        if not model:
            raise Exception(f"Nepodarilo sa vybrať funkčný AI model. Posledná chyba: {last_err}")

        # Konverzia histórie pre Gemini
        gemini_history = []
        if history:
            for msg in history:
                role = "user" if msg['role'] == "user" else "model"
                content = msg.get('content') or "Záznam bol úspešne uložený."
                gemini_history.append({"role": role, "parts": [content]})

        try:
            chat_session = model.start_chat(history=gemini_history)
            response = chat_session.send_message(message)
            
            # Kontrola či AI chce zavolať funkciu + získanie sprievodného textu
            fc = None
            text_parts = []
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        fc = part.function_call
                    elif hasattr(part, 'text') and part.text:
                        text_parts.append(part.text)
            
            ai_text = " ".join(text_parts).strip()
            
            # Pomocné triedy pre výsledok
            class MockResp:
                def __init__(self, c, f=None):
                    self.content = c
                    self.function_call = f
            class MockFC:
                def __init__(self, n, a):
                    self.name = n
                    self.arguments = json.dumps(a)

            if fc:
                final_text = ai_text if ai_text else "Jasné, už to zapisujem do tvojho denníka."
                return MockResp(final_text, MockFC(fc.name, dict(fc.args)))
            
            if not ai_text:
                try:
                    ai_text = response.text
                except:
                    ai_text = "Ospravedlňujem sa, ale na túto správu nemôžem odpovedať z bezpečnostných dôvodov."

            return MockResp(ai_text)
            
        except Exception as e:
            print(f"[ERROR] Gemini Chat Call failed: {e}")
            raise e

    def get_final_response(self, messages: List[Dict]) -> str:
        return "Hotovo! Váš záznam bol úspešne uložený do dashboardu. Máte ešte nejaké otázky?"