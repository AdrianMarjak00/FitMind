# AI Service - Komunikácia s Google Gemini API
# Tento súbor obsahuje funkcie na prácu s Google Generative AI modelom

import json
from typing import Dict, List, Any, Optional
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool
from datetime import datetime, timedelta
import os

class AIService:
    """
    Service pre komunikáciu s Google Gemini API
    """
    
    def __init__(self):
        """Inicializuje Gemini klienta s API kľúčom"""
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("[WARNING] GOOGLE_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        
        # Definuj nástroje (funkcie)
        self.tools = self._get_tools()
        
        # Konfigurácia modelu
        self.model = genai.GenerativeModel(
            model_name='gemini-flash-latest',
            tools=[self.tools]
        )
    
    def _get_tools(self):
        """
        Vráti definície funkcií pre Gemini
        """
        save_food_entry = FunctionDeclaration(
            name="save_food_entry",
            description="Uloží záznam o jedle",
            parameters={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Názov jedla"},
                    "calories": {"type": "number", "description": "Počet kalórií"},
                    "protein": {"type": "number", "description": "Bielkoviny v gramoch"},
                    "carbs": {"type": "number", "description": "Sacharidy v gramoch"},
                    "fats": {"type": "number", "description": "Tuky v gramoch"},
                    "mealType": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"]}
                },
                "required": ["name", "calories"]
            }
        )
        
        save_exercise_entry = FunctionDeclaration(
            name="save_exercise_entry",
            description="Uloží záznam o cvičení",
            parameters={
                "type": "object",
                "properties": {
                    "type": {"type": "string", "description": "Typ cvičenia"},
                    "duration": {"type": "number", "description": "Trvanie v minútach"},
                    "intensity": {"type": "string", "enum": ["low", "medium", "high"]},
                    "caloriesBurned": {"type": "number", "description": "Spálené kalórie"},
                    "notes": {"type": "string", "description": "Poznámky"}
                },
                "required": ["type", "duration"]
            }
        )
        
        save_stress_entry = FunctionDeclaration(
            name="save_stress_entry",
            description="Uloží záznam o úrovni stresu",
            parameters={
                "type": "object",
                "properties": {
                    "level": {"type": "number", "description": "Úroveň stresu 1-10"},
                    "source": {"type": "string", "description": "Zdroj stresu"},
                    "notes": {"type": "string", "description": "Poznámky"}
                },
                "required": ["level"]
            }
        )
        
        save_mood_entry = FunctionDeclaration(
            name="save_mood_entry",
            description="Uloží záznam o nálade",
            parameters={
                "type": "object",
                "properties": {
                    "score": {"type": "number", "description": "Skóre nálady 1-5"},
                    "note": {"type": "string", "description": "Poznámka"}
                },
                "required": ["score"]
            }
        )
        
        save_sleep_entry = FunctionDeclaration(
            name="save_sleep_entry",
            description="Uloží záznam o spánku",
            parameters={
                "type": "object",
                "properties": {
                    "hours": {"type": "number", "description": "Počet hodín spánku"},
                    "quality": {"type": "string", "enum": ["poor", "fair", "good", "excellent"]}
                },
                "required": ["hours"]
            }
        )
        
        save_weight_entry = FunctionDeclaration(
            name="save_weight_entry",
            description="Uloží záznam o váhe",
            parameters={
                "type": "object",
                "properties": {
                    "weight": {"type": "number", "description": "Váha v kg"}
                },
                "required": ["weight"]
            }
        )
        
        update_profile = FunctionDeclaration(
            name="update_profile",
            description="Aktualizuje profil používateľa",
            parameters={
                "type": "object",
                "properties": {
                    "goals": {"type": "array", "items": {"type": "string"}, "description": "Ciele používateľa"},
                    "problems": {"type": "array", "items": {"type": "string"}, "description": "Problémy"},
                    "helps": {"type": "array", "items": {"type": "string"}, "description": "Čo pomáha"}
                }
            }
        )
        
        return Tool(
            function_declarations=[
                save_food_entry,
                save_exercise_entry,
                save_stress_entry,
                save_mood_entry,
                save_sleep_entry,
                save_weight_entry,
                update_profile
            ]
        )

    def analyze_user_progress(self, profile: Dict, entries: Dict) -> Dict[str, Any]:
        """Analyzuje pokrok používateľa na základe dát"""
        # Tu môžete implementovať vlastnú logiku výpočtu trendov
        analysis = {
            "calories_trend": "stable",
            "exercise_trend": "stable",
            "mood_trend": "stable",
            "achievements": [],
            "concerns": [],
            "recommendations": []
        }
        return analysis

    def create_system_prompt(self, profile: Dict, entries: Dict, conversation_history: Optional[List[Dict]] = None) -> str:
        """Vytvorí podrobný systémový prompt pre FitMind AI"""
        goals = ", ".join(profile.get('goals', []))
        
        prompt = f"""Si FitMind AI - osobný fitness tréner a mentor pre duševné zdravie.
Tvojím cieľom je pomáhať používateľovi dosiahnuť: {goals}.

DÔLEŽITÉ INŠTRUKCIE:
1. Používaj dostupné funkcie (tools) na ukladanie každého jedla, cvičenia, váhy, nálady alebo spánku.
2. Ak používateľ zadá neúplné informácie o jedle, odhadni kalórie a makroživiny.
3. Buď povzbudivý, ale profesionálny.
4. Ak používateľ nahlási vysoký stres alebo zlú náladu, navrhni krátke dychové cvičenie.

Aktuálne dáta profilu: {json.dumps(profile, ensure_ascii=False)}
"""
        return prompt

    def chat(self, message: str, system_prompt: str, conversation_history: Optional[List[Dict]] = None) -> Any:
        """
        Posiela správu do Gemini a simuluje OpenAI formát pre kompatibilitu
        """
        # Gemini Start Chat (tu by sa dala spracovať história konverzie)
        chat_session = self.model.start_chat(history=[])
        
        full_message = f"{system_prompt}\n\nPoužívateľ: {message}"
        
        try:
            response = chat_session.send_message(full_message)
            
            # Vyhľadanie volania funkcie v odpovedi
            fc = None
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        fc = part.function_call
                        break
            
            # Mockovacie triedy pre zachovanie kompatibility s main.py
            class MockFunctionCall:
                def __init__(self, name, args):
                    self.name = name
                    self.arguments = json.dumps(args)
            
            class MockMessage:
                def __init__(self, content, function_call=None):
                    self.content = content
                    self.function_call = function_call

            if fc:
                return MockMessage(
                    content=None,
                    function_call=MockFunctionCall(fc.name, dict(fc.args))
                )
            else:
                return MockMessage(content=response.text)
                
        except Exception as e:
            print(f"[ERROR] Gemini Chat Error: {e}")
            raise e

    def get_final_response(self, messages: List[Dict]) -> str:
        """
        Potvrdí úspešné vykonanie funkcie používateľovi
        """
        func_res = messages[-1] # Posledná správa s výsledkom funkcie
        
        prompt = f"Systémová informácia: Akcia prebehla úspešne s výsledkom: {func_res['content']}. Odpovedaj používateľovi prirodzene a potvrď uloženie."
        
        chat_session = self.model.start_chat(history=[])
        response = chat_session.send_message(prompt)
        return response.text