import json
import os
from datetime import datetime
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
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas (ak používateľ špecifikoval iný čas), inak prázdne."}
                },
                "required": ["name", "calories", "protein", "carbs", "fats", "category"]
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
                    "date": {"type": "STRING", "description": "ISO 8601 dátum a čas (ak používateľ špecifikoval iný čas), inak prázdne."}
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
        aktualny_cas = datetime.now().isoformat()

        # Vrátime text inštrukcií
        return f"""Si FitMind AI - osobný tréner a nutričný expert.
Tvoj klient (profil JSON): {profil_text}
Jeho ciele: {ciele_text}
Aktuálny čas servera: {aktualny_cas}

PRAVIDLÁ:
1. Hovor po slovensky.
2. Keď klient povie, že jedol alebo cvičil -> ZAVOLAJ FUNKCIU na uloženie (tool use).
   - Ak spomenul viac jedál (napr. "mal som kávu a rožok"), zavolaj funkciu 'save_food_entry' VIACKRÁT (pre každú položku zvlášť).
   - Ak špecifikoval čas (napr. "včera o 18:00"), vypočítaj správny ISO dátum a pošli ho v parametri 'date'.
   - Rozlišuj 'category': 'food' pre jedlá, 'drink' pre nápoje (káva, čaj, džús, voda).
3. Kalórie a živiny ODHADNI sám (si expert). Nepýtaj sa klienta na gramy, ak to nevie.
4. SANITY CHECK: 
   - Ak klient zadá nereálne množstvo (napr. "60 káv", "zjedol som celé prasa"), NEVOLAJ funkciu hneď.
   - Namiesto toho sa opýtaj: "To znie ako extrémne množstvo. Naozaj si mal 60 káv? Mám to zapísať?"
   - Až po potvrdení funkciu zavolaj.
5. V texte odpovede VŽDY explicitne zhrň, čo presne zapisuješ (napr. "Zapisujem: Praženica (300 kcal) na raňajky o 8:00 a Káva (Drink, 50 kcal).").
6. Buď stručný, milý a motivujúci.
"""

    def chat(self, sprava_uzivatela: str, instrukcie: str, historia_chatu: List[Dict] = None):
        """
        Toto je hlavná funkcia, ktorú volá main.py ked príde správa.
        """
        if not self.klient:
            return OdpovedRobota("Prepáč, mám poruchu spojenia (chýba API kľúč).")

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

            # Google môže vrátiť viac častí, prejdeme ich
            kandidat = odpoved_google.candidates[0]
            for cast in kandidat.content.parts:
                if cast.function_call:
                    # Aha! Chce zavolať funkciu -> pridáme do zoznamu
                    funkcie_na_zavolanie.append(UdajeOFunkcii(cast.function_call.name, cast.function_call.args))
                elif cast.text:
                    # Aha! Chce niečo povedať
                    text_odpovede += cast.text

            # 6. Zabalíme výsledok pre main.py
            if funkcie_na_zavolanie:
                # Ak chce volať funkcie
                if not text_odpovede:
                    # Ak nenechal text, vygenerujeme aspoň niečo
                    text_odpovede = "Spracovávam údaje..."
                
                return OdpovedRobota(
                    text_odpovede,
                    funkcie_na_zavolanie
                )
            
            # Ak je to len obyčajný pokec
            if not text_odpovede:
                text_odpovede = "Nerozumel som, skús to inak."

            return OdpovedRobota(text_odpovede)

        except Exception as chyba:
            print(f"Chyba v AI: {chyba}")
            return OdpovedRobota("Ospravedlňujem sa, nastala chyba pri komunikácii s AI.")

    def get_final_response(self, messages):
        return "Hotovo! Údaje boli uložené."