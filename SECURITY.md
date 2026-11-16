# Bezpečnosť

Ak nájdeš bezpečnostnú chybu (napríklad spôsob, ako čítať cudzie dáta alebo obísť pravidlá v `FitMind/firestore.rules`), **nezverejňuj ju v Issues**.

Nahlás ju súkromne cez GitHub: záložka **Security → Report a vulnerability** v tomto repozitári.

Uveď, čo si našiel, ako to zopakovať a aký to má dopad. Ozvem sa čo najskôr a po oprave ťa rád uvediem v poznámkach k vydaniu.

## Čo je dobré vedieť

- Kľúč `apiKey` v `FitMind/src/app/app.config.ts` je verejný identifikátor Firebase projektu, nie tajomstvo. Dáta chránia Firebase Authentication a pravidlá Firestore.
- Aplikácia nemá vlastný server. AI tréner beží v prehliadači a správy z chatu neposiela žiadnej tretej strane.
