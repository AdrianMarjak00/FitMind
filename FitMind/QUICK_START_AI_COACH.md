# 🚀 Quick Start - FitMind AI Coach

## ⚡ 5 Minút do Osobného Trénera

### 1️⃣ Spustite Backend (1 min)

```bash
cd backend
python main.py
```

Uistite sa, že máte v `backend/.env`:
```bash
OPENAI_API_KEY=sk-your-api-key-here
```

✅ Keď vidíte: `[START] Spustam FitMind Backend na porte 8000`

### 2️⃣ Spustite Frontend (1 min)

V novom termináli:
```bash
npm start
```

✅ Keď vidíte: `** Angular Live Development Server is listening on localhost:4200`

### 3️⃣ Prihláste Sa (1 min)

1. Otvorte `http://localhost:4200`
2. Kliknite na **Prihlásenie** alebo **Registrácia**
3. Zadajte email a heslo

### 4️⃣ Nastavte Profil (2 min)

Po prvom prihlásení:
1. Choďte do **Profil** alebo **Nastavenia**
2. Vyplňte:
   - ✅ Meno, vek, výška
   - ✅ **Ciele** (napr. "schudnúť 5kg", "získať svalovú hmotu")
   - ✅ **Problémy** (napr. "málo energie", "vysoký stres")
   - ✅ **Čo pomáha** (napr. "ranná joga", "meditácia")
   - ✅ **Cieľová váha** (napr. 75 kg)
   - ✅ **Denný kalorický cieľ** (napr. 2000 kcal)

### 5️⃣ Začnite Chatovať! (∞)

Choďte do **AI Chat** a skúste:

```
Ty: "Ahoj! Som pripravený začať."

AI: "Ahoj [Vaše meno]! Vitaj! Som tvoj osobný fitness tréner.
     Povedz mi, čo si dnes jedol alebo ako si cvičil?"

Ty: "Zjedol som raňajky: ovsenú kašu s banánom, asi 350 kcal"

AI: "Super raňajky! 🥣 Uložil som to (350 kcal).
     Ovos je výborný zdroj energie pre celý deň.
     Dnes máš cieľ 2000 kcal, už máš 350.
     Plánuješ dnes cvičiť? 💪"

Ty: "Áno, chcem ísť behať"

AI: "Skvelé! Koľko minút plánuješ behať?
     Pre chudnutie odporúčam aspoň 30-40 minút."
```

---

## 💡 Príklady Čo Môžete Povedať

### Jedlo
- "Zjedol som obed: kura s ryžou, 500 kcal"
- "Večera: steak s hranolkami, 700 kcal, 40g proteínu"
- "Snack: jablko, 80 kcal"

### Cvičenie
- "30 minút behu, vysoká intenzita"
- "60 minút posilňovanie, stredná intenzita"
- "Cvičil som 45 minút, zápasenie"

### Nálada & Stres
- "Cítim sa dobre, nálada 4/5"
- "Stres z práce, úroveň 8/10"
- "Som unavený, nálada 2/5"

### Spánok & Váha
- "Spal som 7 hodín, dobrá kvalita"
- "Dnes vážim 77.5 kg"

### Otázky
- "Ako sa mi darí s mojimi cieľmi?"
- "Čo by som mal jesť na chudnutie?"
- "Aký tréning odporúčaš?"
- "Prečo som unavený?"

---

## 📊 Sledujte Pokrok

Kliknite na **"📊 Moje pokroky"** v AI Chat pre zobrazenie:

### 📅 Tento týždeň
- Súhrn kalórií, cvičenia, spánku
- 🏆 Úspechy
- ⚠️ Oblasti na zlepšenie
- 💡 Odporúčania

### 💡 Odporúčania
- Top 5 personalizovaných rád
- Šité na mieru vašim cieľom

### 🎯 Moje ciele
- Pokrok k cieľovej váhe
- Plnenie kalorického cieľa
- Vizuálne progress bary

---

## 🎯 Tipy Pre Najlepšie Výsledky

1. **Buďte konzistentný** - Zaznamenávajte jedlo a cvičenie denne
2. **Buďte úprimný** - AI potrebuje správne dáta pre presné rady
3. **Buďte aktívny** - Chatujte s AI pravidelne, aspoň raz denne
4. **Nastavte realistické ciele** - Nie "schudnúť 10kg za týždeň"
5. **Sledujte reporty** - Každý týždeň pozrite si týždenný report

---

## 🆘 Pomoc

### Backend nebeží?
```bash
# Skontrolujte port
curl http://localhost:8000/

# Ak je chyba, reštartujte
cd backend
python main.py
```

### AI neodpovedá?
1. Skontrolujte `OPENAI_API_KEY` v `backend/.env`
2. Pozrite `backend/logs/error.log`
3. Reštartujte backend

### Dáta sa neukladajú?
1. Skontrolujte Firebase pripojenie
2. Overte `firebase-service-account.json`
3. Pozrite browser console (F12)

---

## 📚 Ďalšie Zdroje

- 📖 [Úplný AI Coach Guide](AI_COACH_GUIDE.md)
- 📡 [API Dokumentácia](backend/API_DOCUMENTATION.md)
- 📋 [Changelog](CHANGELOG.md)
- 🏠 [README](README.md)

---

**Začnite svoju fitness cestu už dnes! 💪🚀**

