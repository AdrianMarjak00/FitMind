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
        # Parametre musime premeniť na text (JSON), lebo tak to main.py očakáva
        self.arguments = json.dumps(parametre)

class OdpovedRobota:
    """Toto je balíček, ktorý vrátime naspäť do main.py"""
    def __init__(self, text, funkcie=None):
        self.content = text           # Textová odpoveď (napr. "Ahoj")
        self.function_calls = funkcie or []  # Zoznam volaní funkcií

# === HLAVNÁ TRIEDA ===

class AIService:
    def __init__(self):
        # 1. Hľadáme kľúč v súboroch alebo nastaveniach
        kluc = os.getenv("GOOGLE_API_KEY")
        
        # Ak nie je v nastaveniach, skúsime tajný súbor (pre Render server)
        if not kluc and os.path.exists("/etc/secrets/GOOGLE_API_KEY"):
            try:
                kluc = open("/etc/secrets/GOOGLE_API_KEY", "r").read().strip()
                print("Kľúč načítaný zo súboru.")
            except:
                pass

        # 2. Pripojenie ku Google
        self.klient = None
        if kluc:
            try:
                self.klient = genai.Client(api_key=kluc)
            except Exception as chyba:
                print(f"❌ Chyba pripojenia: {chyba}")
        else:
            print("⚠️ POZOR: Nemám API kľúč. AI nebude odpovedať.")

    def _daj_zoznam_nastrojov(self):
        """
        Tu definujeme 'Menu' funkcií, ktoré môže AI použiť.
        Je to vlastne zoznam toho, čo vie naša aplikácia urobiť.
        """
        # Nástroj 1: Uloženie jedla
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
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas záznamu. POVINNÉ ak klient hovorí o inom čase než teraz (napr. včera, predvčerom, zajtra). Formát: YYYY-MM-DDTHH:MM:SS. Ak klient neuviedol čas, nechaj prázdne."}
                },
                "required": ["name", "calories", "category"]
            }
        )

        # Nástroj 2: Uloženie cvičenia
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
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas záznamu. POVINNÉ ak klient hovorí o inom čase než teraz."}
                },
                "required": ["type", "duration"]
            }
        )

        # Nástroj 3: Nálada
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

        # Nástroj 4: Váha
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
        """
        Pripraví inštrukcie pre AI (kto je a čo má robiť).
        """
        # Pomocná funkcia na prevod dátumu na text (aby to nespadlo)
        def prevod_datumu(objekt):
            if isinstance(objekt, datetime):
                return objekt.isoformat()
            return str(objekt)

        # Profil premeníme na text
        profil_text = json.dumps(profil_uzivatela, default=prevod_datumu, ensure_ascii=False)
        ciele_text = ", ".join(profil_uzivatela.get('goals', []))
        from datetime import timezone
        now = datetime.now(timezone.utc)
        aktualny_cas = now.strftime("%Y-%m-%dT%H:%M:%S%z")
        
        # Predpočítaj dôležité dátumy
        dnes = now.strftime("%Y-%m-%d")
        vcera = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        predvcerom = (now - timedelta(days=2)).strftime("%Y-%m-%d")
        zajtra = (now + timedelta(days=1)).strftime("%Y-%m-%d")

        # Vrátime text inštrukcií
        return f"""Si FitMind AI - osobný tréner, nutričný expert a fitness poradca. Máš hlboké znalosti o výžive, tréningu, regenerácii, suplementácii a zdravom životnom štýle.
Tvoj klient (profil JSON): {profil_text}
Jeho ciele: {ciele_text}
Aktuálny čas servera (UTC): {aktualny_cas}

REFERENČNÉ DÁTUMY (vypočítané z aktuálneho času):
- Dnes: {dnes}
- Včera: {vcera}
- Predvčerom: {predvcerom}
- Zajtra: {zajtra}

HLAVNÉ PRAVIDLÁ:
1. Hovor po slovensky.
2. Keď klient povie, že jedol alebo cvičil -> VŽDY ZAVOLAJ FUNKCIU na uloženie (tool use).
   - Ak spomenul viac jedál/aktivít (napr. "mal som kávu, rožok a potom som bežal"), zavolaj príslušné funkcie VIACKRÁT (pre každú položku samostatne).
   - ROZLIŠUJ 'category': 'food' pre tuhú stravu, 'drink' pre všetky nápoje (voda, káva s mliekom, čaj, proteín, alkohol).
3. RELATÍVNE DÁTUMY A ČAS:
   - Keď klient povie "včera", "predvčerom", "pred dvoma dňami", "dva dni dozadu", "zajtra" a podobne -> VŽDY vypočítaj správny ISO 8601 dátum podľa REFERENČNÝCH DÁTUMOV vyššie.
   - "predvčerom" = "pred dvoma dňami" = "dva dni dozadu" = {predvcerom}
   - "včera" = {vcera}
   - "dnes" alebo žiadna špecifikácia = nechaj 'date' prázdne (systém použije aktuálny čas)
   - "zajtra" = {zajtra} (zaznamenaj to so zajtrajším dátumom)
   - Pre "okolo obeda" použi čas 12:00, "ráno/raňajky" 08:00, "večera" 18:00, "svačina" 10:00 alebo 15:00.
   - VŽDY pošli parameter 'date' vo formáte "{predvcerom}T12:00:00" keď klient hovorí o inom čase.
   - NIKDY sa nepýtaj na presný dátum ak klient použil jasný relatívny výraz (včera, predvčerom, pred X dňami). Vypočítaj ho sám!
4. KALÓRIE A ŽIVINY: Odhadni ich sám podľa svojich vedomostí (si expert). NIKDY sa nepýtaj klienta na kalórie, gramy bielkovín, sacharidov alebo tukov. Odhadni to automaticky.
   - Napríklad: lazaňe ~500-600 kcal, praženica 2 vajcia ~200 kcal, jablko ~80 kcal.
5. SANITY CHECK (Extrémne hodnoty):
   - Ak sú v správe nereálne množstvá (napr. "60 káv", "zjedol som 5 kíl slaniny", "behal som 20 hodín v kuse"), NEUKLADAJ to hneď.
   - Odpovedz otázkou: "To je naozaj veľa! Naozaj si mal [množstvo]? Ak áno, napíš mi 'áno' a ja to zapíšem."
   - Ak klient v ďalšej správe potvrdí (povie "áno", "jasné", "fakt"), až vtedy zavolaj funkcie.
6. POTVRDENIE: Po úspešnom zavolaní funkcií VŽDY napíš presne, ČO si zapísal. Toto je KRITICKÉ, nikdy len nevolaj funkciu bez toho, aby si klientovi v texte potvrdil úspešný zápis.
   - Príklad: "Zapísal som ti: 🍎 Jablko (80 kcal), ☕ Káva (Drink, 2 kcal) a 🏃 Beh (30 min)."
   - Ak zaznamenáš jedlo a nápoj v jednej správe, vymenuj ich tak, aby bolo jasné čo je čo.
7. ODHADY: Ak používateľ nepovie makronutrienty (bielkoviny, sacharidy, tuky), ODHADNI ich podľa typu jedla, aby mal klient aspoň približné štatistiky. To isté platí pre spálené kalórie pri cvičení.
8. FITNESS PORADENSTVO: Keď klient položí otázku o tréningu, výžive, suplementoch, regenerácii, chudnutí, naberaní svalovej hmoty, stretčingu a podobne - odpovedz mu detailne a odborne. Si expert v tejto oblasti.
9. Buď stručný, motivačný a povzbudzuj klienta k jeho cieľom.
"""

    def chat(self, sprava_uzivatela: str, instrukcie: str, historia_chatu: List[Dict] = None):
        """
        Toto je hlavná funkcia, ktorú volá main.py ked príde správa.
        Obsahuje retry logiku pre prípad rate-limitingu (429).
        """
        if not self.klient:
            return OdpovedRobota("Prepáč, mám poruchu spojenia (chýba API kľúč).")

        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                # 1. Pripravíme históriu, aby jej Google rozumel
                historia_pre_google = []
                if historia_chatu:
                    for zaznam in historia_chatu:
                        rola = "user" if zaznam['role'] == "user" else "model"
                        text = zaznam.get('content') or "..." # Poistka proti prázdnym správam
                        historia_pre_google.append(
                            types.Content(role=rola, parts=[types.Part(text=text)])
                        )

                # 2. Nastavíme konfiguráciu (dáme mu 'Nástroje')
                konfiguracia = types.GenerateContentConfig(
                    system_instruction=instrukcie,
                    tools=[types.Tool(function_declarations=self._daj_zoznam_nastrojov())]
                )

                # 3. Vytvoríme chat
                chat_relacia = self.klient.chats.create(
                    model=os.getenv('GEMINI_MODEL', 'gemini-2.0-flash'),
                    history=historia_pre_google,
                    config=konfiguracia
                )

                # 4. Pošleme správu a čakáme
                odpoved_google = chat_relacia.send_message(sprava_uzivatela)

                # 5. Zistíme, čo Google odpovedal
                funkcie_na_zavolanie = []
                text_odpovede = ""

                if not odpoved_google.candidates:
                    return OdpovedRobota("Prepáč, Google nepripravil žiadnu odpoveď. Skús to prosím ešte raz.")

                # Google môže vrátiť viac častí, prejdeme ich
                kandidat = odpoved_google.candidates[0]
                
                if not kandidat.content or not kandidat.content.parts:
                    print(f"[AI WARNING] Empty candidate content. Finish reason: {kandidat.finish_reason}")
                    return OdpovedRobota("Prepáč, AI neposlalo žiadnu odpoveď. Skús to prosím ešte raz.")
                
                for cast in kandidat.content.parts:
                    try:
                        if cast.function_call:
                            fc = cast.function_call
                            # Bezpečné spracovanie argumentov
                            args = {}
                            if fc.args:
                                if isinstance(fc.args, dict):
                                    args = fc.args
                                elif isinstance(fc.args, str):
                                    args = json.loads(fc.args)
                                else:
                                    # MapComposite alebo iný typ
                                    args = dict(fc.args)
                            
                            print(f"[AI FUNCTION CALL] {fc.name} -> {args}")
                            funkcie_na_zavolanie.append(UdajeOFunkcii(fc.name, args))
                        elif cast.text:
                            text_odpovede += cast.text
                    except Exception as part_err:
                        print(f"[AI WARNING] Error processing part: {part_err}")
                        traceback.print_exc()
                        continue

                # 6. Zabalíme výsledok pre main.py
                if funkcie_na_zavolanie:
                    # Ak chce volať funkcie a nemá text
                    if not text_odpovede:
                        # Skúsime získať textovú odpoveď od AI po vykonaní funkcií
                        try:
                            import time as _time
                            _time.sleep(1)  # Krátka pauza aby sme nenarazili na rate limit
                            
                            function_responses = []
                            for fc in funkcie_na_zavolanie:
                                fc_args = json.loads(fc.arguments) if isinstance(fc.arguments, str) else fc.arguments
                                function_responses.append(
                                    types.Part(function_response=types.FunctionResponse(
                                        name=fc.name,
                                        response={"status": "success", "message": f"Záznam {fc_args.get('name', fc.name)} bol úspešne uložený."}
                                    ))
                                )
                            
                            # Pošleme výsledky funkcií naspäť do chatu
                            followup = chat_relacia.send_message(function_responses)
                            if followup.candidates and followup.candidates[0].content and followup.candidates[0].content.parts:
                                for part in followup.candidates[0].content.parts:
                                    if part.text:
                                        text_odpovede += part.text
                        except Exception as followup_err:
                            print(f"[AI WARNING] Followup failed: {followup_err}")
                        
                        if not text_odpovede:
                            # Vygenerujeme aspoň zmysluplnú odpoveď
                            items = []
                            for fc in funkcie_na_zavolanie:
                                fc_args = json.loads(fc.arguments) if isinstance(fc.arguments, str) else fc.arguments
                                name = fc_args.get('name') or fc_args.get('type') or fc.name
                                cal = fc_args.get('calories', '')
                                items.append(f"{name}" + (f" ({cal} kcal)" if cal else ""))
                            text_odpovede = f"✅ Zapísal som ti: {', '.join(items)}."
                    
                    return OdpovedRobota(
                        text_odpovede,
                        funkcie_na_zavolanie
                    )
                
                # Ak je to len obyčajný pokec
                if not text_odpovede:
                    text_odpovede = "Nerozumel som, skús to inak."

                return OdpovedRobota(text_odpovede)

            except Exception as chyba:
                error_str = str(chyba)
                print(f"[AI ERROR] Attempt {attempt+1}/{max_retries}: {chyba}")
                
                # Ak je to rate limit (429), skúsime znova po chvíli
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt < max_retries - 1:
                        import time as _time
                        wait_time = (2 ** attempt) * 2  # 2, 4, 8 sekúnd
                        print(f"[AI RETRY] Rate limited. Waiting {wait_time}s before retry...")
                        _time.sleep(wait_time)
                        continue
                    else:
                        return OdpovedRobota("⏳ Momentálne je AI preťažené (príliš veľa požiadaviek). Skús to prosím o chvíľu znova.")
                
                traceback.print_exc()
                return OdpovedRobota("Ospravedlňujem sa, nastala technická chyba. Skús to prosím znova.")
        
        return OdpovedRobota("Ospravedlňujem sa, nepodarilo sa spojiť s AI. Skús to prosím neskôr.")

    def get_final_response(self, messages):
        return "Hotovo! Údaje boli uložené."