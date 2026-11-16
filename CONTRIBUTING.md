# Ako prispieť

Ďakujem, že chceš FitMind vylepšiť. Vítané sú opravy chýb, nové jedlá a recepty, preklady aj väčšie funkcie.

## Rýchly štart

```bash
git clone https://github.com/AdrianMarjak00/FitMind.git
cd FitMind/FitMind
npm install
npm test
npm start
```

Appka beží na `http://localhost:4200/`. Testy AI enginu nepotrebujú prehliadač ani Firebase a zbehnú do sekundy.

## Najľahšie príspevky

### Pridať jedlo alebo nápoj

Súbor `FitMind/src/app/ai/food-db.ts`. Jeden riadok = jedno jedlo:

```ts
f('Langoš', 'langos|langose', 300, 7, 38, 13, 180, { pc: 180 }),
//  názov     aliasy          kcal B  S   T   porcia  voľby
```

- Hodnoty sú na 100 g (pri nápojoch na 100 ml).
- Aliasy píš malými písmenami **bez diakritiky**, oddelené `|`. Pády rieši stemmer, stačí základný tvar a tvary, ktoré sa od neho líšia kmeňom.
- `porcia` je bežná porcia v gramoch. Voľby: `pc` hmotnosť kusu, `sl` hmotnosť plátku, `sd` množstvo ako príloha, `d: true` pre nápoj.

### Pridať aktivitu

Súbor `FitMind/src/app/ai/exercise-db.ts` – názov, aliasy, hodnota MET a predvolené trvanie.

### Pridať recept do jedálničkov

Súbor `FitMind/src/app/ai/meal-planner.ts`, pole `RECIPES`. Recept je zoznam surovín z databázy jedál s gramážou; kalórie sa dopočítajú samy. Test `only uses ingredients that exist in the food database` ťa upozorní na preklep v názve suroviny.

### Naučiť trénera novú vetu

Ak AI nerozumie niečomu, čo by mala, pridaj najprv test do `FitMind/tests/ai/engine.test.ts` s danou vetou a potom uprav `engine.ts`, aby prešiel.

## Pravidlá pre pull requesty

- Jeden pull request = jedna vec.
- `npm test` a `npx ng build` musia prejsť (kontroluje to aj CI).
- Zmeny v AI engine potrebujú test.
- Priečinok `FitMind/src/app/ai/` nesmie závisieť od Angularu ani prehliadača – má sa dať použiť aj v natívnych appkách.
- Texty pre používateľa píš po slovensky, v tykaní.

## Hlásenie chýb

Použi šablóny v Issues. Pri chybe v chate vždy priložiť presnú správu, ktorú si napísal – bez nej sa chyba ťažko hľadá.

## Licencia

Odoslaním príspevku súhlasíš, že bude zverejnený pod licenciou [MIT](LICENSE).
