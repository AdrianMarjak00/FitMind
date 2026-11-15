# FitMind

AI fitness tréner, denník jedla a pohybu. Angular 20 + Firebase (Auth, Firestore, Hosting).

Aplikácia beží **bez vlastného servera a bez platených API**:

- **Hosting** – statický build na Firebase Hosting (bezplatný plán Spark).
- **Databáza** – Firestore, appka do nej číta a zapisuje priamo z prehliadača; prístup strážia `FitMind/firestore.rules`.
- **AI tréner** – vlastný engine v TypeScripte (`FitMind/src/app/ai/`), ktorý beží v zariadení používateľa.
- **Voliteľný LLM** – jazykový model cez WebLLM/WebGPU, tiež v zariadení (stiahne sa raz, ~1,5 GB).
- **PWA** – appka sa dá nainštalovať na Windows, Android aj iOS.

## Vývoj

```bash
cd FitMind
npm install
npm start
```

Appka beží na `http://localhost:4200/`.

## Nasadenie

Push do vetvy `main` spustí GitHub Action (`.github/workflows/deploy.yml`), ktorá appku zostaví a nasadí na Firebase Hosting.

Bezpečnostné pravidlá databázy sa nasadzujú ručne po každej zmene `firestore.rules`:

```bash
cd FitMind
firebase deploy --only firestore:rules
```

## Štruktúra AI enginu (`FitMind/src/app/ai/`)

| Súbor | Čo robí |
| --- | --- |
| `engine.ts` | Rozpozná zámer správy, vytiahne z nej záznamy a zloží odpoveď |
| `food-db.ts`, `exercise-db.ts` | Databáza jedál (kcal a makrá na 100 g) a aktivít (MET) |
| `knowledge.ts` | Znalostná báza – odpovede na otázky o chudnutí, svaloch, spánku… |
| `planner.ts` | Tréningové plány a návrhy jedál podľa profilu |
| `coach.ts` | Týždenný report, odporúčania, pokrok k cieľom |
| `context.ts`, `text.ts` | Výpočty (BMR, ciele) a práca so slovenským textom |

Engine je čistý TypeScript bez závislosti na prehliadači, takže sa dá použiť aj v natívnych appkách (Capacitor).

## Platby

Stripe je vypnutý (`paymentsEnabled: false` v `FitMind/src/environments/`), všetky funkcie sú odomknuté.
Pôvodný Python backend so Stripe integráciou ostal v `FitMind/backend/` ako archív – appka ho nepoužíva.
