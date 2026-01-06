# 📊 Dashboard - Používateľská príručka

## 🎯 Prehľad

Dashboard je centrálne miesto pre sledovanie a zadávanie fitness dát. Navrhnutý s dôrazom na:
- **Efektivitu** - Všetko na dosah
- **Prehľadnosť** - Jasná vizualizácia
- **Jednoduchosť** - Intuitívne ovládanie

---

## 📐 Rozloženie obrazovky

### Desktop (1200px+)
```
┌──────────────────────────────────────────────────────────┐
│                    HEADER (Profile Info)                  │
├──────────────┬───────────────────────────────────────────┤
│   ĽAVÝ       │          PRAVÝ PANEL                      │
│   PANEL      │          (Grafy)                          │
│   (Formulár) │                                           │
│   sticky     │          Grid 2x3                         │
│   350px      │                                           │
└──────────────┴───────────────────────────────────────────┘
```

### Mobile (< 1200px)
```
┌────────────────┐
│    HEADER      │
├────────────────┤
│   FORMULÁR     │
│   (plná šírka) │
├────────────────┤
│    GRAFY       │
│   (1 stĺpec)   │
└────────────────┘
```

---

## 🎨 Sekcie Dashboardu

### 1️⃣ **Header - Quick Stats**

**Zobrazuje:**
- 👋 Personalizované privítanie
- ⚖️ Aktuálna váha
- 🎯 Cieľová váha
- 📏 BMI (automatický výpočet)

**Účel:**
Rýchly prehľad najdôležitejších metrik bez scrollovania.

---

### 2️⃣ **Ľavý Panel - Vstupné formuláre**

#### **Tab Navigácia:**
| Tab | Icon | Účel |
|-----|------|------|
| Kalórie | 🍽️ | Zaznamenať jedlo a kalórie |
| Cvičenie | 💪 | Zaznamenať tréning |
| Váha | ⚖️ | Aktualizovať váhu |
| Nálada | 😊 | Zaznamenať psychický stav |
| Spánok | 😴 | Zaznamenať kvalitu spánku |
| Stres | 😰 | Zaznamenať úroveň stresu |

#### **Vlastnosti:**
✅ **Sticky positioning** - Vždy viditeľný pri scrollovaní
✅ **Tab-based** - Len jeden formulár naraz (prehľadnosť)
✅ **Validácia** - Povinné polia označené
✅ **Okamžité uloženie** - Jeden klik → Firebase

---

### 3️⃣ **Pravý Panel - Grafy (Grid 2x3)**

#### **Graf 1: Kalórie (Pie Chart)**
- **Typ:** Koláčový graf
- **Dáta:** Rozdelenie kalórií podľa typu jedla
- **Časové obdobie:** Posledných 7 dní
- **Insight:** Vidíš, či je strava vyvážená

#### **Graf 2: Cvičenie (Pie Chart)**
- **Typ:** Koláčový graf  
- **Dáta:** Rozdelenie podľa typu cvičenia
- **Časové obdobie:** Posledných 7 dní
- **Insight:** Aký typ aktivity dominuje

#### **Graf 3: Váha (Line Chart)**
- **Typ:** Čiarový graf s area fill
- **Dáta:** Trend váhy v čase
- **Časové obdobie:** Posledných 90 dní
- **Insight:** Progres k cieľu

#### **Graf 4: Nálada (Line Chart)**
- **Typ:** Čiarový graf
- **Dáta:** Skóre nálady (1-10)
- **Časové obdobie:** Posledných 30 dní
- **Insight:** Psychická pohoda v čase

#### **Graf 5: Spánok (Bar Chart)**
- **Typ:** Stĺpcový graf
- **Dáta:** Počet dní podľa kvality spánku
- **Časové obdobie:** Posledných 7 dní
- **Insight:** Celková kvalita odpočinku

#### **Graf 6: Stres (Line Chart)**
- **Typ:** Čiarový graf
- **Dáta:** Úroveň stresu (1-10)
- **Časové obdobie:** Posledných 30 dní
- **Insight:** Identifikácia stresových období

---

## 🔄 Workflow

### **Typický denný postup:**

```
1. Prihlásenie
   ↓
2. Dashboard sa načíta
   ↓
3. Vidíš quick stats (váha, BMI, cieľ)
   ↓
4. V ľavom paneli vyber tab (napr. Kalórie)
   ↓
5. Vyplň formulár
   ↓
6. Klikni "Pridať záznam"
   ↓
7. ✅ Záznam uložený do Firebase
   ↓
8. 📊 Grafy sa automaticky aktualizujú
   ↓
9. Opakuj pre ďalšie typy záznamov
```

---

## 📝 Ako pridať záznamy

### **🍽️ Kalórie**

**Kroky:**
1. Vyber tab "Kalórie"
2. Vyber typ jedla (raňajky, obed, večera, desiata)
3. Napíš čo si jedol (napr. "2 vajíčka, toast, avokádo")
4. Zadaj počet kalórií
5. Klikni "Pridať záznam"

**Príklad:**
```
Typ: Raňajky
Jedlo: Ovsená kaša s banánom a medom
Kalórie: 350
```

---

### **💪 Cvičenie**

**Kroky:**
1. Vyber tab "Cvičenie"
2. Vyber typ (kardio, posilňovanie, strečing, šport)
3. Zadaj trvanie v minútach
4. Vyber intenzitu (nízka, stredná, vysoká)
5. Klikni "Pridať cvičenie"

**Príklad:**
```
Typ: Kardio
Trvanie: 30 minút
Intenzita: Vysoká
```

---

### **⚖️ Váha**

**Kroky:**
1. Vyber tab "Váha"
2. Zadaj aktuálnu váhu v kg
3. Klikni "Zaznamenať váhu"

**Tip:** Váž sa ráno na lačno pre konzistentné výsledky.

---

### **😊 Nálada**

**Kroky:**
1. Vyber tab "Nálada"
2. Označ ako sa cítiš (1 = veľmi zle, 10 = výborne)
3. Voliteľne pridaj poznámku
4. Klikni "Zaznamenať náladu"

---

### **😴 Spánok**

**Kroky:**
1. Vyber tab "Spánok"
2. Zadaj počet hodín (napr. 7.5)
3. Vyber kvalitu (slabá, priemerná, dobrá, výborná)
4. Klikni "Zaznamenať spánok"

---

### **😰 Stres**

**Kroky:**
1. Vyber tab "Stres"
2. Označ úroveň stresu (1 = žiadny, 10 = extrémny)
3. Voliteľne napíš čo spôsobilo stres
4. Klikni "Zaznamenať stres"

---

## 📊 Interpretácia grafov

### **Pie Charts (Kalórie, Cvičenie)**
- **Čo ukazujú:** Percentuálne rozdelenie
- **Ako čítať:** Väčší segment = viac zastúpené
- **Ideál:** Vyvážené rozdelenie

### **Line Charts (Váha, Nálada, Stres)**
- **Čo ukazujú:** Trend v čase
- **Ako čítať:** 
  - ↗️ Stúpajúca línia = zvyšovanie
  - ↘️ Klesajúca línia = znižovanie
  - ➡️ Rovná línia = stabilita
- **Ideál:** Váha smerom k cieľu, nálada hore, stres dole

### **Bar Charts (Spánok)**
- **Čo ukazujú:** Počet dní v každej kategórii
- **Ako čítať:** Vyššie stĺpce = viac dní
- **Ideál:** Väčšina dní v kategórii "dobrá" alebo "výborná"

---

## 💡 Tips & Tricks

### **Efektívne používanie:**

1. **Konzistentnosť**
   - Zadávaj dáta v rovnakom čase každý deň
   - Váha: ráno na lačno
   - Spánok: hneď po prebudení

2. **Presnosť**
   - Kalórie: Použi aplikáciu na počítanie kalórií
   - Váha: Použi rovnakú váhu vždy

3. **Pravidelnosť**
   - Minimálne raz denne
   - Všetky typy záznamov aspoň 3x týždenne

4. **Analýza**
   - Sleduj trendy, nie jednotlivé dni
   - Hľadaj vzťahy (napr. cvičenie vs. nálada)
   - Identifikuj vzory (napr. stres vs. spánok)

---

## 🎯 Ciele a Motivácia

### **Sleduj progres:**

**Týždenný prehľad:**
- Porovnaj váhu z tohto týždňa vs. minulý týždeň
- Spočítaj dni s cvičením
- Vyhodnoť priemernú náladu

**Mesačný prehľad:**
- Celkový progres k cieľu váhy
- Najlepší a najhorší týždeň
- Identifikuj zlepšenia

---

## 📱 Responzivita

### **Desktop (optimálne)**
- 2 panely vedľa seba
- Všetko viditeľné na jeden pohľad
- Sticky formulár

### **Tablet (1200px - 768px)**
- Formulár nad grafmi
- 2 grafy vedľa seba

### **Mobile (< 768px)**
- 1 stĺpec layout
- Tabs v 2 stĺpcoch
- Grafy pod sebou

---

## 🚀 Best Practices

### **Pre najlepšie výsledky:**

✅ **Pravidelnosť** - Zadávaj dáta denne
✅ **Presnosť** - Buď čo najpresnejší
✅ **Kompletnosť** - Vyplňuj všetky typy záznamov
✅ **Analýza** - Pravidelne kontroluj grafy
✅ **Akcia** - Reaguj na trendy

---

## 🎉 Záver

Dashboard je navrhnutý tak, aby:
- Minimalizoval čas potrebný na zadanie dát
- Maximalizoval prehľadnosť
- Poskytoval okamžitý feedback
- Motivoval k dosiahnutiu cieľov

**Používaj ho denne a uvidíš progres! 💪**

