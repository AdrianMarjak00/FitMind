# Databáza jedál a cvičení - Návod

## 📊 Aktuálny stav

✅ **35 jedál** v databáze
✅ **30 cvičení** v databáze
✅ AI chatbot má prístup k databáze
✅ Automatické vyhľadávanie pri zápise

## 🍽️ Pridávanie nových jedál

### Spôsob 1: Manuálne pridanie cez Python script

1. Otvor `backend/populate_database.py`
2. Pridaj nové jedlo do `FOODS_DATABASE`:

```python
{"name": "Pizza Margherita", "calories": 800, "protein": 30, "carbs": 90, "fats": 35, "category": "dinner", "portion": "1/2 pizze"},
```

3. Spusti script znova:
```bash
cd backend
python populate_database.py
```

### Spôsob 2: Použitie Firebase Console

1. Otvor Firebase Console
2. Prejdi na Firestore Database
3. Kolekcia: `foods_database`
4. Pridaj nový dokument s poľami:
   - `name`: "Názov jedla"
   - `calories`: 500 (číslo)
   - `protein`: 30 (číslo, gramy)
   - `carbs`: 40 (číslo, gramy)
   - `fats`: 20 (číslo, gramy)
   - `category`: "breakfast" | "lunch" | "dinner" | "snack"
   - `portion`: "Popis porcie"
   - `verified`: true
   - `source`: "admin"

### Spôsob 3: Import z CSV/Excel

Pre hromadné pridávanie vytvor CSV súbor:

```csv
name,calories,protein,carbs,fats,category,portion
"Kuracie prsia grilované",165,31,0,4,"lunch","100g"
"Ryža basmati",130,3,28,0,"lunch","100g"
```

Potom môžeš vytvoriť import script (príklad v `import_from_csv.py`)

## 💪 Pridávanie nových cvičení

### Manuálne pridanie

1. Otvor `backend/populate_database.py`
2. Pridaj do `EXERCISES_DATABASE`:

```python
{"name": "Zumba", "caloriesPerMinute": 8, "category": "cardio", "intensity": "high", "description": "Tanečný fitness"},
```

3. Spusti script

### Kategórie cvičení

- `cardio` - Kardio cvičenia (beh, bicykel, plávanie)
- `strength` - Posilňovanie (bench press, drepy, zhyby)
- `functional` - Funkčný tréning (burpees, kettlebell)
- `sport` - Športy (futbal, basketbal, tenis)
- `flexibility` - Flexibilita (jóga, strečing, pilates)

### Intenzity

- `low` - Nízka intenzita (2-4 kcal/min)
- `medium` - Stredná intenzita (5-9 kcal/min)
- `high` - Vysoká intenzita (10+ kcal/min)

## 🔗 Verejné API pre jedlá

Ak chceš automaticky načítať jedlá z verejných databáz:

### USDA FoodData Central API

```python
# Príklad volania API
import requests

api_key = "YOUR_API_KEY"
url = f"https://api.nal.usda.gov/fdc/v1/foods/search?query=chicken&api_key={api_key}"

response = requests.get(url)
data = response.json()
```

Registrácia: https://fdc.nal.usda.gov/api-guide.html

### Open Food Facts API

```python
import requests

# Vyhľadanie jedla
url = "https://world.openfoodfacts.org/cgi/search.pl"
params = {
    "search_terms": "chicken breast",
    "search_simple": 1,
    "json": 1
}

response = requests.get(url, params=params)
data = response.json()
```

Dokumentácia: https://world.openfoodfacts.org/data

## 📝 Štruktúra databázy

### Kolekcia: `foods_database`

```javascript
{
  name: "Názov jedla",           // String
  calories: 500,                 // Number
  protein: 30,                   // Number (gramy)
  carbs: 40,                     // Number (gramy)
  fats: 20,                      // Number (gramy)
  category: "lunch",             // String (breakfast/lunch/dinner/snack)
  portion: "100g",               // String (popis porcie)
  verified: true,                // Boolean
  source: "admin",               // String (admin/user/api)
  createdAt: Timestamp           // Timestamp
}
```

### Kolekcia: `exercises_database`

```javascript
{
  name: "Názov cvičenia",        // String
  caloriesPerMinute: 10,         // Number
  category: "cardio",            // String (cardio/strength/functional/sport/flexibility)
  intensity: "high",             // String (low/medium/high)
  description: "Popis",          // String
  verified: true,                // Boolean
  source: "admin",               // String
  createdAt: Timestamp           // Timestamp
}
```

## 🤖 Ako AI používa databázu

1. Používateľ napíše: "Mal som kuracie prsia"
2. AI zavolá: `search_foods("kuracie prsia")`
3. Databáza vráti: `{name: "Kuracie prsia", calories: 165, protein: 31, ...}`
4. AI uloží: `save_food_entry({name: "Kuracie prsia", calories: 165, ...})`
5. Používateľ dostane: "Uložil som Kuracie prsia - 165 kcal podľa databázy ✓"

## 📈 Rozšírenie databázy

Pre produkčné použitie odporúčam:

1. **Integruj USDA API** - 800,000+ jedál
2. **Integruj Open Food Facts** - 2,000,000+ produktov
3. **Vytvor admin panel** - Webové rozhranie na správu databázy
4. **Pridaj user contributions** - Používatelia môžu pridávať vlastné jedlá
5. **Implementuj caching** - Zrýchli vyhľadávanie

## 🔧 Údržba

### Backup databázy

```bash
# Export Firestore databázy
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)
```

### Kontrola integrity

```python
# Skontroluj, či všetky jedlá majú potrebné polia
python check_database_integrity.py
```

### Aktualizácia Security Rules

Nezabudni aktualizovať `firestore.rules` ak zmeníš štruktúru databázy.
