import json
import os
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Google AI knižnice
from google import genai
from google.genai import types

# === POMOCNÉ TRIEDY (Aby main.py rozumel odpovedi) ===

class UdajeOFunkcii:
    """Túto triedu použijeme, ak chce AI zavolať nejakú funkciu (napr. uložiť jedlo)"""
    def __init__(self, nazov_funkcie, parametre):
        self.name = nazov_funkcie
        self.arguments = json.dumps(parametre)

class OdpovedRobota:
    """Toto je balíček, ktorý vrátime naspäť do main.py"""
    def __init__(self, text, funkcie=None):
        self.content = text
        self.function_calls = funkcie or []

# === HLAVNÁ TRIEDA ===

class AIService:
    def __init__(self):
        kluc = os.getenv("GOOGLE_API_KEY")
        
        if not kluc and os.path.exists("/etc/secrets/GOOGLE_API_KEY"):
            try:
                kluc = open("/etc/secrets/GOOGLE_API_KEY", "r").read().strip()
                print("Kľúč načítaný zo súboru.")
            except:
                pass

        self.klient = None
        if kluc:
            try:
                self.klient = genai.Client(api_key=kluc)
                print(f"[AI] Client initialized OK")
            except Exception as chyba:
                print(f"❌ Chyba pripojenia: {chyba}")
        else:
            print("⚠️ POZOR: Nemám API kľúč. AI nebude odpovedať.")

    def _daj_zoznam_nastrojov(self):
        nastroj_jedlo = types.FunctionDeclaration(
            name="save_food_entry",
            description="Uloží jedlo a jeho nutričné hodnoty / kalórie. Podporuje uloženie viacerých jedál naraz (zavolaj viackrát).",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING", "description": "Názov jedla"},
                    "calories": {"type": "NUMBER", "description": "Kalórie v kcal"},
                    "protein": {"type": "NUMBER", "description": "Bielkoviny (g)"},
                    "carbs": {"type": "NUMBER", "description": "Sacharidy (g)"},
                    "fats": {"type": "NUMBER", "description": "Tuky (g)"},
                    "mealType": {"type": "STRING", "enum": ["breakfast", "lunch", "dinner", "snack"]},
                    "category": {"type": "STRING", "enum": ["food", "drink"], "description": "Či ide o jedlo alebo nápoj"},
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas záznamu. POVINNÉ ak klient hovorí o inom čase než teraz. Formát: YYYY-MM-DDTHH:MM:SS. Ak neuviedol čas, nechaj prázdne."}
                },
                "required": ["name", "calories", "category"]
            }
        )

        nastroj_cvicenie = types.FunctionDeclaration(
            name="save_exercise_entry",
            description="Uloží cvičenie a trvanie.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "type": {"type": "STRING", "description": "Typ cvičenia"},
                    "duration": {"type": "NUMBER", "description": "Minúty"},
                    "intensity": {"type": "STRING", "enum": ["low", "medium", "high"]},
                    "caloriesBurned": {"type": "NUMBER", "description": "Odhad spálených kalórií"},
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas záznamu."}
                },
                "required": ["type", "duration"]
            }
        )

        nastroj_nalada = types.FunctionDeclaration(
            name="save_mood_entry",
            description="Uloží náladu (číslo 1-10).",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "score": {"type": "NUMBER"},
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas"}
                },
                "required": ["score"]
            }
        )

        nastroj_vaha = types.FunctionDeclaration(
            name="save_weight_entry",
            description="Uloží váhu (kg).",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "weight": {"type": "NUMBER"},
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas"}
                },
                "required": ["weight"]
            }
        )

        nastroj_spanok = types.FunctionDeclaration(
            name="save_sleep_entry",
            description="Uloží dĺžku a kvalitu spánku.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "hours": {"type": "NUMBER", "description": "Počet hodín spánku"},
                    "quality": {"type": "STRING", "enum": ["poor", "fair", "good", "excellent"]},
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas"}
                },
                "required": ["hours", "quality"]
            }
        )

        nastroj_stres = types.FunctionDeclaration(
            name="save_stress_entry",
            description="Uloží úroveň stresu.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "level": {"type": "NUMBER", "description": "Úroveň stresu 1-10"},
                    "source": {"type": "STRING", "description": "Zdroj alebo spúšťač stresu"},
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas"}
                },
                "required": ["level"]
            }
        )

        return [nastroj_jedlo, nastroj_cvicenie, nastroj_nalada, nastroj_vaha, nastroj_spanok, nastroj_stres]

    def create_system_prompt(self, profil_uzivatela, historia_zaznamov):
        def prevod_datumu(objekt):
            if isinstance(objekt, datetime):
                return objekt.isoformat()
            return str(objekt)

        from datetime import timezone
        now = datetime.now(timezone.utc)
        aktualny_cas = now.strftime("%Y-%m-%dT%H:%M:%S%z")
        dnes = now.strftime("%Y-%m-%d")
        vcera = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        predvcerom = (now - timedelta(days=2)).strftime("%Y-%m-%d")
        zajtra = (now + timedelta(days=1)).strftime("%Y-%m-%d")

        # === PROFIL KLIENTA ===
        meno = profil_uzivatela.get('firstName', 'Klient')
        vek = profil_uzivatela.get('age', 0)
        pohlavie = profil_uzivatela.get('gender', 'male')
        vyska = profil_uzivatela.get('height', 0)
        vaha = profil_uzivatela.get('currentWeight', 0)
        cielova_vaha = profil_uzivatela.get('targetWeight', 0)
        ciel = profil_uzivatela.get('fitnessGoal', 'maintain')
        aktivita = profil_uzivatela.get('activityLevel', 'moderate')
        target_cal = profil_uzivatela.get('targetCalories', 0)
        med_conditions = profil_uzivatela.get('medicalConditions', [])
        diet_restrictions = profil_uzivatela.get('dietaryRestrictions', [])

        # Výpočet BMI
        bmi = round(vaha / ((vyska/100)**2), 1) if vyska > 0 and vaha > 0 else 0

        # Výpočet TDEE (odhad denného príjmu kalórií) ak nie je nastavený
        if not target_cal and vaha > 0 and vyska > 0 and vek > 0:
            if pohlavie == 'female':
                bmr = 10 * vaha + 6.25 * vyska - 5 * vek - 161
            else:
                bmr = 10 * vaha + 6.25 * vyska - 5 * vek + 5
            activity_mult = {'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725, 'very_active': 1.9}
            tdee = bmr * activity_mult.get(aktivita, 1.55)
            goal_adj = {'lose_weight': -500, 'gain_muscle': 300, 'maintain': 0, 'improve_health': 0}
            target_cal = int(tdee + goal_adj.get(ciel, 0))

        ciel_sk = {'lose_weight': 'schudnúť', 'gain_muscle': 'nabrať svaly', 'maintain': 'udržať váhu', 'improve_health': 'zlepšiť zdravie'}.get(ciel, ciel)
        aktivita_sk = {'sedentary': 'sedavý', 'light': 'mierne aktívny', 'moderate': 'stredne aktívny', 'active': 'aktívny', 'very_active': 'veľmi aktívny'}.get(aktivita, aktivita)

        # === ZÁZNAMY ZA POSLEDNÉ DNI ===
        entries_section = "\nZÁZNAMY ZA POSLEDNÉ 3 DNI:\n"
        today_calories = 0
        today_protein = 0
        today_carbs = 0
        today_fats = 0

        if historia_zaznamov:
            food_entries = historia_zaznamov.get('food', [])
            if food_entries:
                entries_section += "JEDLO:\n"
                for entry in food_entries[-15:]:
                    name = entry.get('name', '?')
                    cal = entry.get('calories', 0) or 0
                    ts = entry.get('timestamp', entry.get('date', ''))
                    meal = entry.get('mealType', '')
                    date_str = str(ts)[:10] if ts else ''
                    entries_section += f"  - {name}: {cal} kcal ({meal}) [{date_str}]\n"
                    if date_str == dnes:
                        today_calories += cal
                        today_protein += entry.get('protein', 0) or 0
                        today_carbs += entry.get('carbs', 0) or 0
                        today_fats += entry.get('fats', 0) or 0

            exercise_entries = historia_zaznamov.get('exercise', [])
            if exercise_entries:
                entries_section += "CVIČENIE:\n"
                for entry in exercise_entries[-10:]:
                    etype = entry.get('type', '?')
                    dur = entry.get('duration', 0)
                    burned = entry.get('caloriesBurned', 0) or 0
                    ts = entry.get('timestamp', entry.get('date', ''))
                    date_str = str(ts)[:10] if ts else ''
                    entries_section += f"  - {etype}: {dur} min, {burned} kcal spálených [{date_str}]\n"

            weight_entries = historia_zaznamov.get('weight', [])
            if weight_entries:
                entries_section += "VÁHA (posledné záznamy):\n"
                for entry in weight_entries[-5:]:
                    w = entry.get('weight', '?')
                    ts = entry.get('timestamp', entry.get('date', ''))
                    date_str = str(ts)[:10] if ts else ''
                    entries_section += f"  - {w} kg [{date_str}]\n"

            for cat, label in [('mood', 'NÁLADA'), ('sleep', 'SPÁNOK'), ('stress', 'STRES')]:
                cat_entries = historia_zaznamov.get(cat, [])
                if cat_entries:
                    entries_section += f"{label}:\n"
                    for entry in cat_entries[-3:]:
                        if cat == 'mood':
                            entries_section += f"  - skóre: {entry.get('score', '?')}/10\n"
                        elif cat == 'sleep':
                            entries_section += f"  - {entry.get('hours', '?')} hodín\n"
                        elif cat == 'stress':
                            entries_section += f"  - úroveň: {entry.get('level', '?')}/10\n"

        remaining_cal = max(0, target_cal - today_calories) if target_cal else 0

        return f"""Si FitMind AI - osobný tréner, nutričný expert a fitness poradca pre klienta {meno}. Poznáš ho/ju veľmi dobre.

PROFIL KLIENTA:
- Meno: {meno}
- Vek: {vek} rokov | Pohlavie: {'žena' if pohlavie == 'female' else 'muž'}
- Výška: {vyska} cm | Aktuálna váha: {vaha} kg | Cieľová váha: {cielova_vaha} kg | BMI: {bmi}
- Fitness cieľ: {ciel_sk}
- Úroveň aktivity: {aktivita_sk}
- Denný kalorický cieľ: {target_cal} kcal
- Zdravotné obmedzenia: {', '.join(med_conditions) if med_conditions else 'žiadne'}
- Diétne obmedzenia: {', '.join(diet_restrictions) if diet_restrictions else 'žiadne'}

DNEŠNÝ SÚHRN ({dnes}):
- Doteraz zjedených: {int(today_calories)} kcal
- Zostáva do cieľa: {int(remaining_cal)} kcal
- Bielkoviny: {int(today_protein)}g | Sacharidy: {int(today_carbs)}g | Tuky: {int(today_fats)}g
{entries_section}
Aktuálny čas servera (UTC): {aktualny_cas}

REFERENČNÉ DÁTUMY:
- Dnes: {dnes} (čas: {now.strftime('%H:%M')} UTC)
- Včera: {vcera}
- Predvčerom: {predvcerom}
- Zajtra: {zajtra}
- Ak klient povie len "ráno", "obed", "večer" bez dátumu -> myslí DNEŠOK ({dnes}).
- Ak klient píše v noci (00:00-04:00), pravdepodobne myslí ešte "včerajší" deň -> spýtaj sa alebo použi včerajší dátum ak ide o večeru/spánok.

HLAVNÉ PRAVIDLÁ:
1. Hovor po slovensky. Oslovuj klienta menom ({meno}).
2. UKLADANIE DÁT:
   - Ak klient povie, že jedol, cvičil, vážil sa alebo hovorí o nálade/spánku -> MUSÍŠ ZAVOLAŤ FUNKCIU (napr. save_food_entry).
   - Samotná textová odpoveď ("Uložil som to") DÁTA NEULOŽÍ! Bez zavolania funkcie sa informácia STRATÍ.
   - Ak spomenul viac vecí, zavolaj funkciu VIACKRÁT (pre každú položku zvlášť).
   - ROZLIŠUJ 'category': 'food' (jedlo) vs 'drink' (nápoj).
3. RELATÍVNE DÁTUMY:
3. RELATÍVNE DÁTUMY:
   - "predvčerom" = {predvcerom}
   - "včera" = {vcera}
   - "dnes" = {dnes}
   - "zajtra" = {zajtra}
   - AK klient použije tieto výrazy, VŽDY pošli parameter 'date' v ISO formáte (napr. "{vcera}T18:00:00").
   - Ak klient povie len "raňajky", "obed", "večera" bez dňa -> myslí DNEŠOK ({dnes}).
   - Pre 'breakfast' daj čas 08:00, 'lunch' 12:00, 'dinner' 19:00, 'snack' 15:00.
4. KALÓRIE A ŽIVINY: Odhadni ich sám ako expert. NIKDY sa nepýtaj klienta priamo na to, koľko kalórií jedlo malo. Ak klient zadá jedlo veľmi všeobecne (napr. 'nejaká polievka', 'koláč') alebo je množstvo podozrivé/nereálne, kľudne sa ho v odpovedi pýtaj doplňujúce otázky na upresnenie (napr. 'O akú presne polievku išlo?'). Prípadne môžeš hneď funkciu zavolať s priemerným odhadom (napr. polievka ~150 kcal) a v texte pridať nepriamu otázku na detaily. Je to na tebe, buď zvedavý a reaguj prirodzene!
5. SANITY CHECK: Ak sú nereálne množstvá (napr. 100 pízz), spýtaj sa na upresnenie a s uložením počkaj na potvrdenie od užívateľa.
6. POTVRDENIE: Ak voláš funkciu na uloženie dát, NIKDY nepíš detaily záznamu (čo a koľko) do textovej odpovede. Napíš len krátke povzbudenie typu 'Rozumiem'. Systém automaticky vygeneruje a zobrazí detailný zoznam uložených vecí v grafickom rozhraní klienta.
8. POZNÁŠ KLIENTA: Máš kompletný profil klienta aj jeho záznamy. VŽDY použi tieto údaje.
   - Ak sa pýta čo má jesť alebo koľko kalórií mu zostáva, vypočítaj to z DNEŠNÉHO SÚHRNU.
   - NIKDY NEHOVOR "nemám prístup k tvojim údajom" alebo "neviem aký máš cieľ" - MÁŠ ICH VYŠŠIE!
   - Nežiadaj klienta o informácie, ktoré už máš v profile.
9. ODPORÚČANIA JEDLA: Pri odporúčaní jedla:
   - Pozri sa na zostávajúce kalórie ({int(remaining_cal)} kcal) a chýbajúce makronutrienty.
   - Navrhni konkrétne jedlá s odhadnutými kalóriami.
   - Prispôsob odporúčania cieľu klienta ({ciel_sk}).
10. FITNESS PORADENSTVO: Odpovedaj detailne na otázky o tréningu, výžive, suplementoch, regenerácii.
11. Buď stručný, motivačný a povzbudzuj klienta menom.
"""

    def _generate_confirmation_text(self, funkcie):
        """Vygeneruje potvrdzovací text z function calls lokálne (bez ďalšieho API volania)."""
        items = []
        
        for fc in funkcie:
            fc_args = json.loads(fc.arguments) if isinstance(fc.arguments, str) else fc.arguments
            
            if fc.name == 'save_food_entry':
                name = fc_args.get('name', 'jedlo')
                cal = fc_args.get('calories', 0)
                category = fc_args.get('category', 'food')
                emoji = '🍹' if category == 'drink' else '🍽️'
                date_str = fc_args.get('date', '')
                date_info = ''
                if date_str:
                    try:
                        d = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                        date_info = f" dňa {d.strftime('%d.%m. o %H:%M')}"
                    except:
                        date_info = f" ({date_str})"
                items.append(f"{emoji} {name} ({int(cal)} kcal){date_info}")
            elif fc.name == 'save_exercise_entry':
                etype = fc_args.get('type', 'cvičenie')
                dur = fc_args.get('duration', 0)
                burned = fc_args.get('caloriesBurned', 0)
                extra = f", ~{int(burned)} kcal spálených" if burned else ""
                items.append(f"🏃 {etype} ({int(dur)} min{extra})")
            elif fc.name == 'save_mood_entry':
                items.append(f"😊 Nálada: {fc_args.get('score', '?')}/10")
            elif fc.name == 'save_weight_entry':
                items.append(f"⚖️ Váha: {fc_args.get('weight', '?')} kg")
        
        if items:
            return "✅ Zapísal som ti:\n" + "\n".join(f"  • {item}" for item in items) + "\n\n💪 Pokračuj tak ďalej!"
        return "✅ Údaje boli zapísané."

    def chat(self, sprava_uzivatela: str, instrukcie: str, historia_chatu: List[Dict] = None):
        """
        Hlavná funkcia pre AI chat.
        Používa viacero modelov ako fallback proti rate-limitingu.
        Robí len 1 API volanie na správu (žiadny follow-up).
        """
        if not self.klient:
            return OdpovedRobota("Prepáč, mám poruchu spojenia (chýba API kľúč).")

        # Modely na vyskúšanie - ak prvý zlyhá na rate limit, skúsime ďalší
        primary_model = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
        models_to_try = [primary_model]
        for fallback in ['gemini-2.0-flash-lite', 'gemini-1.5-flash']:
            if fallback != primary_model:
                models_to_try.append(fallback)

        last_error = None
        
        for model_idx, model_name in enumerate(models_to_try):
            for attempt in range(2):
                try:
                    # 1. Pripravíme históriu
                    historia_pre_google = []
                    if historia_chatu:
                        for zaznam in historia_chatu:
                            rola = "user" if zaznam['role'] == "user" else "model"
                            text = zaznam.get('content') or "..."
                            historia_pre_google.append({
                                "role": rola,
                                "parts": [{"text": text}]
                            })

                    # 2. Konfigurácia
                    konfiguracia = types.GenerateContentConfig(
                        system_instruction=instrukcie,
                        tools=[types.Tool(function_declarations=self._daj_zoznam_nastrojov())]
                    )

                    # 3. Vytvoríme chat a pošleme
                    chat_relacia = self.klient.chats.create(
                        model=model_name,
                        history=historia_pre_google,
                        config=konfiguracia
                    )

                    print(f"[AI] Sending to {model_name} (attempt {attempt+1})...")
                    odpoved_google = chat_relacia.send_message(sprava_uzivatela)

                    # 4. Spracujeme odpoveď
                    funkcie_na_zavolanie = []
                    text_odpovede = ""

                    if not odpoved_google.candidates:
                        return OdpovedRobota("Prepáč, AI nepripravilo odpoveď. Skús to ešte raz.")

                    kandidat = odpoved_google.candidates[0]
                    if not kandidat.content or not kandidat.content.parts:
                        print(f"[AI WARNING] Empty content. Finish: {getattr(kandidat, 'finish_reason', 'unknown')}")
                        return OdpovedRobota("Prepáč, AI neposlalo odpoveď. Skús to ešte raz.")
                    
                    for cast in kandidat.content.parts:
                        try:
                            if cast.function_call:
                                fc = cast.function_call
                                args = {}
                                if fc.args:
                                    if isinstance(fc.args, dict):
                                        args = fc.args
                                    elif isinstance(fc.args, str):
                                        args = json.loads(fc.args)
                                    else:
                                        args = dict(fc.args)
                                
                                print(f"[AI FUNC] {fc.name} -> {args}")
                                funkcie_na_zavolanie.append(UdajeOFunkcii(fc.name, args))
                            elif cast.text:
                                text_odpovede += cast.text
                        except Exception as part_err:
                            print(f"[AI WARNING] Part error: {part_err}")
                            continue

                    if funkcie_na_zavolanie:
                        # Vždy vygenerujeme potvrdenie lokálne, aby sme mali istotu, že to sedí s funkciami
                        sys_msg = self._generate_confirmation_text(funkcie_na_zavolanie)
                        
                        # Ak AI už napísalo niečo, pridáme to k tomu (ak to nie je duplicitné)
                        if text_odpovede:
                            final_text = text_odpovede + "\n\n" + sys_msg
                        else:
                            final_text = sys_msg
                        
                        print(f"[AI OK] {len(funkcie_na_zavolanie)} functions, text={len(final_text)} chars")
                        return OdpovedRobota(final_text, funkcie_na_zavolanie)
                    
                    if not text_odpovede:
                        text_odpovede = "Nerozumel som, skús to inak."

                    print(f"[AI OK] Text response, {len(text_odpovede)} chars")
                    return OdpovedRobota(text_odpovede)

                except Exception as chyba:
                    error_str = str(chyba)
                    last_error = error_str
                    print(f"[AI ERROR] Model={model_name} Attempt={attempt+1}: {chyba}")
                    
                    if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                        if attempt == 0:
                            import time as _time
                            wait = 5
                            print(f"[AI RETRY] Rate limited on {model_name}. Waiting {wait}s...")
                            _time.sleep(wait)
                            continue
                        else:
                            print(f"[AI FALLBACK] {model_name} exhausted, trying next model...")
                            import time as _time
                            _time.sleep(2)
                            break
                    
                    traceback.print_exc()
                    return OdpovedRobota("Nastala chyba pri komunikácii s AI. Skús to prosím znova.")
        
        print(f"[AI CRITICAL] All models exhausted. Last error: {last_error}")
        return OdpovedRobota("⏳ AI je momentálne preťažené. Skús to prosím o minútu znova.")

    def get_final_response(self, messages):
        return "Hotovo! Údaje boli uložené."