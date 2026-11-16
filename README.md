# FitMind

**FitMind** je open-source fitness a wellness aplikácia v slovenčine: denník jedla a pohybu, štatistiky, tréningové plány, jedálničky a AI tréner, ktorý beží priamo v zariadení používateľa.

[![CI](https://github.com/AdrianMarjak00/FitMind/actions/workflows/ci.yml/badge.svg)](https://github.com/AdrianMarjak00/FitMind/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Živá verzia: [fitmind-dba6a.web.app](https://fitmind-dba6a.web.app) · [Ako prispieť](CONTRIBUTING.md)

> **In English:** FitMind is an open-source fitness app for Slovak speakers: a food and exercise diary, charts, workout plans, meal plans and an AI coach. The coach is a rule-based natural-language engine written in plain TypeScript. It runs on the user's device, needs no server and no LLM API, and understands Slovak sentences such as "na obed som mal veľký tanier guláša" (I had a big plate of goulash for lunch). The engine and its Slovak food database (about 190 foods) can be reused outside this app.

## Čo vie

- **AI tréner v chate** – napíšeš „na obed som mal veľký tanier guláša s knedľou“ alebo „bol som behať 30 minút“ a zapíše to do denníka. Jedlo odhadne z opisu, netreba nič vážiť.
- **Jedálničky na mieru** – denný aj týždenný plán prepočítaný na tvoj kalorický cieľ, s gramážami, diétnymi filtrami a nákupným zoznamom.
- **Tréningové plány** – týždenný rozpis podľa cieľa a úrovne aktivity.
- **Tabuľky a grafy** – kalórie, makrá, pohyb, váha, spánok, nálada a stres.
- **Týždenný report** – čo sa podarilo, na čom popracovať, pokrok k cieľom.
- **Inštalovateľná appka (PWA)** – funguje na Windows, Androide aj iOS.

## Ako je postavená

Aplikácia nepotrebuje vlastný server ani platené API.

| Časť | Riešenie |
| --- | --- |
| Frontend | Angular 20, Angular Material, ECharts |
| Prihlásenie | Firebase Authentication |
| Databáza | Firestore – appka číta a zapisuje priamo, prístup strážia `FitMind/firestore.rules` |
| Hosting | Firebase Hosting (statický build) |
| AI tréner | vlastný engine v TypeScripte (`FitMind/src/app/ai/`), beží v prehliadači |
| Voliteľný LLM | jazykový model cez WebLLM/WebGPU, tiež v zariadení |

### AI engine (`FitMind/src/app/ai/`)

| Súbor | Čo robí |
| --- | --- |
| `engine.ts` | Rozpozná zámer správy, vytiahne z nej záznamy a zloží odpoveď |
| `food-db.ts`, `exercise-db.ts` | Databáza jedál (kcal a makrá na 100 g) a aktivít (MET) |
| `meal-planner.ts` | Jedálničky z receptov, porcie podľa kalorického cieľa, nákupný zoznam |
| `planner.ts` | Tréningové plány podľa profilu |
| `knowledge.ts` | Odpovede na otázky o chudnutí, svaloch, spánku, doplnkoch… |
| `coach.ts` | Týždenný report, odporúčania, pokrok k cieľom |
| `context.ts`, `text.ts` | Výpočty (BMR, ciele) a práca so slovenským textom |

Engine je čistý TypeScript bez závislosti na prehliadači, takže sa dá použiť aj v natívnych appkách.

### Použitie enginu mimo aplikácie

Priečinok `FitMind/src/app/ai/` si môžeš skopírovať do vlastného projektu (Node, React Native, Capacitor…). Engine je funkcia: dostane správu a kontext používateľa, vráti text odpovede a zoznam záznamov na uloženie. Sám nič neukladá.

```ts
import { respond } from './ai/engine';

const result = respond('na raňajky som mal 2 vajcia a chlieb s maslom', {
  now: new Date(),
  profile: { currentWeight: 80, height: 180, age: 30, gender: 'male', fitnessGoal: 'maintain' },
  entries: { food: [], exercise: [], weight: [], mood: [], sleep: [], stress: [] }
});

result.text;     // odpoveď pre používateľa
result.actions;  // [{ kind: 'save', type: 'food', data: { name: 'Vajce (110 g)', calories: 157, … } }, …]
```

## Testy

```bash
cd FitMind
npm test
```

Testy v `FitMind/tests/ai/` overujú porozumenie slovenským vetám, odhad porcií, jedálničky a tréningové plány. Bežia v Node bez prehliadača.

## Spustenie

Potrebuješ Node.js 22.

```bash
cd FitMind
npm install
npm start
```

Appka beží na `http://localhost:4200/`. Používa Firebase projekt nastavený v `FitMind/src/app/app.config.ts`; pre vlastnú inštanciu tam vlož konfiguráciu svojho projektu a nasaď pravidlá databázy.

## Nasadenie

Push do vetvy `main` spustí GitHub Action (`.github/workflows/deploy.yml`), ktorá appku zostaví a nasadí na Firebase Hosting.

Pravidlá databázy sa nasadzujú zvlášť po každej zmene `firestore.rules`:

```bash
cd FitMind
firebase deploy --only firestore:rules
```

## Platby

Stripe je vypnutý (`paymentsEnabled: false` v `FitMind/src/environments/`), všetky funkcie sú odomknuté.
Pôvodný Python backend so Stripe integráciou ostal v `FitMind/backend/` ako archív – appka ho nepoužíva.

## Prispievanie

Chyby a nápady hlás cez Issues, zmeny posielaj ako pull request. Najľahšie sa prispieva do databázy jedál (`food-db.ts`) a receptov (`meal-planner.ts`) – postup je v [CONTRIBUTING.md](CONTRIBUTING.md). Platia [pravidlá správania](CODE_OF_CONDUCT.md), bezpečnostné chyby hlás podľa [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE) © 2026 Adrian Marjak
