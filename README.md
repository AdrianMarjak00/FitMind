# FitMind

**FitMind** je open-source fitness a wellness aplikácia v slovenčine: denník jedla a pohybu, štatistiky, tréningové plány, jedálničky a AI tréner, ktorý beží priamo v zariadení používateľa.

Web: [fit-mind.sk](https://fit-mind.sk) · Licencia: [MIT](LICENSE)

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

Chyby a nápady hlás cez Issues, zmeny posielaj ako pull request. Najľahšie sa prispieva do databázy jedál (`food-db.ts`) a receptov (`meal-planner.ts`).

## Licencia

[MIT](LICENSE) © 2026 Adrian Marjak
