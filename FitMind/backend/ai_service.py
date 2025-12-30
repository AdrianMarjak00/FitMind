import json
from typing import Dict, List, Any
from openai import OpenAI
import os

class AIService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.functions = self._get_function_definitions()
    
    def _get_function_definitions(self) -> List[Dict]:
        return [
            {
                "name": "save_food_entry",
                "description": "Uloží záznam o jedle",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "calories": {"type": "number"},
                        "protein": {"type": "number"},
                        "carbs": {"type": "number"},
                        "fats": {"type": "number"},
                        "mealType": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"]}
                    },
                    "required": ["name", "calories"]
                }
            },
            {
                "name": "save_exercise_entry",
                "description": "Uloží záznam o cvičení",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string"},
                        "duration": {"type": "number"},
                        "intensity": {"type": "string", "enum": ["low", "medium", "high"]},
                        "caloriesBurned": {"type": "number"},
                        "notes": {"type": "string"}
                    },
                    "required": ["type", "duration"]
                }
            },
            {
                "name": "save_stress_entry",
                "description": "Uloží záznam o strese",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "level": {"type": "number"},
                        "source": {"type": "string"},
                        "notes": {"type": "string"}
                    },
                    "required": ["level"]
                }
            },
            {
                "name": "save_mood_entry",
                "description": "Uloží záznam o nálade",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "note": {"type": "string"}
                    },
                    "required": ["score"]
                }
            },
            {
                "name": "save_sleep_entry",
                "description": "Uloží záznam o spánku",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "hours": {"type": "number"},
                        "quality": {"type": "string", "enum": ["poor", "fair", "good", "excellent"]}
                    },
                    "required": ["hours"]
                }
            },
            {
                "name": "save_weight_entry",
                "description": "Uloží záznam o váhe",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "weight": {"type": "number"}
                    },
                    "required": ["weight"]
                }
            },
            {
                "name": "update_profile",
                "description": "Aktualizuje profil",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "goals": {"type": "array", "items": {"type": "string"}},
                        "problems": {"type": "array", "items": {"type": "string"}},
                        "helps": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        ]
    
    def create_system_prompt(self, profile: Dict, entries: Dict) -> str:
        """Vytvorí system prompt pre AI"""
        profile_info = ""
        if profile:
            profile_info = f"""
👤 MENO: {profile.get('name', 'priateľ')}
🎯 VEK: {profile.get('age', 'N/A')}
📏 VÝŠKA: {profile.get('height', 'N/A')} cm
🎯 CIELE: {', '.join(profile.get('goals', [])) if profile.get('goals') else 'N/A'}
⚠️ PROBLÉMY: {', '.join(profile.get('problems', [])) if profile.get('problems') else 'N/A'}
✅ POMÁHA: {', '.join(profile.get('helps', [])) if profile.get('helps') else 'N/A'}
"""
        
        entries_summary = ""
        if entries:
            if entries.get('food'):
                total = sum(f.get('calories', 0) for f in entries['food'][:5])
                entries_summary += f"\n🍽️ POSLEDNÉ JEDLO: {len(entries['food'][:5])} záznamov, ~{total} kcal\n"
            if entries.get('exercise'):
                total = sum(e.get('duration', 0) for e in entries['exercise'][:5])
                entries_summary += f"💪 POSLEDNÉ CVIČENIE: {len(entries['exercise'][:5])} záznamov, {total} minút\n"
            if entries.get('mood'):
                latest = entries['mood'][0] if entries['mood'] else None
                if latest:
                    entries_summary += f"😊 POSLEDNÁ NÁLADA: {latest.get('score', 'N/A')}/5\n"
        
        return f"""Si FitMind AI fitness coach a mentálne zdravie asistent.

{profile_info if profile_info else "👤 Používateľ: Nový používateľ"}

{entries_summary if entries_summary else "📊 Zatiaľ žiadne záznamy"}

POKYNY:
1. Buď empatický, podporný a motivujúci
2. Odkazuj na históriu a dáta používateľa
3. Navrhni KONKRÉTNE akcie
4. Keď používateľ spomína jedlo, cvičenie, stres, náladu, spánok alebo váhu - POUŽI PRÍSLUŠNÚ FUNKCIU
5. Používaj emoji 🌳😴⚡🔥💪🍎
6. Krátke, jasné odpovede (3-5 viet)
7. Skonči otázkou alebo výzvou

DÔLEŽITÉ: Ak používateľ spomína konkrétne dáta, VŽDY použij funkciu na uloženie!"""
    
    def chat(self, message: str, system_prompt: str) -> Dict[str, Any]:
        """Pošle správu do OpenAI"""
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            functions=self.functions,
            function_call="auto",
            max_tokens=500,
            temperature=0.7
        )
        return response.choices[0].message
    
    def get_final_response(self, messages: List[Dict]) -> str:
        """Získa finálnu odpoveď po function call"""
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            functions=self.functions,
            function_call="auto",
            max_tokens=400,
            temperature=0.7
        )
        return response.choices[0].message.content or ""



