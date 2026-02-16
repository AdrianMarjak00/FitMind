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

        return [nastroj_jedlo, nastroj_cvicenie, nastroj_nalada, nastroj_vaha]

    def create_system_prompt(self, profil_uzivatela, historia_zaznamov):
        def prevod_datumu(objekt):
            if isinstance(objekt, datetime):
                return objekt.isoformat()
            return str(objekt)

        profil_text = json.dumps(profil_uzivatela, default=prevod_datumu, ensure_ascii=False)
        ciele_text = ", ".join(profil_uzivatela.get('goals', []))
        from datetime import timezone
        now = datetime.now(timezone.utc)
        aktualny_cas = now.strftime("%Y-%m-%dT%H:%M:%S%z")
        
        dnes = now.strftime("%Y-%m-%d")
        vcera = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        predvcerom = (now - timedelta(days=2)).strftime("%Y-%m-%d")
        zajtra = (now + timedelta(days=1)).strftime("%Y-%m-%d")

        return f"""Si FitMind AI - osobný tréner, nutričný expert a fitness poradca.
Tvoj klient (profil JSON): {profil_text}
Jeho ciele: {ciele_text}
Aktuálny čas servera (UTC): {aktualny_cas}

REFERENČNÉ DÁTUMY:
- Dnes: {dnes}
- Včera: {vcera}
- Predvčerom (pred 2 dňami): {predvcerom}
- Zajtra: {zajtra}

HLAVNÉ PRAVIDLÁ:
1. Hovor po slovensky.
2. Keď klient povie, že jedol alebo cvičil -> VŽDY ZAVOLAJ FUNKCIU na uloženie.
   - Ak spomenul viac jedál/aktivít, zavolaj funkcie VIACKRÁT (pre každú položku samostatne).
   - ROZLIŠUJ 'category': 'food' pre tuhú stravu, 'drink' pre nápoje.
3. RELATÍVNE DÁTUMY:
   - "predvčerom" = "pred dvoma dňami" = "dva dni dozadu" = {predvcerom}
   - "včera" = {vcera}
   - "dnes" alebo žiadna špecifikácia = nechaj 'date' prázdne
   - "zajtra" = {zajtra}
   - Pre "okolo obeda" použi čas 12:00, "ráno/raňajky" 08:00, "večera" 18:00, "svačina" 10:00 alebo 15:00.
   - VŽDY pošli parameter 'date' vo formáte "{predvcerom}T12:00:00" keď klient hovorí o inom čase.
   - NIKDY sa nepýtaj na presný dátum ak klient použil jasný relatívny výraz!
4. KALÓRIE A ŽIVINY: Odhadni ich sám. NIKDY sa nepýtaj klienta na kalórie, gramy bielkovín atď. Odhadni to automaticky.
   - Príklady: lazaňe ~550 kcal, praženica 2 vajcia ~200 kcal, jablko ~80 kcal.
5. SANITY CHECK: Ak sú nereálne množstvá, opýtaj sa.
6. POTVRDENIE: Po zavolaní funkcií VŽDY napíš, ČO si zapísal vrátane emoji a kalórií.
7. ODHADY: Vždy odhadni makronutrienty a spálené kalórie, aj keď ich používateľ neuviedol.
8. FITNESS PORADENSTVO: Odpovedaj detailne na otázky o tréningu, výžive, suplementoch, regenerácii.
9. Buď stručný, motivačný a povzbudzuj klienta.
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
                            historia_pre_google.append(
                                types.Content(role=rola, parts=[types.Part(text=text)])
                            )

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

                    # 5. Výsledok
                    if funkcie_na_zavolanie:
                        if not text_odpovede:
                            # Generujeme potvrdenie LOKÁLNE (šetríme API kvótu!)
                            text_odpovede = self._generate_confirmation_text(funkcie_na_zavolanie)
                        
                        print(f"[AI OK] {len(funkcie_na_zavolanie)} functions, text={len(text_odpovede)} chars")
                        return OdpovedRobota(text_odpovede, funkcie_na_zavolanie)
                    
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