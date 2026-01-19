# AI Service - Komunikácia s Google Gemini API
import json
from typing import Dict, List, Any, Optional
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool
from datetime import datetime, timedelta
import os

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = None
        self.tools = self._get_tools()
        
        if not self.api_key:
            print("[WARNING] AI API key missing.")
            return
            
        try:
            genai.configure(api_key=self.api_key, transport='rest')
            # Inicializujeme model bez system_instruction zatiaľ, 
            # budeme ho meniť dynamicky podľa používateľa
            self._create_model()
            print("[OK] Gemini AI initialized.")
        except Exception as e:
            print(f"[ERROR] AI Init: {e}")

    def _create_model(self, system_instruction: str = None):
        try:
            # Použijeme stabilný názov modelu namiesto -latest
            self.model = genai.GenerativeModel(
                model_name='gemini-1.5-flash',
                tools=[self.tools],
                system_instruction=system_instruction
            )
        except Exception as e:
            print(f"[ERROR] Create model failed: {e}")

    def _get_tools(self):
        # Definície nástrojov (skrátené pre prehľadnosť ale funkčné)
        declarations = [
            FunctionDeclaration(
                name="save_food_entry",
                description="Uloží záznam o jedle",
                parameters={"type": "object", "properties": {"name": {"type": "string"}, "calories": {"type": "number"}, "mealType": {"type": "string"}}, "required": ["name", "calories"]}
            ),
            FunctionDeclaration(
                name="save_exercise_entry",
                description="Uloží záznam o cvičení",
                parameters={"type": "object", "properties": {"type": {"type": "string"}, "duration": {"type": "number"}}, "required": ["type", "duration"]}
            ),
            FunctionDeclaration(
                name="save_mood_entry",
                description="Uloží záznam o nálade (1-5)",
                parameters={"type": "object", "properties": {"score": {"type": "number"}}, "required": ["score"]}
            ),
            FunctionDeclaration(
                name="save_weight_entry",
                description="Uloží aktuálnu váhu v kg",
                parameters={"type": "object", "properties": {"weight": {"type": "number"}}, "required": ["weight"]}
            ),
            FunctionDeclaration(
                name="update_profile",
                description="Aktualizuje ciele alebo problémy používateľa",
                parameters={"type": "object", "properties": {"goals": {"type": "array", "items": {"type": "string"}}, "problems": {"type": "array", "items": {"type": "string"}}}}
            )
        ]
        return Tool(function_declarations=declarations)

    def create_system_prompt(self, profile: Dict, entries: Dict, history=None) -> str:
        goals = ", ".join(profile.get('goals', []))
        return f"""Si FitMind AI - fitness a mental kouč.
Používateľove ciele: {goals}.
Profil: {json.dumps(profile, ensure_ascii=False)}

DÔLEŽITÉ: 
- Na každé jedlo, cvičenie alebo váhu POUŽI príslušnú funkciu.
- Buď stručný a motivujúci.
- Odpovedaj v slovenčine.
"""

    def chat(self, message: str, system_prompt: str, conversation_history: List[Dict] = None) -> Any:
        if not self.model or not self.api_key:
            raise Exception("AI model nie je nakonfigurovaný.")

        # Aktualizujeme model so správnym systémovým promptom pre tohto používateľa
        self._create_model(system_instruction=system_prompt)
        
        # Konverzia histórie
        gemini_history = []
        if conversation_history:
            for msg in conversation_history:
                role = "user" if msg['role'] == "user" else "model"
                # Ošetríme prázdny obsah (napr. pri function call v histórii)
                content = msg.get('content') or "OK"
                gemini_history.append({"role": role, "parts": [content]})

        try:
            chat_session = self.model.start_chat(history=gemini_history)
            response = chat_session.send_message(message)
            
            # Kontrola funkcie
            fc = None
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        fc = part.function_call
                        break
            
            # Tvorba odpovede pre main.py
            class MockResponse:
                def __init__(self, content, function_call=None):
                    self.content = content
                    self.function_call = function_call
            
            class MockFC:
                def __init__(self, name, args):
                    self.name = name
                    self.arguments = json.dumps(args)

            if fc:
                return MockResponse("Spracovávam vašu požiadavku...", MockFC(fc.name, dict(fc.args)))
            
            # Robustnejšie získanie textu (v prípade safety filtrov môže response.text zlyhať)
            res_text = "Nerozumiem, môžete to zopakovať inak?"
            try:
                if response.candidates and response.candidates[0].content.parts:
                    res_text = response.text
            except Exception:
                res_text = "Ospravedlňujem sa, ale na túto správu nemôžem odpovedať z bezpečnostných dôvodov."

            return MockResponse(res_text)
        except Exception as e:
            print(f"[ERROR] Chat call failed: {e}")
            raise e

    def get_final_response(self, messages: List[Dict]) -> str:
        # Jednoduché potvrdenie
        return "Úspešne som to uložil do vášho dashboardu!"