# AI Service - Komunikácia s Google Gemini API
import json
from typing import Dict, List, Any, Optional
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool
from datetime import datetime, timedelta
import os

class AIEncoder(json.JSONEncoder):
    """Pomocník pre serializáciu špeciálnych objektov z Firebase do JSON"""
    def default(self, obj):
        if hasattr(obj, 'to_datetime'):
            return obj.to_datetime().isoformat()
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        if isinstance(obj, datetime):
            return obj.isoformat()
        return str(obj)

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = None
        self.tools = self._get_tools()

        if self.api_key:
            print(f"[DEBUG] AI Service: API Key detected ({self.api_key[:8]}...)")

        if not self.api_key:
            print("[WARNING] AI API key missing.")
            return

        try:
            genai.configure(api_key=self.api_key)
            self._create_model()
        except Exception as e:
            print(f"[ERROR] AI Init: {e}")

    def _create_model(self, system_instruction: str = None):
        """Vytvorí model s voliteľným systémovým promptom"""
        # Zoznam modelov, ktoré skúsime v poradí
        models_to_try = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-001',
            'gemini-pro'
        ]
        
        last_error = None
        for m_name in models_to_try:
            try:
                self.model = genai.GenerativeModel(
                    model_name=m_name,
                    tools=[self.tools],
                    system_instruction=system_instruction
                )
                print(f"[DEBUG] Model {m_name} ready.")
                return
            except Exception as e:
                last_error = e
                continue
        
        print(f"[CRITICAL ERROR] Failed to initialize any AI model: {last_error}")

    def _get_tools(self):
        declarations = [
            FunctionDeclaration(
                name="save_food_entry",
                description="Uloží záznam o jedle",
                parameters={"type": "object", "properties": {"name": {"type": "string"}, "calories": {"type": "number"}}, "required": ["name", "calories"]}
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
        
        return f"""Si FitMind AI kouč. Používateľ: {profile_json}. Ciele: {goals}.
Odpovedaj v slovenčine, buď stručný a motivujúci. 
Ak používateľ povie čo jedol alebo cvičil, POUŽI funkciu na uloženie a potvrď to."""

    def chat(self, message: str, system_prompt: str, history: List[Dict] = None) -> Any:
        if not self.model:
            raise Exception("AI model nie je dostupný.")

        self._create_model(system_instruction=system_prompt)
        
        gemini_history = []
        if history:
            for msg in history:
                role = "user" if msg['role'] == "user" else "model"
                content = msg.get('content') or "Záznam uložený."
                gemini_history.append({"role": role, "parts": [content]})

        try:
            chat_session = self.model.start_chat(history=gemini_history)
            response = chat_session.send_message(message)
            
            fc = None
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        fc = part.function_call
                        break
            
            class MockResp:
                def __init__(self, c, f=None):
                    self.content = c
                    self.function_call = f
            class MockFC:
                def __init__(self, n, a):
                    self.name = n
                    self.arguments = json.dumps(a)

            if fc:
                return MockResp("Spracovávam...", MockFC(fc.name, dict(fc.args)))
            
            res_text = "Nerozumiem, skús to inak."
            try:
                res_text = response.text
            except:
                if response.candidates:
                    res_text = "Mám problém s odpoveďou, ale počúvam."

            return MockResp(res_text)
        except Exception as e:
            print(f"[ERROR] AI Chat failed: {e}")
            raise e

    def get_final_response(self, messages: List[Dict]) -> str:
        return "Hotovo! Záznam som uložil do tvojho dashboardu. 👍"