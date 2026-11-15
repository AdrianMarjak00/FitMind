import {
  CoachContext, currentWeight, num, proteinTarget, targetCalories, tdee
} from './context';

/**
 * Znalostná báza trénera. Každá téma má vzor (regex nad textom bez diakritiky)
 * a odpoveď, ktorá sa prispôsobí profilu používateľa.
 */
export interface Topic {
  id: string;
  match: RegExp;
  answer: (ctx: CoachContext) => string;
}

const w = (ctx: CoachContext) => currentWeight(ctx);

export const TOPICS: Topic[] = [
  {
    id: 'injury',
    match: /boli ma|bolest|zranen|zranil|natiahnut|natrhnut|vyvrtnut|opuch|pichanie|zavrat|omdl|tlak na hrudi|zle sa mi dycha/,
    answer: () =>
      '🩺 Bolesť neignoruj. Pri ostrej bolesti, opuchu, závratoch alebo bolesti na hrudi tréning ukonči a obráť sa na lekára – to cez chat posúdiť neviem.\n\n' +
      'Pri bežnom preťažení pomáha:\n  • pár dní odľahčiť boľavé miesto, ale úplne neprestať s pohybom\n  • chladiť prvých 24–48 hodín\n  • vrátiť sa postupne, s nižšou záťažou\n\nAk bolesť trvá dlhšie než týždeň alebo sa zhoršuje, nechaj to vyšetriť.'
  },
  {
    id: 'protein',
    match: /bielkovin|protein(?!ov[ay] tycink)/,
    answer: ctx => {
      const target = proteinTarget(ctx);
      const base = target
        ? `🥩 Pri tvojej váhe ${w(ctx)} kg a cieli ti vychádza približne **${target} g bielkovín denne**.`
        : '🥩 Odporúčaný príjem bielkovín je 1,4–2 g na kg telesnej váhy denne (viac pri chudnutí a naberaní svalov).';
      return base + '\n\nRozdeľ ich do 3–4 jedál po 25–40 g. Dobré zdroje:\n  • kuracie a morčacie mäso, ryby, vajcia\n  • tvaroh, grécky jogurt, cottage, syry\n  • strukoviny, tofu\n  • proteínový nápoj, keď to jedlom nestíhaš\n\nProteínový prášok nie je nutnosť, len pohodlný spôsob, ako cieľ doplniť.';
    }
  },
  {
    id: 'lose',
    match: /schudn|chudn|zhodit|zhadzov|spalit tuk|spalovanie tuk|dieta|dietu|redukci|kalorick\w* deficit/,
    answer: ctx => {
      const target = targetCalories(ctx);
      const maintenance = Math.round(tdee(ctx));
      const tw = num(ctx.profile?.targetWeight);
      const cw = w(ctx);
      const lines = ['🔥 **Chudnutie stojí na miernom kalorickom deficite**, nie na hladovaní.', ''];
      if (maintenance && target) {
        lines.push(`Tvoj udržiavací príjem je približne ${maintenance} kcal, na chudnutie mier na **${Math.min(target, maintenance - 300)} kcal denne**.`);
      } else {
        lines.push('Mier na deficit 300–500 kcal oproti tvojmu udržiavaciemu príjmu.');
      }
      if (tw && cw && cw > tw) {
        const weeks = Math.round((cw - tw) / 0.5);
        lines.push(`Do cieľa ti ostáva ${(cw - tw).toFixed(1)} kg. Pri zdravom tempe 0,5 kg týždenne je to približne ${weeks} týždňov.`);
      }
      lines.push('', 'Čo funguje najlepšie:', '  • dosť bielkovín, aby si nestrácal svaly', '  • silový tréning 2–3× týždenne a veľa chôdze',
        '  • zelenina ku každému jedlu – zasýti za málo kalórií', '  • sladené nápoje a alkohol sú najľahšie ušetrené kalórie', '  • spánok 7+ hodín, inak rastie hlad',
        '', 'Váž sa 2–3× týždenne ráno a sleduj týždenný priemer, nie jednotlivé dni.');
      return lines.join('\n');
    }
  },
  {
    id: 'gain',
    match: /nabrat|naberan|svalov\w* hmot|objem|pribrat|zosilniet|rast svalov|budovan\w* sval/,
    answer: ctx => {
      const maintenance = Math.round(tdee(ctx));
      const protein = proteinTarget(ctx);
      return '💪 **Na rast svalov potrebuješ tri veci:** tréningový podnet, mierny nadbytok kalórií a regeneráciu.\n\n' +
        (maintenance ? `  • jedz približne **${maintenance + 250}–${maintenance + 400} kcal denne** (tvoj udržiavací príjem je okolo ${maintenance} kcal)\n` : '  • jedz o 250–400 kcal viac, než je tvoj udržiavací príjem\n') +
        (protein ? `  • bielkoviny okolo **${protein} g denne**\n` : '  • bielkoviny 1,6–2,2 g na kg váhy\n') +
        '  • každú svalovú partiu trénuj 2× týždenne, 6–12 opakovaní blízko zlyhania\n  • postupne pridávaj váhu alebo opakovania\n  • spi aspoň 7–8 hodín\n\nReálne tempo je 0,25–0,5 kg za týždeň. Ak chceš, napíš „zostav mi tréningový plán“.';
    }
  },
  {
    id: 'water',
    match: /vod[ayu]\b.*(pit|vypit|denne)|kolko (vody|tekutin)|pitny rezim|hydrat|dehydrat/,
    answer: ctx => {
      const kg = w(ctx);
      const liters = kg ? (kg * 0.035).toFixed(1) : null;
      return (liters ? `💧 Pri váhe ${kg} kg ti vychádza približne **${liters} litra tekutín denne**` : '💧 Orientačne potrebuješ 30–40 ml tekutín na kg váhy denne (zvyčajne 2–3 litre)') +
        ', v teple a pri tréningu o 0,5–1 liter viac.\n\n  • začni deň pohárom vody\n  • maj fľašu stále na očiach\n  • svetložltý moč je znak dobrej hydratácie\n\nPočíta sa voda, nesladený čaj aj minerálka. Kávu a alkohol do pitného režimu neráta.';
    }
  },
  {
    id: 'sleep',
    match: /spanok|spanku|spat\b|zaspat|nespavost|nevyspat|unaven|unava|budim sa/,
    answer: () =>
      '😴 **Spánok je polovica výsledku.** Dospelý potrebuje 7–9 hodín; pri nedostatku rastie hlad, klesá výkon aj regenerácia.\n\n  • choď spať a vstávaj v rovnakom čase, aj cez víkend\n  • hodinu pred spaním odlož mobil a stlm svetlo\n  • kofeín naposledy 8 hodín pred spaním\n  • v spálni chladno (17–19 °C) a tma\n  • ťažké jedlo a alkohol večer spánok zhoršujú\n\nSpánok mi môžeš zapisovať, napríklad „spal som 7 hodín“, a budem sledovať tvoj priemer.'
  },
  {
    id: 'stress',
    match: /stres|nervoz|uzkost|panik|vyhoren|napat|pretazen|relax|upokojit|meditaci/,
    answer: () =>
      '🧘 Stres sa dá znížiť aj cez telo:\n\n  • **dýchanie 4-7-8**: nádych 4 s, zadrž 7 s, výdych 8 s, opakuj 4×\n  • 10–20 minút chôdze vonku funguje prekvapivo dobre\n  • pravidelný pohyb znižuje stresové hormóny\n  • dosť spánku – unavená hlava zvláda stres horšie\n  • zapíš si, čo ťa trápi, a jednu vec, ktorú s tým vieš urobiť dnes\n\nAk úzkosť alebo zlá nálada trvá týždne a obmedzuje ťa, porozprávaj sa s psychológom alebo lekárom. Úroveň stresu mi môžeš zapisovať, napr. „stres 6 z 10“.'
  },
  {
    id: 'creatine',
    match: /kreatin/,
    answer: () =>
      '⚡ **Kreatín monohydrát** je najlepšie preskúmaný doplnok na silu a svaly.\n\n  • dávka 3–5 g denne, každý deň, kedykoľvek počas dňa\n  • nasycovacia fáza nie je nutná\n  • účinok príde po 2–4 týždňoch\n  • prvé týždne môžeš pribrať 1–2 kg vody vo svaloch, to je normálne\n  • pi dosť vody\n\nPre zdravých ľudí je bezpečný. Ak máš ochorenie obličiek, poraď sa najprv s lekárom.'
  },
  {
    id: 'supplements',
    match: /suplement|doplnk|doplnok|vitamin|bcaa|spalovac|predtreningov|omega|horcik|magnez/,
    answer: () =>
      '💊 Doplnky sú len bonus k strave, spánku a tréningu. Zmysel majú najmä:\n\n  • **proteínový nápoj** – ak nestíhaš bielkoviny z jedla\n  • **kreatín** – 3–5 g denne pre silu a svaly\n  • **vitamín D** – najmä od jesene do jari\n  • **omega-3** – ak neješ ryby aspoň 2× týždenne\n  • **horčík** – pri kŕčoch a horšom spánku\n\nBCAA ani spaľovače tukov za svoje peniaze veľa neurobia. Pri liekoch alebo zdravotných ťažkostiach sa poraď s lekárom.'
  },
  {
    id: 'belly',
    match: /tuk na bruchu|brusny tuk|schudnut (z|na) bruch|pneumatik|schudnut zo stehien|lokaln/,
    answer: () =>
      '🎯 Tuk sa nedá spáliť cielene na jednom mieste – brušáky ti brucho spevnia, ale tuk z neho neodstránia.\n\nTelo berie tuk z celého tela podľa genetiky, brucho býva často posledné. Funguje len celkový kalorický deficit, dosť bielkovín, silový tréning a trpezlivosť.'
  },
  {
    id: 'cardio-vs-strength',
    match: /kardio (alebo|ci|vs)|(alebo|ci|vs) kardio|silovy alebo|co je lepsie na chudnutie|kolko kardia/,
    answer: () =>
      '🏃 vs 🏋️ Najlepšia je kombinácia:\n\n  • **silový tréning** udrží a buduje svaly, vďaka nim pália viac aj v pokoji\n  • **kardio** spáli kalórie hneď a zlepší kondíciu a srdce\n\nPri chudnutí: 2–3× silový tréning, 2× kardio a čo najviac chôdze. Pri naberaní svalov: 3–5× sila a kardio len ľahko 1–2× týždenne.'
  },
  {
    id: 'evening-carbs',
    match: /sacharidy vecer|jest vecer|po 18|po osemnast|po siestej|vecer nejest|neskoro vecer/,
    answer: () =>
      '🌙 To, že sa po šiestej večer nemá jesť, je mýtus. Rozhoduje celkový denný príjem, nie hodina.\n\nVečera ti neuškodí, ak sa zmestí do tvojho kalorického cieľa. Len ťažké jedlo tesne pred spaním môže zhoršiť spánok – ideálne dojedz 2–3 hodiny pred spaním.'
  },
  {
    id: 'fasting',
    match: /prerusovan\w* post|post\b|hladovk|16 8|16\/8|intermittent|fasting/,
    answer: () =>
      '⏱️ **Prerušovaný pôst** (napr. 16/8) je len spôsob, ako si rozvrhnúť jedlo. Chudne sa pri ňom preto, že ľudia zjedia menej, nie kvôli samotnému oknu.\n\nAk ti vyhovuje jesť v kratšom okne, pokojne ho používaj. Ak ti je z neho zle alebo sa potom prejedáš, nič nestratíš, keď budeš jesť pravidelne. Nie je vhodný v tehotenstve, pri cukrovke na liekoch a pri poruchách príjmu potravy.'
  },
  {
    id: 'sugar',
    match: /sladk|cukor|chut na|chute na|maskrt|prejed|vlci hlad|zraloci hlad/,
    answer: () =>
      '🍫 Chute na sladké najčastejšie spúšťa hlad, únava a stres.\n\n  • jedz pravidelne a v každom jedle maj bielkoviny\n  • vyspi sa – pri nevyspatí rastie chuť na sladké\n  • sladké si nezakazuj úplne, zaraď malú porciu po jedle\n  • vymeň: ovocie, grécky jogurt s medom, horká čokoláda\n  • nedrž doma to, čo nevieš jesť s mierou\n\nJedno prejedenie nič nepokazí, rozhoduje dlhodobý priemer.'
  },
  {
    id: 'alcohol',
    match: /alkohol|pivo a|opica|opity|chlast/,
    answer: () =>
      '🍺 Alkohol má 7 kcal na gram a telo ho spracúva prednostne, takže spaľovanie tukov ide bokom. Zhoršuje aj spánok a regeneráciu.\n\nOrientačne: veľké pivo ~215 kcal, 2 dcl vína ~165 kcal, poldeci tvrdého ~90 kcal.\n\nAk si dáš, zapíš mi to, pi k tomu vodu a v ten deň uber inde. Občasný pohárik pokrok nezničí, pravidelné pitie áno.'
  },
  {
    id: 'soreness',
    match: /svalovic|regenerac|pretren|boli\w* sval|stuhnut/,
    answer: () =>
      '🛌 Svalovica je normálna reakcia na novú záťaž a do 2–4 dní sama odíde.\n\n  • ľahký pohyb (chôdza, bicykel) ju zmierni viac než ležanie\n  • dosť bielkovín a spánku\n  • teplá sprcha alebo sauna, jemný strečing\n  • tú istú partiu trénuj znova až o 48 hodín\n\nPri ďalších tréningoch bude slabšia. Ostrá, bodavá bolesť nie je svalovica – tú nechaj vyšetriť.'
  },
  {
    id: 'motivation',
    match: /motivac|nechce sa mi|nemam chut cvicit|lenivy|leniv|vzdavam|nebavi ma|demotiv|nema to zmysel|nevladzem|nemam silu/,
    answer: ctx => {
      const name = (ctx.profile?.firstName || '').trim();
      return `💚 ${name ? name + ', to' : 'To'} pozná každý, kto niekedy začal. Motivácia kolíše, výsledky robí zvyk.\n\n  • dohodni sa so sebou len na 10 minútach – väčšinou potom pokračuješ\n  • priprav si veci na tréning večer vopred\n  • sleduj, čo už máš za sebou, nie len to, čo chýba\n  • vynechaný deň nevadí, len nevynechaj dva po sebe\n\nNapíš mi, čo ťa dnes brzdí, a nájdeme najmenší krok, ktorý zvládneš.`;
    }
  },
  {
    id: 'plateau',
    match: /stagn|vaha stoji|vaha sa nehybe|nechudnem|plato|plateau|neklesa|zasekl/,
    answer: () =>
      '📉 Stagnácia váhy je bežná. Skôr než čokoľvek zmeníš:\n\n  • sleduj priemer aspoň za 2–3 týždne, voda v tele výkyvy maskuje\n  • poctivo si týždeň zapisuj všetko vrátane nápojov, olejov a „ochutnávok“\n  • s nižšou váhou klesla aj tvoja spotreba – uber ďalších 100–150 kcal alebo pridaj 2–3 tisíc krokov\n  • meraj aj pás, nielen váhu\n  • po dlhom deficite pomôže 1–2 týždne na udržiavacom príjme'
  },
  {
    id: 'breakfast',
    match: /ranajk\w* (treba|su dolezit|vynechat|musim)|vynechavat ranajky|nejest ranajky/,
    answer: () =>
      '🍳 Raňajky nie sú povinné. Dôležitý je celkový denný príjem a to, čo ti vyhovuje.\n\nAk si ráno hladný alebo ráno trénuješ, daj si raňajky s bielkovinami (vajcia, tvaroh, jogurt, ovsená kaša). Ak hlad nemáš a potom sa neprejedáš, pokojne začni neskôr.'
  },
  {
    id: 'frequency',
    match: /kolkokrat\w* (tyzdenne |do tyzdna )?(cvicit|trenovat|behat)|ako casto (cvicit|trenovat|behat)|kolko krat .*(cvicit|trenovat)/,
    answer: () =>
      '📅 Začiatočníkovi stačia 3 tréningy celého tela týždenne. Pokročilejší zvládnu 4–5 tréningov s rozdelením partií.\n\n  • každú svalovú partiu trénuj 2× týždenne\n  • medzi ťažkými tréningami tej istej partie nechaj 48 hodín\n  • aspoň 1–2 dni v týždni oddychuj\n  • minimum pre zdravie je 150 minút mierneho pohybu týždenne'
  },
  {
    id: 'warmup',
    match: /rozcvick|zahriat|strecing|strecov|natahova/,
    answer: () =>
      '🤸 Pred tréningom 5–10 minút: ľahké kardio a dynamické pohyby (krúženie, výpady, drepy bez záťaže) a pred ťažkými cvikmi 1–2 ľahšie série.\n\nStatický strečing (výdrže 20–30 s) si nechaj až na koniec tréningu alebo na samostatnú chvíľu, pred silovým výkonom ho nepotrebuješ.'
  },
  {
    id: 'fats',
    match: /zdrave tuky|tuky v strave|kolko tukov|nasyten|omega/,
    answer: ctx => {
      const kg = w(ctx);
      return '🥑 Tuky potrebuješ pre hormóny a vstrebávanie vitamínov – ' +
        (kg ? `pri tvojej váhe aspoň **${Math.round(kg * 0.8)} g denne**.` : 'aspoň 0,8 g na kg váhy denne.') +
        '\n\nUprednostni olivový olej, orechy, avokádo, ryby a vajcia. Obmedz vyprážané jedlá, údeniny a priemyselné pečivo.';
    }
  },
  {
    id: 'carbs',
    match: /sacharid|cukry|low carb|keto|ketodiet|bez prilohy/,
    answer: () =>
      '🍚 Sacharidy nie sú nepriateľ – sú hlavným palivom pre tréning a mozog. Priberá sa z nadbytku kalórií, nie z ryže.\n\nSiahaj po zemiakoch, ryži, ovsených vločkách, celozrnnom pečive, strukovinách a ovocí. Keto a low-carb fungujú len preto, že pri nich ľudia zjedia menej; ak ti vyhovujú, sú v poriadku, no nutné nie sú.'
  },
  {
    id: 'fiber',
    match: /vlaknin|zapch|traven/,
    answer: () =>
      '🥦 Vlákniny potrebuješ okolo 25–35 g denne – zasýti, pomáha tráveniu a drží stabilnú hladinu cukru.\n\nNajviac jej je v strukovinách, celozrnných obilninách, zelenine, ovocí, orechoch a semienkach. Pridávaj ju postupne a pi k tomu dosť vody.'
  }
];

export function findTopic(text: string): Topic | null {
  return TOPICS.find(t => t.match.test(text)) || null;
}

export const CAPABILITIES =
  '🤖 Som FitMind AI – tvoj tréner, ktorý beží priamo v tvojom zariadení.\n\n**Zapíšem ti do denníka**\n' +
  '  • jedlo a nápoje: „na raňajky som mal 2 vajcia a chlieb“\n  • pohyb: „bol som behať 30 minút“\n  • váhu, spánok, náladu a stres: „vážim 82 kg“, „spal som 7 hodín“\n\n**Poradím ti**\n' +
  '  • „koľko mi dnes ostáva kalórií?“\n  • „čo si mám dať na večeru?“\n  • „zostav mi tréningový plán“ alebo „jedálniček“\n  • „ako sa mi darilo tento týždeň?“\n  • „koľko kalórií má banán?“\n\nA odpoviem aj na otázky o chudnutí, svaloch, spánku či doplnkoch.';
