# AI Service - Komunikácia s OpenAI API
# Tento súbor obsahuje funkcie na prácu s OpenAI GPT modelom

import json
from typing import Dict, List, Any
from openai import OpenAI
import os

class AIService:
    """
    Service pre komunikáciu s OpenAI API
    Obsahuje funkcie na vytváranie promptov a volanie AI modelu
    """
    
    def __init__(self):
        """Inicializuje OpenAI klienta s API kľúčom z environment premenných"""
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.functions = self._get_function_definitions()
    
    def _get_function_definitions(self) -> List[Dict]:
        """
        Vráti definície funkcií pre OpenAI
        Tieto funkcie môže AI volať automaticky keď používateľ spomína jedlo, cvičenie, atď.
        """
        return [
            {
                "name": "save_food_entry",
                "description": "Uloží záznam o jedle",
                "parameters": {
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
            },
            {
                "name": "save_exercise_entry",
                "description": "Uloží záznam o cvičení",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "description": "Typ cvičenia (napr. beh, posilňovanie)"},
                        "duration": {"type": "number", "description": "Trvanie v minútach"},
                        "intensity": {"type": "string", "enum": ["low", "medium", "high"]},
                        "caloriesBurned": {"type": "number", "description": "Spálené kalórie"},
                        "notes": {"type": "string", "description": "Poznámky"}
                    },
                    "required": ["type", "duration"]
                }
            },
            {
                "name": "save_stress_entry",
                "description": "Uloží záznam o úrovni stresu",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "level": {"type": "number", "description": "Úroveň stresu 1-10"},
                        "source": {"type": "string", "description": "Zdroj stresu"},
                        "notes": {"type": "string", "description": "Poznámky"}
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
                        "score": {"type": "number", "description": "Skóre nálady 1-5"},
                        "note": {"type": "string", "description": "Poznámka"}
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
                        "hours": {"type": "number", "description": "Počet hodín spánku"},
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
                        "weight": {"type": "number", "description": "Váha v kg"}
                    },
                    "required": ["weight"]
                }
            },
            {
                "name": "update_profile",
                "description": "Aktualizuje profil používateľa",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "goals": {"type": "array", "items": {"type": "string"}, "description": "Ciele používateľa"},
                        "problems": {"type": "array", "items": {"type": "string"}, "description": "Problémy používateľa"},
                        "helps": {"type": "array", "items": {"type": "string"}, "description": "Čo používateľovi pomáha"}
                    }
                }
            }
        ]
    
    def create_system_prompt(self, profile: Dict, entries: Dict) -> str:
        """
        Vytvorí systémový prompt pre AI s informáciami o používateľovi
        
        Args:
            profile: Profil používateľa (meno, vek, ciele, atď.)
            entries: Záznamy používateľa (jedlo, cvičenie, nálada, atď.)
        """
        # Vytvor informácie o profile
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
        
        # Vytvor súhrn záznamov
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
        
        # Vytvor finálny prompt
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
        """
        Pošle správu do OpenAI a vráti odpoveď
        
        Args:
            message: Správa od používateľa
            system_prompt: Systémový prompt s informáciami o používateľovi
        """
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",  # Používame GPT-4o-mini model (rýchly a lacný)
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            functions=self.functions,  # Povol AI volať funkcie
            function_call="auto",  # AI rozhodne sám, kedy volať funkciu
            max_tokens=500,  # Maximálna dĺžka odpovede
            temperature=0.7  # Kreativita (0-1, vyššie = kreatívnejšie)
        )
        return response.choices[0].message
    
    def get_final_response(self, messages: List[Dict]) -> str:
        """
        Získa finálnu odpoveď od AI po volaní funkcie
        
        Args:
            messages: Zoznam správ (system, user, assistant, function)
        """
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            functions=self.functions,
            function_call="auto",
            max_tokens=400,
            temperature=0.7
        )
        return response.choices[0].message.content or ""
