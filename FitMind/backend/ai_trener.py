import json
import os
import traceback
from datetime import datetime, timedelta
from typing import Dict, List
from zoneinfo import ZoneInfo

from google import genai
from google.genai import types


class UdajeOFunkcii:
    """Reprezentuje jednu function call z AI odpovede."""
    def __init__(self, nazov_funkcie, parametre):
        self.name = nazov_funkcie
        self.arguments = json.dumps(parametre)


class OdpovedRobota:
    """Výstup z AI chatu – text + zoznam function calls."""
    def __init__(self, text, funkcie=None):
        self.content = text
        self.function_calls = funkcie or []


class AIService:
    """Komunikácia s Google Gemini AI – chat, function calling, fallback modely."""

    def __init__(self):
        kluc = os.getenv("GOOGLE_API_KEY")
        if not kluc:
            render_path = "/etc/secrets/GOOGLE_API_KEY"
            if os.path.exists(render_path):
                try:
                    kluc = open(render_path).read().strip()
                except Exception:
                    pass

        self.klient = None
        if kluc:
            try:
                self.klient = genai.Client(api_key=kluc)
                print("[AI] Google Gemini klient inicializovaný.")
            except Exception as e:
                print(f"[AI] Chyba inicializácie: {e}")
        else:
            print("[AI] POZOR: Chýba GOOGLE_API_KEY.")

    def is_configured(self) -> bool:
        return self.klient is not None

    def _daj_zoznam_nastrojov(self):
        """Vráti funkcie, ktoré môže AI volať na ukladanie dát."""

        nastroj_jedlo = types.FunctionDeclaration(
            name="save_food_entry",
            description="Uloží jedlo alebo nápoj. Pre viacero položiek volaj viackrát.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "name":     {"type": "STRING"},
                    "calories": {"type": "NUMBER"},
                    "protein":  {"type": "NUMBER"},
                    "carbs":    {"type": "NUMBER"},
                    "fats":     {"type": "NUMBER"},
                    "mealType": {"type": "STRING", "enum": ["breakfast", "lunch", "dinner", "snack"]},
                    "category": {"type": "STRING", "enum": ["food", "drink"]},
                    "date":     {"type": "STRING", "description": "ISO 8601 – vyplň len ak nejde o teraz"}
                },
                "required": ["name", "calories", "category"]
            }
        )

        nastroj_cvicenie = types.FunctionDeclaration(
            name="save_exercise_entry",
            description="Uloží tréning alebo pohybovú aktivitu.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "type":           {"type": "STRING"},
                    "duration":       {"type": "NUMBER", "description": "Minúty"},
                    "intensity":      {"type": "STRING", "enum": ["low", "medium", "high"]},
                    "caloriesBurned": {"type": "NUMBER"},
                    "date":           {"type": "STRING"}
                },
                "required": ["type", "duration"]
            }
        )

        nastroj_nalada = types.FunctionDeclaration(
            name="save_mood_entry",
            description="Uloží náladu na stupnici 1–10.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "score": {"type": "NUMBER"},
                    "date":  {"type": "STRING"}
                },
                "required": ["score"]
            }
        )

        nastroj_vaha = types.FunctionDeclaration(
            name="save_weight_entry",
            description="Uloží váhu v kilogramoch.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "weight": {"type": "NUMBER"},
                    "date":   {"type": "STRING"}
                },
                "required": ["weight"]
            }
        )

        nastroj_spanok = types.FunctionDeclaration(
            name="save_sleep_entry",
            description="Uloží spánok – počet hodín a kvalitu.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "hours":   {"type": "NUMBER"},
                    "quality": {"type": "STRING", "enum": ["poor", "fair", "good", "excellent"]},
                    "date":    {"type": "STRING"}
                },
                "required": ["hours", "quality"]
            }
        )

        nastroj_stres = types.FunctionDeclaration(
            name="save_stress_entry",
            description="Uloží úroveň stresu na stupnici 1–10.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "level":  {"type": "NUMBER"},
                    "source": {"type": "STRING"},
                    "date":   {"type": "STRING"}
                },
                "required": ["level"]
            }
        )

        return [nastroj_jedlo, nastroj_cvicenie, nastroj_nalada,
                nastroj_vaha, nastroj_spanok, nastroj_stres]

    def create_system_prompt(self, profil_uzivatela: dict, historia_zaznamov: dict) -> str:
        """Vytvorí personalizovaný systémový prompt s profilom a záznamami klienta."""

        tz_sk = ZoneInfo('Europe/Bratislava')
        now          = datetime.now(tz_sk)
        aktualny_cas = now.strftime("%Y-%m-%dT%H:%M:%S")
        dnes         = now.strftime("%Y-%m-%d")
        vcera        = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        predvcerom   = (now - timedelta(days=2)).strftime("%Y-%m-%d")
        zajtra       = (now + timedelta(days=1)).strftime("%Y-%m-%d")

        meno         = profil_uzivatela.get('firstName', 'Klient')
        vek          = profil_uzivatela.get('age', 0)
        pohlavie     = profil_uzivatela.get('gender', 'male')
        vyska        = profil_uzivatela.get('height', 0)
        vaha         = profil_uzivatela.get('currentWeight', 0)
        cielova_vaha = profil_uzivatela.get('targetWeight', 0)
        ciel         = profil_uzivatela.get('fitnessGoal', 'maintain')
        aktivita     = profil_uzivatela.get('activityLevel', 'moderate')
        target_cal   = profil_uzivatela.get('targetCalories', 0)
        zdravotne    = profil_uzivatela.get('medicalConditions', [])
        dieta        = profil_uzivatela.get('dietaryRestrictions', [])

        bmi = round(vaha / ((vyska / 100) ** 2), 1) if vyska > 0 and vaha > 0 else 0

        if not target_cal and vaha > 0 and vyska > 0 and vek > 0:
            bmr = (10 * vaha + 6.25 * vyska - 5 * vek + (-161 if pohlavie == 'female' else 5))
            activity_mult = {'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725, 'very_active': 1.9}
            goal_adj = {'lose_weight': -500, 'gain_muscle': 300, 'maintain': 0, 'improve_health': 0}
            target_cal = int(bmr * activity_mult.get(aktivita, 1.55) + goal_adj.get(ciel, 0))

        ciel_sk = {'lose_weight': 'schudnúť', 'gain_muscle': 'nabrať svaly',
                   'maintain': 'udržať váhu', 'improve_health': 'zlepšiť zdravie'}.get(ciel, ciel)
        aktivita_sk = {'sedentary': 'sedavý', 'light': 'mierne aktívny', 'moderate': 'stredne aktívny',
                       'active': 'aktívny', 'very_active': 'veľmi aktívny'}.get(aktivita, aktivita)

        entries_section = "\nZÁZNAMY ZA POSLEDNÉ 3 DNI:\n"
        today_calories = today_protein = today_carbs = today_fats = 0.0

        if historia_zaznamov:
            food_entries = historia_zaznamov.get('food', [])
            if food_entries:
                entries_section += "JEDLO:\n"
                for e in food_entries[-15:]:
                    cal      = float(e.get('calories', 0) or 0)
                    ts       = e.get('timestamp', e.get('date', ''))
                    date_str = str(ts)[:10] if ts else ''
                    entries_section += f"  - {e.get('name','?')}: {cal:.0f} kcal ({e.get('mealType','')}) [{date_str}]\n"
                    if date_str == dnes:
                        today_calories += cal
                        today_protein  += float(e.get('protein', 0) or 0)
                        today_carbs    += float(e.get('carbs', 0) or 0)
                        today_fats     += float(e.get('fats', 0) or 0)

            exercise_entries = historia_zaznamov.get('exercise', [])
            if exercise_entries:
                entries_section += "CVIČENIE:\n"
                for e in exercise_entries[-10:]:
                    ts       = e.get('timestamp', e.get('date', ''))
                    date_str = str(ts)[:10] if ts else ''
                    entries_section += f"  - {e.get('type','?')}: {e.get('duration',0)} min [{date_str}]\n"

            weight_entries = historia_zaznamov.get('weight', [])
            if weight_entries:
                entries_section += "VÁHA:\n"
                for e in weight_entries[-5:]:
                    ts       = e.get('timestamp', e.get('date', ''))
                    date_str = str(ts)[:10] if ts else ''
                    entries_section += f"  - {e.get('weight','?')} kg [{date_str}]\n"

            for cat, label in [('mood', 'NÁLADA'), ('sleep', 'SPÁNOK'), ('stress', 'STRES')]:
                cat_entries = historia_zaznamov.get(cat, [])
                if cat_entries:
                    entries_section += f"{label}:\n"
                    for e in cat_entries[-3:]:
                        ts       = e.get('timestamp', e.get('date', ''))
                        date_str = str(ts)[:10] if ts else ''
                        if cat == 'mood':
                            entries_section += f"  - {e.get('score','?')}/10 [{date_str}]\n"
                        elif cat == 'sleep':
                            entries_section += f"  - {e.get('hours','?')}h, {e.get('quality','?')} [{date_str}]\n"
                        elif cat == 'stress':
                            entries_section += f"  - {e.get('level','?')}/10 [{date_str}]\n"

        remaining_cal = max(0, target_cal - today_calories) if target_cal else 0

        return f"""Si FitMind AI – osobný tréner a nutričný poradca pre klienta {meno}. Vždy hovor slovensky.

PROFIL:
- {meno} | {vek} r. | {'žena' if pohlavie == 'female' else 'muž'} | {vyska} cm | {vaha} kg → cieľ {cielova_vaha} kg | BMI {bmi}
- Cieľ: {ciel_sk} | Aktivita: {aktivita_sk} | Denný cieľ: {target_cal} kcal
- Zdravotné obmedzenia: {', '.join(zdravotne) if zdravotne else 'žiadne'}
- Diétne obmedzenia: {', '.join(dieta) if dieta else 'žiadne'}

DNES ({dnes}):
- Zjedené: {int(today_calories)} kcal | Zostáva: {int(remaining_cal)} kcal
- B {int(today_protein)}g | S {int(today_carbs)}g | T {int(today_fats)}g
{entries_section}
ČAS (Slovensko): {aktualny_cas} | dnes={dnes} | včera={vcera} | predvčerom={predvcerom} | zajtra={zajtra}

PRAVIDLÁ:
1. Jazyk: vždy slovensky, oslovuj menom {meno}.
2. Ukladanie: ak klient zmieňuje jedlo/cvičenie/váhu/náladu/spánok/stres → MUSÍŠ zavolať funkciu. Text "Uložil som" dáta neuloží.
3. Dátumy: "dnes ráno/obed/večera" = {dnes} 08:00/12:00/19:00. "včera" = {vcera}. Bez dátumu = nechaj prázdne.
4. Kalórie: odhadni sám, nikdy sa nepýtaj klienta koľko kalórií jedlo malo.
5. Po uložení: píš len krátku reakciu, nezopakuj zoznam – systém ho zobrazí automaticky.
6. Nikdy nepíš "nemám prístup k údajom" – profil a záznamy máš vyššie.
"""

    def _generate_confirmation_text(self, funkcie: list) -> str:
        """Vygeneruje potvrdzovací text z function calls bez ďalšieho API volania."""
        items = []
        for fc in funkcie:
            args = json.loads(fc.arguments) if isinstance(fc.arguments, str) else fc.arguments
            if fc.name == 'save_food_entry':
                emoji = '🍹' if args.get('category') == 'drink' else '🍽️'
                items.append(f"{emoji} {args.get('name', 'jedlo')} – {int(args.get('calories', 0))} kcal")
            elif fc.name == 'save_exercise_entry':
                burned = args.get('caloriesBurned', 0)
                items.append(f"🏃 {args.get('type', 'cvičenie')} – {int(args.get('duration', 0))} min" +
                             (f", ~{int(burned)} kcal" if burned else ""))
            elif fc.name == 'save_mood_entry':
                items.append(f"😊 Nálada: {args.get('score', '?')}/10")
            elif fc.name == 'save_weight_entry':
                items.append(f"⚖️ Váha: {args.get('weight', '?')} kg")
            elif fc.name == 'save_sleep_entry':
                items.append(f"😴 Spánok: {args.get('hours', '?')} h ({args.get('quality', '?')})")
            elif fc.name == 'save_stress_entry':
                items.append(f"😰 Stres: {args.get('level', '?')}/10")

        if items:
            return "✅ Zapísal som ti:\n" + "\n".join(f"  • {i}" for i in items) + "\n\n💪 Pokračuj tak ďalej!"
        return "✅ Údaje boli zapísané."

    def chat(self, sprava_uzivatela: str, instrukcie: str, historia_chatu: List[Dict] = None) -> OdpovedRobota:
        """
        Pošle správu do Gemini a vráti odpoveď s function calls.
        Pri rate limite automaticky skúša záložné modely.
        """
        if not self.klient:
            return OdpovedRobota("Prepáč, AI tréner momentálne nie je dostupný.")

        primary_model  = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
        fallback_models = ['gemini-2.0-flash-lite', 'gemini-1.5-flash']
        models_to_try  = [primary_model] + [m for m in fallback_models if m != primary_model]

        last_error = None

        for model_name in models_to_try:
            for attempt in range(2):
                try:
                    historia_pre_google = []
                    if historia_chatu:
                        for zaznam in historia_chatu:
                            historia_pre_google.append({
                                "role":  "user" if zaznam['role'] == "user" else "model",
                                "parts": [{"text": zaznam.get('content') or "..."}]
                            })

                    konfiguracia = types.GenerateContentConfig(
                        system_instruction=instrukcie,
                        tools=[types.Tool(function_declarations=self._daj_zoznam_nastrojov())]
                    )

                    chat_relacia = self.klient.chats.create(
                        model=model_name,
                        history=historia_pre_google,
                        config=konfiguracia
                    )
                    odpoved = chat_relacia.send_message(sprava_uzivatela)
                    print(f"[AI] Odpoveď od: {model_name}")

                    text_odpovede = ""
                    zoznam_funkcii = []

                    for cast in odpoved.candidates[0].content.parts:
                        if hasattr(cast, 'text') and cast.text:
                            text_odpovede += cast.text
                        elif hasattr(cast, 'function_call') and cast.function_call:
                            fc = cast.function_call
                            parametre = dict(fc.args) if hasattr(fc.args, 'items') else (
                                fc.args if isinstance(fc.args, dict) else json.loads(str(fc.args))
                            )
                            zoznam_funkcii.append(UdajeOFunkcii(fc.name, parametre))

                    return OdpovedRobota(text_odpovede, zoznam_funkcii)

                except Exception as e:
                    last_error = e
                    chyba_text = str(e).lower()
                    if any(k in chyba_text for k in ["429", "resource_exhausted", "quota"]):
                        print(f"[AI] Rate limit na {model_name}, skúšam ďalší...")
                        break
                    if attempt == 0:
                        import time
                        time.sleep(2)
                    else:
                        print(f"[AI] Chyba na {model_name}: {e}")
                        traceback.print_exc()

        print(f"[AI] Všetky modely zlyhali: {last_error}")
        return OdpovedRobota("Prepáč, AI tréner je momentálne preťažený. Skús to znovu o chvíľu.")
