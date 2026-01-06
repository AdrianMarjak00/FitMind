# AI Service - Komunikácia s OpenAI API
# Tento súbor obsahuje funkcie na prácu s OpenAI GPT modelom

import json
from typing import Dict, List, Any, Optional
from openai import OpenAI
from datetime import datetime, timedelta
import os

class AIService:
    """
    Service pre komunikáciu s OpenAI API
    Obsahuje funkcie na vytváranie promptov a volanie AI modelu
    + Pokročilé personalizované trénerské funkcie
    """
    
    def __init__(self):
        """Inicializuje OpenAI klienta s API kľúčom z environment premenných"""
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.functions = self._get_function_definitions()
        self.conversation_cache = {}  # Cache pre konverzačné histórie
    
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
    
    def analyze_user_progress(self, profile: Dict, entries: Dict) -> Dict[str, Any]:
        """
        Analyzuje pokrok používateľa a identifikuje trendy
        
        Args:
            profile: Profil používateľa
            entries: Záznamy používateľa za posledných 7-30 dní
            
        Returns:
            Slovník s analýzou pokroku, trendov a odporúčaní
        """
        analysis = {
            "calories_trend": "stable",
            "exercise_trend": "stable",
            "mood_trend": "stable",
            "achievements": [],
            "concerns": [],
            "recommendations": []
        }
        
        # Analyzuj kalórie
        if entries.get('food'):
            foods = entries['food'][:14]  # Posledných 14 dní
            if len(foods) >= 3:
                recent_cals = sum(f.get('calories', 0) for f in foods[:3]) / 3
                older_cals = sum(f.get('calories', 0) for f in foods[3:6]) / max(len(foods[3:6]), 1)
                
                if recent_cals > older_cals * 1.2:
                    analysis['calories_trend'] = "increasing"
                    analysis['concerns'].append("Zvýšený kalorický príjem")
                elif recent_cals < older_cals * 0.8:
                    analysis['calories_trend'] = "decreasing"
                    if profile.get('goals') and 'chudnutie' in str(profile.get('goals')).lower():
                        analysis['achievements'].append("Znížený kalorický príjem")
        
        # Analyzuj cvičenie
        if entries.get('exercise'):
            exercises = entries['exercise'][:14]
            if len(exercises) >= 7:
                analysis['achievements'].append("Pravidelné cvičenie")
                recent_mins = sum(e.get('duration', 0) for e in exercises[:3])
                if recent_mins > 120:
                    analysis['achievements'].append("Vysoká aktivita")
            elif len(exercises) < 3:
                analysis['concerns'].append("Nízka fyzická aktivita")
                analysis['recommendations'].append("Zaraď aspoň 30 min. cvičenia denne")
        
        # Analyzuj náladu
        if entries.get('mood'):
            moods = entries['mood'][:7]
            if moods:
                avg_mood = sum(m.get('score', 3) for m in moods) / len(moods)
                if avg_mood >= 4:
                    analysis['mood_trend'] = "improving"
                    analysis['achievements'].append("Dobrá nálada")
                elif avg_mood < 2.5:
                    analysis['mood_trend'] = "declining"
                    analysis['concerns'].append("Znížená nálada")
                    analysis['recommendations'].append("Zvážiť relaxačné techniky alebo konzultáciu")
        
        return analysis
    
    def create_system_prompt(self, profile: Dict, entries: Dict, conversation_history: Optional[List[Dict]] = None) -> str:
        """
        Vytvorí systémový prompt pre AI s informáciami o používateľovi
        
        Args:
            profile: Profil používateľa (meno, vek, ciele, atď.)
            entries: Záznamy používateľa (jedlo, cvičenie, nálada, atď.)
            conversation_history: História konverzácie (voliteľné)
        """
        # Analyzuj pokrok používateľa
        analysis = self.analyze_user_progress(profile, entries)
        
        # Vytvor informácie o profile
        profile_info = ""
        if profile:
            name = profile.get('name', 'priateľ')
            age = profile.get('age', 'N/A')
            height = profile.get('height', 'N/A')
            goals = ', '.join(profile.get('goals', [])) if profile.get('goals') else 'N/A'
            problems = ', '.join(profile.get('problems', [])) if profile.get('problems') else 'N/A'
            helps = ', '.join(profile.get('helps', [])) if profile.get('helps') else 'N/A'
            target_weight = profile.get('targetWeight', 'N/A')
            target_calories = profile.get('targetCalories', 'N/A')
            
            profile_info = f"""
👤 PROFIL KLIENTA:
Meno: {name}
Vek: {age} rokov
Výška: {height} cm
Cieľová váha: {target_weight} kg
Denný kalorický cieľ: {target_calories} kcal
🎯 Ciele: {goals}
⚠️ Problémy/Výzvy: {problems}
✅ Čo pomáha: {helps}
"""
        
        # Vytvor detailný súhrn záznamov s analýzou
        entries_summary = "\n📊 AKTUÁLNY STAV (posledných 7 dní):\n"
        if entries:
            # Jedlo
            if entries.get('food'):
                foods = entries['food'][:7]
                total_cals = sum(f.get('calories', 0) for f in foods)
                avg_cals = total_cals / len(foods) if foods else 0
                entries_summary += f"🍽️ Jedlo: {len(foods)} záznamov | Priemer: {int(avg_cals)} kcal/deň | Trend: {analysis['calories_trend']}\n"
            
            # Cvičenie
            if entries.get('exercise'):
                exercises = entries['exercise'][:7]
                total_mins = sum(e.get('duration', 0) for e in exercises)
                entries_summary += f"💪 Cvičenie: {len(exercises)}x | Spolu: {total_mins} minút | Trend: {analysis['exercise_trend']}\n"
            else:
                entries_summary += "💪 Cvičenie: Žiadne záznamy\n"
            
            # Spánok
            if entries.get('sleep'):
                sleeps = entries['sleep'][:7]
                avg_sleep = sum(s.get('hours', 0) for s in sleeps) / len(sleeps) if sleeps else 0
                entries_summary += f"😴 Spánok: Priemer {avg_sleep:.1f}h/noc\n"
            
            # Nálada
            if entries.get('mood'):
                moods = entries['mood'][:7]
                avg_mood = sum(m.get('score', 0) for m in moods) / len(moods) if moods else 0
                entries_summary += f"😊 Nálada: Priemer {avg_mood:.1f}/5 | Trend: {analysis['mood_trend']}\n"
            
            # Stres
            if entries.get('stress'):
                stresses = entries['stress'][:7]
                avg_stress = sum(s.get('level', 0) for s in stresses) / len(stresses) if stresses else 0
                entries_summary += f"😰 Stres: Priemer {avg_stress:.1f}/10\n"
        
        # Úspechy a obavy
        achievements_text = ""
        if analysis['achievements']:
            achievements_text = "\n🏆 ÚSPECHY:\n" + "\n".join(f"✅ {a}" for a in analysis['achievements']) + "\n"
        
        concerns_text = ""
        if analysis['concerns']:
            concerns_text = "\n⚠️ OBLASTI NA ZLEPŠENIE:\n" + "\n".join(f"❗ {c}" for c in analysis['concerns']) + "\n"
        
        # Kontext z predchádzajúcich konverzácií
        context_text = ""
        if conversation_history and len(conversation_history) > 0:
            context_text = "\n💬 KONTEXT KONVERZÁCIE:\n"
            context_text += "Pamätaj si predchádzajúce témy a odkazuj na ne.\n"
        
        # Vytvor finálny prompt
        return f"""Si FitMind AI - osobný fitness tréner, nutričný poradca a mentálny wellness kouč.

{profile_info if profile_info else "👤 Používateľ: Nový klient (požiadaj o základné info)"}

{entries_summary}

{achievements_text}

{concerns_text}

{context_text}

🎯 TVOJA ÚLOHA:
1. **Personalizovaný prístup**: Oslovuj používateľa menom, pamätaj si jeho ciele a preferencie
2. **Proaktívne sledovanie**: Analyzuj trendy, upozorňuj na zmeny, gratuluj k úspechom
3. **Konkrétne rady**: Navrhni špecifické cviky, recepty, rutiny - nie všeobecnosti
4. **Empatia a motivácia**: Buď podporný, ale aj férový a realistický
5. **Automatické zaznamenávanie**: Keď klient spomína jedlo/cvičenie/náladu - VŽDY použi funkciu na uloženie
6. **Kontextové odpovede**: Zohľadňuj celkovú históriu a pokrok klienta
7. **Jasná komunikácia**: Krátke, praktické odpovede (3-5 viet) s emoji 🔥💪🍎⚡😊

📝 PRAVIDLÁ ZAZNAMENÁVANIA:

🍽️ **JEDLO - AUTOMATICKY ULOŽ HNEĎ:**
- Keď klient spomenie jedlo (napr. "mal som perkelt"), HNEĎ:
  1. Odhadni typickú porciu (stredná)
  2. Odhadni nutričné hodnoty pomocou tvojej knowledge base
  3. OKAMŽITE zavolaj save_food_entry s odhadnutými hodnotami
  4. Potvrď: "Uložil som [jedlo] (~X kcal, Y g proteínu). Super voľba!"
  
- **NEPÝTAJ SA** na žiadne detaily (koľko, s čím, veľkosť)
- **PREDPOKLADAJ** typickú/strednú porciu
- Príklady odhadov:
  - Perkelt = ~500 kcal, 35g proteínu, 25g sacharidov, 28g tukov (mäso s omáčkou)
  - Praženica = ~300 kcal, 18g proteínu, 5g sacharidov, 22g tukov (2-3 vajcia)
  - Kuracie prsia s ryžou = ~500 kcal, 45g proteínu, 50g sacharidov, 10g tukov
  - Pizza = ~800 kcal, 30g proteínu, 90g sacharidov, 35g tukov (2-3 kusy)
  - Jogurt = ~150 kcal, 8g proteínu, 20g sacharidov, 3g tukov

💪 **CVIČENIE - AUTOMATICKY:**
- Keď klient spomenie cvičenie, HNEĎ ulož s odhadnutým trvaním a intenzitou
- Predpokladaj: stredná intenzita, 30-60 min (podľa typu)
- save_exercise_entry s odhadmi

😊 **OSTATNÉ:**
- Nálada = save_mood_entry (odhadni skóre z textu)
- Stres = save_stress_entry (odhadni úroveň z textu)
- Spánok = save_sleep_entry (ak spomenie hodiny)
- Váha = save_weight_entry (ak spomenie číslo v kg)

💡 STRATÉGIA:
1. **ŽIADNE OTÁZKY** - ty si expert, odhadni všetko!
2. **HNEĎ ULOŽ** - zavolaj funkciu okamžite
3. **POTVRĎ KRÁTKO** - "Uložil som [jedlo] (~X kcal). Skvelé!"
4. **MOTIVUJ** - pochváľ alebo daj tip na ďalší deň

🧠 DÔLEŽITÉ:
- **ŽIADNE OTÁZKY** - ty si expert, hneď odhadni všetko!
- **HNEĎ ULOŽ** - okamžite zavolaj save_food_entry
- Používaj približné hodnoty: "~300 kcal", "~20g proteínu"
- Predpokladaj typickú/strednú porciu
- Buď rýchly, efektívny tréner!

📚 PRÍKLADY SPRÁVNEJ KONVERZÁCIE:

❌ ZLE (NEPÝTAŤ SA!):
Klient: "Mal som na raňajky praženicu"
AI: "Koľko malo kalórií?" ← ❌ NEPÝTAJ SA!
AI: "S čím si to mal?" ← ❌ NEPÝTAJ SA!

✅ PERFEKTNÉ (HNEĎ ULOŽ):
Klient: "Mal som na raňajky praženicu"
AI: "Super raňajky! 🍳 Uložil som: Praženica (~300 kcal, 18g proteínu, 22g tukov).
     Skvelý proteínový start do dňa! Dnes máš cieľ 2000 kcal, už máš 300."

✅ PERFEKTNÉ:
Klient: "Zjedol som kuracie prsia s ryžou"
AI: "Výborný zdravý obed! 💪 Uložil som: Kuracie prsia s ryžou 
     (~500 kcal, 45g proteínu, 50g sacharidov, 10g tukov).
     Perfektný pomer makier pre svalovú hmotu! 🔥"

✅ PERFEKTNÉ:
Klient: "Ma obed som mal perkelt"
AI: "Chutné! 🍖 Uložil som: Perkelt (~500 kcal, 35g proteínu, 25g sacharidov, 28g tukov).
     Dobrý zdroj proteínu! Už máš dnes X kcal z 2000."

✅ PERFEKTNÉ:
Klient: "Mal som jogurt"
AI: "Zdravá desiata! 🥣 Uložil som: Jogurt (~150 kcal, 8g proteínu, 20g sacharidov).
     Dobré na doplnenie energie!"

✅ PERFEKTNÉ - Cvičenie:
Klient: "Cvičil som dnes"
AI: "Super! 💪 Aký typ cvičenia to bol? (Beh, posilňovanie, joga...)"
← Tu môžeš spýtať na TYP, ale potom hneď ulož s odhadom!

Buď najrýchlejším a najefektívnejším trénerom! 🚀"""
    
    def chat(self, message: str, system_prompt: str, conversation_history: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Pošle správu do OpenAI a vráti odpoveď s kontextom konverzácie
        
        Args:
            message: Správa od používateľa
            system_prompt: Systémový prompt s informáciami o používateľovi
            conversation_history: História konverzácie (zoznam správ)
        """
        # Vytvor správy s históriou
        messages = [{"role": "system", "content": system_prompt}]
        
        # Pridaj históriu (max. posledných 10 správ)
        if conversation_history:
            recent_history = conversation_history[-10:]  # Len posledných 10 správ
            messages.extend(recent_history)
        
        # Pridaj aktuálnu správu
        messages.append({"role": "user", "content": message})
        
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",  # Používame GPT-4o-mini model (rýchly a lacný)
            messages=messages,
            functions=self.functions,  # Povol AI volať funkcie
            function_call="auto",  # AI rozhodne sám, kedy volať funkciu
            max_tokens=600,  # Zvýšená dĺžka pre podrobnejšie odpovede
            temperature=0.8  # Mierne kreatívnejšie odpovede
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
