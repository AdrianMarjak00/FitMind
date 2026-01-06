# 🧪 Test - Inteligentný AI Coach

## ✅ Čo sa zmenilo

AI je teraz **oveľa inteligentnejší** a **prirodzenejší**:

### ❌ Pred (Formulárový prístup)

```
Ty: "Mal som praženicu"
AI: "Koľko malo kalórií? Koľko gramov proteínu?"
```

### ✅ Teraz (Konverzačný prístup)

```
Ty: "Mal som na raňajky praženicu"
AI: "Super raňajky! 🍳 A s čím si to mal? S chlebom, zeleninou?"

Ty: "S 2 krajce chleba"
AI: "Výborne! Uložil som: Praženica s chlebom 
     (~350 kcal, 20g proteínu, 30g sacharidov, 15g tukov).
     
     To je super začiatok dňa - máš dostatok energie! 
     Dnes máš cieľ 2000 kcal, už máš 350. Čo plánuješ na obed?"
```

---

## 🚀 Ako to funguje

### 1. AI sa najprv pýta na detaily

Keď povieš "mal som praženicu", AI sa opýta:
- S čím? (chlieb, zelenina, samotná)
- Koľko vajec?
- Veľkosť porcie?

### 2. AI automaticky odhadne hodnoty

AI má obrovskú databázu jedál a dokáže odhadnúť:
- ✅ Kalórie
- ✅ Bielkoviny
- ✅ Sacharidy
- ✅ Tuky

### 3. AI uloží a potvrdí

AI zavolá funkciu `save_food_entry` s odhadnutými hodnotami a povie ti:
```
"Uložil som: Praženica s chlebom (~350 kcal, 20g proteínu)"
```

---

## 🧪 Test Scenáre

### Scenár 1: Raňajky

```
Ty: "Mal som na raňajky praženicu"

AI: "Super raňajky! 🍳 A s čím si to mal? S chlebom, zeleninou?"

Ty: "S chlebom"

AI: "Výborne! Uložil som: Praženica s chlebom 
     (~350 kcal, 20g proteínu, 30g sacharidov, 15g tukov).
     To je super začiatok dňa!"
```

**Výsledok:**
- ✅ Jedlo uložené do Firestore
- ✅ Kalórie započítané do denného cieľa
- ✅ Prirodzená konverzácia

---

### Scenár 2: Obed

```
Ty: "Zjedol som kuracie prsia s ryžou"

AI: "Skvelý zdravý obed! 💪 Približne koľko kurčaťa? Stredná porcia?"

Ty: "Áno, asi 200g"

AI: "Perfektne! Uložil som: Kuracie prsia (200g) s ryžou
     (~500 kcal, 45g proteínu, 50g sacharidov, 10g tukov).
     Výborný pomer makier pre svalovú hmotu! 🔥"
```

---

### Scenár 3: Jednoduchý odhad

```
Ty: "Mal som jogurt s ovocím"

AI: "Dobré! 🥣 Aký veľký jogurt? Malý alebo väčší?"

Ty: "Klasický 150ml"

AI: "Super! Uložil som: Jogurt s ovocím 
     (~180 kcal, 8g proteínu, 28g sacharidov, 3g tukov).
     Zdravá desiata!"
```

---

### Scenár 4: Kompletná informácia hneď

```
Ty: "Zjedol som veľký steak s hranolkami a šalátom"

AI: "Wow, poriadny obed! 🥩 Uložil som: Steak s hranolkami a šalátom
     (~750 kcal, 50g proteínu, 45g sacharidov, 40g tukov).
     
     Dostatok proteínu pre svaly, ale daj si pozor na tuky!
     Tento týždeň už máš X kcal priemer."
```

---

## ⚙️ Setup

### 1. Opravte OpenAI API kľúč

Vidím v termináli chybu **401 - Invalid API key**.

**Riešenie:**

```bash
# 1. Získajte nový kľúč
# Choďte na: https://platform.openai.com/api-keys

# 2. Otvorte backend/.env
# backend/.env

OPENAI_API_KEY=sk-proj-your-real-key-here
PORT=8000
ENV=development
```

### 2. Reštartujte backend

```bash
cd backend
python main.py
```

Keď vidíte:
```
[START] Spustam FitMind Backend na porte 8000
[OK] Firebase pripojene!
```

✅ Je to pripravené!

---

## 🎯 Príklady Na Testovanie

Skúste napísať tieto správy do AI chatu:

### 🍳 Raňajky
```
"Mal som na raňajky praženicu"
"Zjedol som ovsenú kašu s banánom"
"Raňajky: 2 vajíčka, jogurt, ovocie"
```

### 🍽️ Obed
```
"Na obed som mal kuracie prsia s ryžou"
"Zjedol som cestoviny s paradajkovou omáčkou"
"Obed: steak s hranolkami"
```

### 🥗 Jednoduchá desiata
```
"Mal som jogurt"
"Zjedol som jablko"
"Desiata: proteínová tyčinka"
```

### 🍕 Komplikované jedlo
```
"Mal som pizzu"
"Zjedol som burger s hranolkami"
"Večera: čínske jedlo"
```

---

## 🔍 Čo očakávať

### 1. Prvá správa - Otázka

AI sa vás opýta na detaily:
```
"A s čím si to mal? S chlebom, zeleninou?"
"Približně koľko? Stredná porcia?"
"Aký veľký? Malý alebo väčší?"
```

### 2. Druhá správa - Uloženie

AI uloží jedlo s odhadnutými hodnotami:
```
"Uložil som: [jedlo] (~X kcal, Y g proteínu)"
```

### 3. Notifikácia

Uvidíte notifikáciu:
```
🍽️ Jedlo uložené
```

### 4. Overenie vo Firestore

Choďte do **Firebase Console → Firestore**:
```
userFitnessProfiles/{yourUserId}/foodEntries/
```

Uvidíte nový záznam s:
- ✅ `name`: "Praženica s chlebom"
- ✅ `calories`: 350
- ✅ `protein`: 20
- ✅ `carbs`: 30
- ✅ `fats`: 15
- ✅ `timestamp`: Aktuálny čas

---

## 💡 Tipy

### AI je teraz inteligentnejší

1. **Nemusíte špecifikovať všetko** - stačí povedať "mal som praženicu"
2. **AI sa opýta** na to, čo potrebuje vedieť
3. **AI odhadne** nutričné hodnoty automaticky
4. **Prirodzená konverzácia** - ako s trénerom, nie s kalkulačkou

### Čo AI dokáže odhadnúť

- ✅ Základné jedlá (vajcia, chlieb, mäso, ryža)
- ✅ Kombinácie jedál (steak s hranolkami)
- ✅ Veľkosti porcií (malá/stredná/veľká)
- ✅ Makronutrienty (proteíny, sacharidy, tuky)

### AI používa svoju knowledge base

GPT-4o-mini má obrovskú databázu jedál, takže pozná:
- 🍳 Typické kalórie pre vajcia, mäso, ryžu, cestoviny
- 🥗 Makronutrientné zloženie bežných jedál
- 🍕 Približné hodnoty pre reštauračné jedlá

---

## 🐛 Riešenie Problémov

### AI stále žiada presné hodnoty?

**Problém:** Backend môže používať starý systémový prompt.

**Riešenie:**
```bash
# Reštartujte backend
cd backend
# Ctrl+C (ukončte)
python main.py  # Spustite znova
```

---

### AI neukladá jedlo?

**Problém:** Chýba OpenAI API kľúč alebo je neplatný.

**Riešenie:**
1. Skontrolujte `backend/.env`
2. Overte API kľúč na https://platform.openai.com/api-keys
3. Reštartujte backend

---

### Firestore chyba?

**Problém:** Firebase nie je pripojený.

**Riešenie:**
```bash
# Skontrolujte či backend vypíše:
[OK] Firebase pripojene!

# Ak nie, skontrolujte:
backend/firebase-service-account.json
```

---

## 🎉 Výsledok

Teraz máte **inteligentného AI trénera**, ktorý:

✅ **Konverzuje prirodzene** - pýta sa otázky  
✅ **Odhaduje hodnoty** - nemusíte poznať kalórie  
✅ **Automaticky zaznamenáva** - všetko sa ukladá  
✅ **Motivuje vás** - ako skutočný tréner  

---

**Užite si prirodzenú konverzáciu s vaším AI trénerom! 💪🚀**

