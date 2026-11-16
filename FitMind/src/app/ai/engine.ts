import { ACTIVITIES, ActivityItem } from './exercise-db';
import { FOODS, FoodItem } from './food-db';
import { CAPABILITIES, findTopic } from './knowledge';
import { MUSCLE_EXERCISES, buildWorkoutPlan, workoutPlanText } from './planner';
import {
  MEAL_SK_ACC, MealType, dayPlanText, ingredientText, parseMenuOptions, shoppingListText,
  suggestMeals, weekPlanText, weekSeed
} from './meal-planner';
import { weeklyReportText } from './coach';
import {
  CoachContext, CustomFood, EntryType, bmi, bmiLabel, bmr, currentWeight, dayTotals, firstName,
  num, proteinTarget, sortByTime, targetCalories, tdee
} from './context';
import { norm, parseNumber, pick, round, stem, tokens } from './text';

/**
 * FitMind AI engine – vlastný „mozog“ trénera bez externého API.
 *
 * Zo slovenskej vety rozpozná, čo používateľ chce (zapísať jedlo, pohyb,
 * váhu…, opýtať sa na svoje dáta, dostať plán alebo radu) a zloží odpoveď
 * z jeho profilu a denníka. Je to čistá funkcia: nič neukladá, len vráti
 * text a zoznam akcií, ktoré má aplikácia vykonať.
 */

export type EngineAction =
  | { kind: 'save'; type: EntryType; data: any; label: string }
  | { kind: 'undo' }
  /** Zapamätaj si nové jedlo, aby ho tréner nabudúce poznal. */
  | { kind: 'learn'; food: CustomFood };

export interface EngineResult {
  text: string;
  actions: EngineAction[];
  intent: string;
  /** Engine otázke nerozumel – môže ju prevziať voliteľný LLM. */
  fallback?: boolean;
  /** Neznáme jedlo, na ktorého kalórie sa tréner práve opýtal. */
  pending?: { name: string; count: number };
}

// ------------------------------------------------------------
// Indexy aliasov
// ------------------------------------------------------------

interface AliasEntry<T> { stems: string[]; item: T; }
interface Tok { t: string; s: string; i: number; }

function buildIndex<T extends { aliases: string[] }>(items: T[]): Map<string, AliasEntry<T>[]> {
  const map = new Map<string, AliasEntry<T>[]>();
  for (const item of items) {
    for (const alias of item.aliases) {
      const stems = tokens(norm(alias)).map(stem);
      if (!stems.length) continue;
      const list = map.get(stems[0]) || [];
      list.push({ stems, item });
      map.set(stems[0], list);
    }
  }
  map.forEach(list => list.sort((x, y) => y.stems.length - x.stems.length));
  return map;
}

const FOOD_INDEX = buildIndex(FOODS);
const ACTIVITY_INDEX = buildIndex(ACTIVITIES);

function tokenize(text: string): Tok[] {
  const out: Tok[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ t: m[0], s: stem(m[0]), i: m.index });
  return out;
}

function matchAt<T>(index: Map<string, AliasEntry<T>[]>, toks: Tok[], i: number): AliasEntry<T> | null {
  const list = index.get(toks[i].s);
  if (!list) return null;
  for (const entry of list) {
    if (i + entry.stems.length <= toks.length && entry.stems.every((s, k) => toks[i + k].s === s)) {
      return entry;
    }
  }
  return null;
}

function blank(text: string, start: number, length: number): string {
  return text.slice(0, start) + ' '.repeat(length) + text.slice(start + length);
}

// ------------------------------------------------------------
// Jednotky
// ------------------------------------------------------------

type Unit =
  | { kind: 'amount'; value: number }   // gramy / mililitre
  | { kind: 'piece' } | { kind: 'slice' } | { kind: 'bit' } | { kind: 'portion' };

const UNITS = new Map<string, Unit>();
function unit(words: string, u: Unit): void {
  words.split('|').forEach(word => UNITS.set(stem(word), u));
}
unit('g|gram|gramy|gramov', { kind: 'amount', value: 1 });
unit('dkg|dag|deka', { kind: 'amount', value: 10 });
unit('kg|kilo|kila', { kind: 'amount', value: 1000 });
unit('ml|mililitrov', { kind: 'amount', value: 1 });
unit('cl', { kind: 'amount', value: 10 });
unit('dl|dcl|deci|decak', { kind: 'amount', value: 100 });
unit('l|liter|litra|litre|litrov', { kind: 'amount', value: 1000 });
unit('lyzica|lyzice|lyzic|pl', { kind: 'amount', value: 15 });
unit('lyzicka|lyzicky|lyziciek', { kind: 'amount', value: 5 });
unit('hrst|hrste', { kind: 'amount', value: 30 });
unit('kocka|kocky|kociek|stvorcek|stvorceky', { kind: 'amount', value: 8 });
unit('riadok|riadky|riadkov', { kind: 'amount', value: 25 });
unit('pohar|pohare|poharov|salka|salky|hrncek|sklenica|sklenicu', { kind: 'amount', value: 250 });
unit('flasa|flasu|flase|krigel|krigle', { kind: 'amount', value: 500 });
unit('plechovka|plechovku|plechovky', { kind: 'amount', value: 330 });
unit('ks|kus|kusy|kusov|x|kelimok|kelimky|konzerva|konzervu|konzervy|balenie|balicek|sacok|tabulka|tabulku', { kind: 'piece' });
unit('platok|platky|platkov|krajec|krajce|krajcov|kolecko|kolecka', { kind: 'slice' });
unit('kusok|kusky|kuskov|kustik|trojuholnik|trojuholniky|rez|rezy|kopcek|kopceky|kopcekov', { kind: 'bit' });
unit('porcia|porciu|porcie|tanier|taniere|miska|misku|misky', { kind: 'portion' });

/** Slová o veľkosti porcie – "veľký tanier", "menšia porcia", "dvojitý burger". */
const SIZE_STEMS: Record<string, number> = {
  obrovsk: 1.7, kopcovit: 1.6, velk: 1.4, poriadn: 1.4, vacs: 1.3,
  dvojit: 2, polovicn: 0.5, detsk: 0.6, mens: 0.7, drobn: 0.6
};
const SIZE_EXACT: Record<string, number> = {
  maly: 0.7, male: 0.7, malu: 0.7, mala: 0.7, plny: 1.3, plna: 1.3, plne: 1.3, plnu: 1.3,
  extra: 1.4, mega: 1.7, xxl: 1.7
};
function sizeOf(tok: Tok | undefined): number | null {
  if (!tok) return null;
  return SIZE_EXACT[tok.t] ?? SIZE_STEMS[tok.s] ?? null;
}

/** Úprava jedla, ktorá mení kalórie. */
const FRIED_RE = /^(vypraz|vysmaz|smazen|fritovan|obalovan)/;
const LIGHT_RE = /^(nizkotucn|odtucnen|light|lajt|dietn)/;
const ALREADY_FRIED = /vypráž|hranolky|langoš|čipsy|placky|nugety|krokety|rezeň/i;

// ------------------------------------------------------------
// Čas a typ jedla
// ------------------------------------------------------------

interface When { daysAgo: number; label: string; }

function parseWhen(text: string): When {
  if (/\bpredvcer/.test(text)) return { daysAgo: 2, label: 'predvčerom' };
  if (/\bvcera|\bvcerajs/.test(text)) return { daysAgo: 1, label: 'včera' };
  return { daysAgo: 0, label: 'dnes' };
}

function parseMealType(text: string): MealType | null {
  if (/ranajk|\brano\b|na lacno/.test(text)) return 'breakfast';
  if (/desiat|olovrant|snack|maskrt|poobede|popoludni/.test(text)) return 'snack';
  if (/\bobed|naobed/.test(text)) return 'lunch';
  if (/\bvecer(?!a som)|vecera\b/.test(text)) return 'dinner';
  return null;
}

function mealByHour(hour: number): MealType {
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

const MEAL_HOUR: Record<MealType, [number, number]> = {
  breakfast: [8, 0], snack: [15, 0], lunch: [12, 30], dinner: [19, 0]
};

/** ISO dátum pre záznam z minulosti; pre "dnes" vráti undefined (uloží sa aktuálny čas). */
function entryDate(ctx: CoachContext, when: When, meal?: MealType | null): string | undefined {
  if (!when.daysAgo) return undefined;
  const d = new Date(ctx.now);
  d.setDate(d.getDate() - when.daysAgo);
  const [h, min] = meal ? MEAL_HOUR[meal] : [12, 0];
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}

// ------------------------------------------------------------
// Detektory zápisov
// ------------------------------------------------------------

interface Parse {
  work: string;          // text s vymaskovanými už spracovanými časťami
  full: string;          // pôvodný normalizovaný text
  actions: EngineAction[];
  notes: string[];       // riadky do potvrdenia
  tips: string[];        // doplňujúce rady
  question: boolean;
  future: boolean;
  when: When;
  asks: string[];        // doplňujúce otázky, keď chýba údaj
  estimated?: boolean;   // množstvá jedla sú odhad z opisu, nie z váhy
  pending?: { name: string; count: number };
}

const HOURS_RE = /(\d+(?:\.\d+)?)\s*(?:a pol\s*)?(?:h|hod\w*)\b|\b(pol hodin\w*|hodinu a pol|tristvrte hodin\w*|stvrt hodin\w*|hodinu|hodinku)\b/g;
const MINUTES_RE = /(\d+(?:\.\d+)?)\s*(?:min\w*|m)\b/g;

function hoursFromMatch(m: RegExpExecArray): number {
  if (m[1] !== undefined) return parseFloat(m[1]) + (/a pol/.test(m[0]) ? 0.5 : 0);
  const word = m[2];
  if (/^pol/.test(word)) return 0.5;
  if (/a pol$/.test(word)) return 1.5;
  if (/^tristvrte/.test(word)) return 0.75;
  if (/^stvrt/.test(word)) return 0.25;
  return 1;
}

function detectWeight(p: Parse, ctx: CoachContext): void {
  if (/cielov|chcem vazit|chcel\w* by som vazit/.test(p.work)) return;
  const re = /(?:vazim|vazil\w* som|navazil\w* som|odvazil\w* som sa(?: na)?|(?:moja |dnesna |ranna )?vaha(?: je| bola| mam| dnes| rano)*)\s*(?:dnes |teraz |rano |presne |okolo |asi |uz |len )*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kil\w*)?|\bmam\s+(?:teraz |uz |dnes |rano )*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kil\w*)/;
  const m = re.exec(p.work);
  if (!m) return;
  const value = parseFloat(m[1] ?? m[2]);
  if (value < 30 || value > 300) return;
  p.work = blank(p.work, m.index, m[0].length);

  const previous = currentWeight(ctx);
  p.actions.push({
    kind: 'save', type: 'weight', label: `Váha ${value} kg`,
    data: { weight: value, date: entryDate(ctx, p.when) }
  });
  let line = `⚖️ Váha: ${value} kg`;
  if (previous && Math.abs(previous - value) >= 0.1) {
    const diff = round(value - previous, 1);
    line += ` (${diff > 0 ? '+' : ''}${diff} kg oproti poslednému údaju)`;
  }
  p.notes.push(line);
  const target = num(ctx.profile?.targetWeight);
  if (target) {
    const left = round(value - target, 1);
    p.tips.push(Math.abs(left) < 0.5
      ? `🎯 Si na svojej cieľovej váhe ${target} kg. Výborne!`
      : `Do cieľovej váhy ${target} kg ti ${left > 0 ? 'ostáva zhodiť' : 'chýba'} ${Math.abs(left)} kg.`);
  }
}

function detectSleep(p: Parse, ctx: CoachContext): void {
  const word = /\b(spal|spala|naspal|naspala|vyspal\w*|spanok|spanku|spanie|spim)\b/.exec(p.work);
  if (!word) return;

  // najbližší údaj o hodinách za slovom (alebo tesne pred ním)
  let best: { index: number; length: number; hours: number } | null = null;
  HOURS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HOURS_RE.exec(p.work))) {
    const distance = m.index >= word.index ? m.index - word.index : (word.index - m.index) + 25;
    if (distance <= 60 && (!best || distance < Math.abs(best.index - word.index))) {
      best = { index: m.index, length: m[0].length, hours: hoursFromMatch(m) };
    }
  }
  if (!best) {
    const bare = /\b(?:spal|spala|naspal|naspala|spanok|spim)\s+(?:som\s+)?(?:dnes\s+|vcera\s+|asi\s+|len\s+|iba\s+|okolo\s+)*(\d+(?:\.\d+)?)\b/.exec(p.work);
    if (bare) best = { index: bare.index, length: bare[0].length, hours: parseFloat(bare[1]) };
  }
  if (!best) {
    if (!p.question && /\b(spal|spala|naspal|naspala|vyspal|vyspala)\b/.test(p.work)) {
      p.asks.push('Koľko hodín si spal? Napíš napríklad „spal som 7 hodín“ a zapíšem to.');
    }
    return;
  }
  if (best.hours <= 0 || best.hours > 16 || (p.question && !/\b(spal|spala|naspal|naspala)\b/.test(p.work))) return;

  const hours = best.hours;
  let quality = hours >= 8 ? 'excellent' : hours >= 7 ? 'good' : hours >= 6 ? 'fair' : 'poor';
  if (/zle|slabo|mizern|hrozn|prerusovan|budil|nekvalitn/.test(p.work)) quality = 'poor';
  else if (/vyborn|super|skvel|ako babatko|tvrdo/.test(p.work)) quality = 'excellent';
  else if (/dobre|kvalitn/.test(p.work)) quality = hours >= 6 ? 'good' : 'fair';

  p.work = blank(p.work, best.index, best.length);
  p.work = blank(p.work, word.index, word[0].length);
  const sk: Record<string, string> = { excellent: 'výborná kvalita', good: 'dobrá kvalita', fair: 'priemerná kvalita', poor: 'slabá kvalita' };
  p.actions.push({
    kind: 'save', type: 'sleep', label: `Spánok ${hours} h`,
    data: { hours, quality, date: entryDate(ctx, p.when) }
  });
  p.notes.push(`😴 Spánok: ${hours} h (${sk[quality]})`);
  if (hours < 6) p.tips.push('Krátky spánok zvyšuje hlad a zhoršuje výkon – dnes si daj ľahší tréning a skús ísť spať skôr.');
  else if (hours >= 7 && hours <= 9) p.tips.push('To je ideálne pásmo na regeneráciu. 👌');
}

const MOOD_WORDS: Array<[RegExp, number]> = [
  [/hrozn|strasn|otras|na dne|najhors/, 2],
  [/\bzle\b|\bzla\b|\bzlu\b|smutn|mizern|nanic|depres|nahnevan|podrazden/, 3],
  [/unaven|nic moc|slab|bez energie|vycerpan/, 4],
  [/\bok\b|okej|normaln|ujde|priemern|tak tak|neutral/, 5],
  [/velmi dobr|vyborn|skvel|super|uzasn|fantastick|paradn|stastn|nadsen/, 9],
  [/dobr|fajn|pohod|prijemn|spokojn|vesel/, 7]
];

function detectMood(p: Parse, ctx: CoachContext): void {
  const word = /\b(nalad\w*|citim sa|mam sa|citil\w* som sa)\b/.exec(p.work);
  if (!word) return;
  let score: number | null = null;
  const scale = /(\d+(?:\.\d+)?)\s*(?:\/|z|zo)\s*10\b/.exec(p.work);
  const bare = /\bnalad\w*\s+(?:je |bola |mam |dnes |na )*(\d+(?:\.\d+)?)\b/.exec(p.work);
  if (scale) { score = parseFloat(scale[1]); p.work = blank(p.work, scale.index, scale[0].length); }
  else if (bare) { score = parseFloat(bare[1]); p.work = blank(p.work, bare.index, bare[0].length); }
  else if (!p.question) {
    const found = MOOD_WORDS.find(([re]) => re.test(p.work));
    if (found) score = found[1];
  }
  if (score === null || score < 1 || score > 10) return;
  score = Math.round(score);
  p.work = blank(p.work, word.index, word[0].length);
  p.actions.push({
    kind: 'save', type: 'mood', label: `Nálada ${score}/10`,
    data: { score, date: entryDate(ctx, p.when) }
  });
  p.notes.push(`${score >= 7 ? '😊' : score >= 5 ? '😐' : '😔'} Nálada: ${score}/10`);
  if (score <= 4) p.tips.push('Mrzí ma, že to dnes nie je ono. Krátka prechádzka vonku alebo ľahký pohyb zvyknú pomôcť – a pokojne mi napíš, čo ťa trápi.');
  else if (score >= 8) p.tips.push('Paráda, takú energiu sa oplatí využiť na dobrý tréning. 💪');
}

function detectStress(p: Parse, ctx: CoachContext): void {
  const word = /\bstres\w*/.exec(p.work);
  if (!word) return;
  let level: number | null = null;
  const scale = /(\d+(?:\.\d+)?)\s*(?:\/|z|zo)\s*10\b/.exec(p.work);
  const bare = /\bstres\w*\s+(?:je |bol |mam |dnes |na |urovne |uroven )*(\d+(?:\.\d+)?)\b/.exec(p.work);
  if (scale) { level = parseFloat(scale[1]); p.work = blank(p.work, scale.index, scale[0].length); }
  else if (bare) { level = parseFloat(bare[1]); p.work = blank(p.work, bare.index, bare[0].length); }
  else if (!p.question) {
    if (/velk|vysok|siln|obrovsk|hrozn|extrem|strasn|riadn/.test(p.work)) level = 8;
    else if (/stredn|miern|trochu|trosku/.test(p.work)) level = 5;
    else if (/maly|nizk|ziadn|minimal|bez stresu/.test(p.work)) level = 2;
    else if (/som v strese|mam stres|stresuj|vystresovan/.test(p.work)) level = 7;
  }
  if (level === null || level < 1 || level > 10) return;
  level = Math.round(level);
  const src = /\b(?:z|zo|kvoli|pre|v)\s+(prac\w*|skol\w*|rodin\w*|penaz\w*|vztah\w*|skusk\w*|sef\w*|deadlin\w*|zdrav\w*)/.exec(p.work);
  p.work = blank(p.work, word.index, word[0].length);
  const data: any = { level, date: entryDate(ctx, p.when) };
  if (src) data.source = src[1];
  p.actions.push({ kind: 'save', type: 'stress', label: `Stres ${level}/10`, data });
  p.notes.push(`😰 Stres: ${level}/10`);
  if (level >= 7) p.tips.push('Skús dýchanie 4-7-8 (nádych 4 s, zadrž 7 s, výdych 8 s) a krátku prechádzku. Keď budeš chcieť, napíš „ako znížiť stres“.');
}

function detectExercise(p: Parse, ctx: CoachContext): void {
  const toks = tokenize(p.work);
  const found: Array<{ item: ActivityItem; tok: number; len: number; start: number; end: number }> = [];
  for (let i = 0; i < toks.length; i++) {
    const hit = matchAt(ACTIVITY_INDEX, toks, i);
    if (!hit) continue;
    const last = toks[i + hit.stems.length - 1];
    found.push({ item: hit.item, tok: i, len: hit.stems.length, start: toks[i].i, end: last.i + last.t.length });
    i += hit.stems.length - 1;
  }
  if (!found.length) return;

  const weight = currentWeight(ctx) || 75;
  let intensity: 'low' | 'medium' | 'high' = 'medium';
  if (/lahk|pomal|volne|zlahka|regenerac/.test(p.work)) intensity = 'low';
  else if (/intenziv|tvrd|rychl|naplno|tazk|narocn|svizn/.test(p.work)) intensity = 'high';
  const factor = intensity === 'low' ? 0.8 : intensity === 'high' ? 1.2 : 1;

  const logged = new Set<string>();
  found.forEach((f, idx) => {
    if (logged.has(f.item.name)) return;
    const before = toks.slice(Math.max(0, f.tok - 4), f.tok).map(t => t.t).join(' ');
    if (/\b(po|pred|bez|okrem)$/.test(before)) return;

    const lo = idx > 0 ? found[idx - 1].end : 0;
    const hi = idx < found.length - 1 ? found[idx + 1].start : p.work.length;
    type Hit = { index: number; length: number; minutes: number };
    const hits: Hit[] = [];
    const scan = (re: RegExp, toMinutes: (m: RegExpExecArray) => number) => {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(p.work))) {
        if (m.index >= lo && m.index < hi) hits.push({ index: m.index, length: m[0].length, minutes: toMinutes(m) });
      }
    };
    scan(MINUTES_RE, m => parseFloat(m[1]));
    scan(HOURS_RE, m => hoursFromMatch(m) * 60);
    scan(/(\d+(?:\.\d+)?)\s*(?:km|kilomet\w*)/g, m => (parseFloat(m[1]) / (f.item.speed || 8)) * 60);
    scan(/(\d{3,6})\s*krok\w*/g, m => parseFloat(m[1]) / 100);

    const after = hits.filter(h => h.index >= f.start).sort((x, y) => x.index - y.index)[0];
    const prior = hits.filter(h => h.index < f.start).sort((x, y) => y.index - x.index)[0];
    const hit = after || prior;

    const pastVerb = /(al|il|ol|ala|ila|ola)$/.test(toks[f.tok].t);
    const pastMarker = /\b((bol|bola) som( si)?|(isiel|isla|siel|sla) som|(dal|dala) som si|absolvoval\w*|mam za sebou|odcvicil\w*|zabehol|zabehla|odtrenoval\w*|stihol som|stihla som)\b/.test(before);
    if (p.future) return;
    if (p.question && !pastVerb && !pastMarker) return;
    if (!hit && !pastVerb && !pastMarker) return;

    let minutes = hit ? hit.minutes : f.item.defaultMin;
    minutes = Math.round(minutes);
    if (minutes <= 0 || minutes > 720) return;
    if (hit) p.work = blank(p.work, hit.index, hit.length);
    p.work = blank(p.work, f.start, f.end - f.start);
    logged.add(f.item.name);

    const burned = Math.round(f.item.met * factor * weight * (minutes / 60));
    p.actions.push({
      kind: 'save', type: 'exercise', label: `${f.item.name} ${minutes} min`,
      data: { type: f.item.name, duration: minutes, intensity, caloriesBurned: burned, date: entryDate(ctx, p.when) }
    });
    p.notes.push(`🏃 ${f.item.name}: ${minutes} min, približne ${burned} kcal` +
      (hit ? '' : ' (trvanie som odhadol – ak to bolo inak, napíš mi koľko minút)'));
  });
}

interface FoodHit {
  item: FoodItem;
  grams: number;
  /** Násobok kalórií kvôli úprave (vyprážané ×1,3, light ×0,75). */
  factor: number;
  tag: string;
  /** Používateľ uviedol presné množstvo (g, ml, kusy) – nie je to odhad z opisu. */
  explicit: boolean;
  sized: boolean;
}

interface FoodScan { hits: FoodHit[]; quantified: boolean; estimated: boolean; work: string; }

type FoodIndex = Map<string, AliasEntry<FoodItem>[]>;

/** Jedlá naučené od používateľa ako dočasný index (kcal platí na 1 kus). */
function customIndex(list?: CustomFood[]): FoodIndex | null {
  if (!list || !list.length) return null;
  return buildIndex(list.map(c => ({
    name: c.name, aliases: [c.name], kcal: c.calories, protein: 0, carbs: 0, fats: 0,
    portion: 100, piece: 100, custom: true
  } as FoodItem)));
}

/** Slová, ktoré sa po odrezaní koncovky zhodujú s jedlom, ale jedlom nie sú ("hrozný deň"). */
const NEVER_FOOD = new Set(['hrozny', 'hrozne', 'hroznu', 'hroznou', 'hroznym', 'kolegami', 'kolegom', 'kolega', 'kolegovia']);

/** Jednoslovné aliasy na hľadanie s toleranciou preklepu. */
const SINGLE_ALIASES: Array<{ stem: string; entry: AliasEntry<FoodItem> }> = [];
FOOD_INDEX.forEach(list => list.forEach(entry => {
  if (entry.stems.length === 1 && entry.stems[0].length >= 5) SINGLE_ALIASES.push({ stem: entry.stems[0], entry });
}));

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else if (a[i + 1] === b[j] && a[i] === b[j + 1]) { i += 2; j += 2; }   // prehodené písmená
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Preklep v názve jedla: "banna" → banán, "jogrut" → jogurt. */
function fuzzyFood(tok: Tok): AliasEntry<FoodItem> | null {
  if (tok.t.length < 5 || tok.s.length < 4 || FILLER.has(tok.t) || UNITS.has(tok.s)) return null;
  const found = SINGLE_ALIASES.find(c => c.stem[0] === tok.s[0] && withinOneEdit(tok.s, c.stem));
  return found ? found.entry : null;
}

function findFoods(work: string, custom: FoodIndex | null = null): FoodScan {
  const toks = tokenize(work);
  const hits: FoodHit[] = [];
  const used = new Set<number>();
  let quantified = false;
  let out = work;

  for (let i = 0; i < toks.length; i++) {
    if (NEVER_FOOD.has(toks[i].t)) continue;
    const before = toks.slice(Math.max(0, i - 3), i).map(t => t.t);
    const foodContext = before.some(t => parseNumber(t) !== null || UNITS.has(stem(t)) || EAT_VERB.test(t)) &&
      !/^(s|so|k|ku|pri|od|u)$/.test(before[before.length - 1] || '');
    const hit = (custom && matchAt(custom, toks, i)) || matchAt(FOOD_INDEX, toks, i) ||
      (foodContext ? fuzzyFood(toks[i]) : null);
    if (!hit) continue;
    const item = hit.item;
    const len = hit.stems.length;

    // "s tým mliekom", "k tomu chlebu" – odkaz na jedlo, ktoré už bolo zapísané
    if (i >= 2 && /^(s|so|k|ku)$/.test(toks[i - 2].t) && /^(tym|tou|tomu|tej|tymi|tymto|touto)$/.test(toks[i - 1].t)) {
      for (let k = i - 2; k < i + len; k++) { used.add(k); }
      i += len - 1;
      continue;
    }
    let grams: number | null = null;
    let explicit = false;
    let size = 1;
    let sized = false;

    const free = (k: number) => k >= 0 && k < toks.length && !used.has(k);
    const takeSize = (k: number): boolean => {
      const value = free(k) ? sizeOf(toks[k]) : null;
      if (value === null) return false;
      size *= value; sized = true; used.add(k);
      return true;
    };
    const resolve = (count: number, un: Unit | undefined): number => {
      if (item.custom) return un && un.kind === 'amount' ? 100 : count * 100;
      if (!un) return count * (item.piece ?? item.portion);
      if (un.kind === 'amount') return count * un.value;
      if (un.kind === 'piece') return count * (item.piece ?? item.slice ?? item.portion);
      if (un.kind === 'slice') return count * (item.slice ?? item.piece ?? 25);
      if (un.kind === 'bit') return count * (item.slice ?? item.piece ?? item.portion * 0.4);
      return count * item.portion;
    };

    let j = i - 1;
    if (takeSize(j)) j--;                       // "veľká pizza"

    const u = free(j) ? UNITS.get(toks[j].s) : undefined;
    if (u) {
      used.add(j);
      let k = j - 1;
      if (takeSize(k)) k--;                     // "veľký tanier polievky"
      const n = free(k) ? parseNumber(toks[k].t) : null;
      if (n !== null) { used.add(k); takeSize(k - 1); }
      grams = resolve(n ?? 1, u);
      explicit = u.kind === 'amount' || n !== null;
      quantified = true;
    } else {
      const n = free(j) ? parseNumber(toks[j].t) : null;
      if (n !== null) {
        grams = resolve(n, undefined);
        used.add(j);
        takeSize(j - 1);
        explicit = true;
        quantified = true;
      }
    }

    // množstvo až za jedlom: "ryža 200 g"
    if (grams === null) {
      const k = i + len;
      const n = k < toks.length ? parseNumber(toks[k].t) : null;
      const un = k + 1 < toks.length ? UNITS.get(toks[k + 1].s) : undefined;
      if (n !== null && un) {
        grams = resolve(n, un);
        used.add(k); used.add(k + 1);
        explicit = true;
        quantified = true;
      }
    }

    if (grams === null) {
      const withWord = i > 0 && /^(s|so)$/.test(toks[i - 1].t);
      grams = withWord && item.side ? item.side : item.portion;
    }
    grams = Math.round(grams * size);
    if (sized) quantified = true;

    // spôsob úpravy v okolí jedla: "vyprážaný", "nízkotučný"
    let factor = 1;
    let tag = '';
    const around = [i - 2, i - 1, i + len, i + len + 1]
      .filter(k => k >= 0 && k < toks.length && !(k >= i && k < i + len))
      .map(k => toks[k].t);
    if (around.some(t => FRIED_RE.test(t)) && !ALREADY_FRIED.test(item.name)) { factor = 1.3; tag = ', vyprážané'; }
    else if (around.some(t => LIGHT_RE.test(t))) { factor = 0.75; tag = ', light'; }

    if (grams > 0 && grams <= 5000) hits.push({ item, grams, factor, tag, explicit, sized });
    for (let k = i; k < i + len; k++) {
      used.add(k);
      out = blank(out, toks[k].i, toks[k].t.length);
    }
    i += len - 1;
  }

  // veľkosť porcie povedaná mimo jedla: "guláš, veľká porcia", "trochu ryže", "dve porcie"
  let global = 1;
  if (/dve porcie|dvojnasob|nasup|\bdupl/.test(work)) global = 2;
  else if (/pol porcie|polovic\w* porci|len polovic|iba polovic/.test(work)) global = 0.5;
  else if (/(velk|poriadn|obrovsk|vacs)\w* porci|bolo toho vela|vela toho|poriadne som sa najedol/.test(work)) global = 1.4;
  else if (/(mal|mens)\w* porci|bolo toho malo|len trochu|iba trochu/.test(work)) global = 0.7;
  else if (/\b(trochu|trosku|trosicku|ochutnal\w*|par hryzov|zopar hryzov)\b/.test(work)) global = 0.4;
  if (global !== 1) {
    hits.forEach(h => {
      if (!h.explicit && !h.sized) { h.grams = Math.round(h.grams * global); h.sized = true; }
    });
    quantified = true;
  }

  // množstvá priradené rozpoznaným jedlám už nepatria k ničomu neznámemu
  used.forEach(k => { out = blank(out, toks[k].i, toks[k].t.length); });

  return { hits, quantified, estimated: hits.some(h => !h.explicit && !h.item.custom), work: out };
}

function foodEntry(hit: FoodHit, meal: MealType, date?: string): any {
  if (hit.item.custom) {
    const count = round(hit.grams / 100, 2);
    return {
      name: count === 1 ? hit.item.name : `${hit.item.name} ×${String(count).replace('.', ',')}`,
      calories: Math.round(hit.item.kcal * count), protein: 0, carbs: 0, fats: 0,
      mealType: meal, category: 'food', date
    };
  }
  const k = hit.grams / 100;
  const calories = Math.round(hit.item.kcal * k * hit.factor);
  const extraFat = (calories - hit.item.kcal * k) / 9;
  return {
    name: `${hit.item.name}${hit.tag} (${hit.grams} ${hit.item.drink ? 'ml' : 'g'})`,
    calories,
    protein: round(hit.item.protein * k, 1),
    carbs: round(hit.item.carbs * k, 1),
    fats: round(Math.max(0, hit.item.fats * k + extraFat), 1),
    mealType: meal,
    category: hit.item.drink ? 'drink' : 'food',
    date
  };
}

/** Odhad pre jedlo, ktoré nie je v databáze – podľa toho, o aký typ jedla ide. */
const GUESSES: Array<{ match: RegExp; type: string; kcal: number; p: number; c: number; f: number }> = [
  { match: /polievk|vyvar|boršč|borsc/, type: 'polievka', kcal: 180, p: 9, c: 18, f: 7 },
  { match: /privar|kasa|kase|kasu/, type: 'prívarok alebo kaša', kcal: 330, p: 13, c: 42, f: 10 },
  { match: /salat/, type: 'šalát', kcal: 280, p: 10, c: 15, f: 19 },
  { match: /pizz/, type: 'pizza', kcal: 850, p: 35, c: 105, f: 30 },
  { match: /cestovin|spaget|rezanc|penne|lasag|noky|gnocch|tagliat|fusill/, type: 'cestovinové jedlo', kcal: 620, p: 24, c: 78, f: 22 },
  { match: /rizot|ryz/, type: 'jedlo s ryžou', kcal: 520, p: 26, c: 65, f: 15 },
  { match: /burger|sendvic|baget|toast|wrap|tortill|hot ?dog|panini|chlebic/, type: 'sendvič alebo burger', kcal: 480, p: 22, c: 45, f: 22 },
  { match: /kolac|zakus|tort|buchta|strudl|dezert|susien|kremes|palacink|lievanc|sisk|donut|muffin|brownie/, type: 'dezert', kcal: 360, p: 6, c: 48, f: 16 },
  { match: /smoothie|shake|koktail|koktejl|napoj|limonad/, type: 'nápoj', kcal: 180, p: 3, c: 36, f: 2 },
  { match: /mas|rezen|steak|stehn|kridel|rebr|pecen|gulas|perkelt|paprikas|ragu|rolad|katuv|placka|soté|sote|plnen/, type: 'mäsité hlavné jedlo', kcal: 620, p: 38, c: 45, f: 30 },
  { match: /ryb|losos|tresk|pstruh|kapor|zubac/, type: 'rybie jedlo', kcal: 480, p: 35, c: 35, f: 22 },
  { match: /zemiak|knedl|halusk|pirohy|strapack|placky/, type: 'múčne alebo zemiakové jedlo', kcal: 580, p: 16, c: 80, f: 20 },
  { match: /tycink|keks|cukrik|cokolad|sladkost|zmrzlin|nanuk/, type: 'sladkosť', kcal: 230, p: 3, c: 30, f: 11 },
  { match: /baklazan|cuket|zelenin|karfiol|brokolic|spenat|hrib|sampin|tekvic|kapust|fazulk|sparg/, type: 'zeleninové jedlo', kcal: 320, p: 10, c: 28, f: 18 }
];

const EAT_VERB = /\b(zjedol|zjedla|jedol|jedla|zjedli|vypil|vypila|pil som|pila som|ranajkoval\w*|obedoval\w*|veceral\w*|desiatoval\w*|olovrantoval\w*|papal\w*|zhltol|zhltla|dojedol|dojedla|najedol|najedla|schrumal\w*)\b/;
const LOG_VERB = /\b(mal som|mala som|mal som si|som si dal\w*|som mal|som mala|som si daval\w*|dal som si|dala som si|daval\w* som si|zapis|zapisat|pridaj|pridat|zaznamenaj|zaznac|uloz|dnes som mal\w*|bolo na|bol na|bola na)\b/;

const FILLER = new Set(('som si sa mi ma to ten ta tu tam a aj i s so z zo na v vo do po pri k ku od pre len iba este uz dnes vcera rano vecer potom ' +
  'zjedol zjedla jedol jedla mal mala dal dala vypil vypila bol bola bolo dobre velmi trochu trosku pol nieco nejaky nejaku nejake ' +
  'ranajky obed veceru veceri desiatu olovrant tanier porcia porciu misku kus kusok velky velku velke maly malu male').split(' '));

/** Koľko slov v texte ostalo nerozpoznaných (po vymaskovaní známych jedál). */
function unknownWords(work: string): number {
  return tokens(work).filter(t => t.length >= 4 && !FILLER.has(t) && !/^\d/.test(t) &&
    !UNITS.has(stem(t)) && !FRIED_RE.test(t) && !/^(zapek|pecen|varen|dusen|grilovan|domac|cerstv|special|babkin|mamin)/.test(t)).length;
}

const NOT_FOOD = /^(hodin|minut|sekund|dn|den|tyzd|mesiac|rok|krat|raz|kg|km|kcal|kalori|percent|eur|krok|seri|opakovan)/;

function isContentWord(t: string): boolean {
  return t.length >= 3 && /^[a-z]/.test(t) && !FILLER.has(t) && parseNumber(t) === null &&
    !UNITS.has(stem(t)) && SIZE_EXACT[t] === undefined && SIZE_STEMS[stem(t)] === undefined &&
    !NOT_FOOD.test(t) && !FRIED_RE.test(t) && !EAT_VERB.test(t);
}

/** Nerozpoznané položky, pri ktorých používateľ uviedol množstvo: "46 g tribitku", "kofila 1 ks". */
function unknownItems(work: string): Array<{ token: string; count: number; unit: boolean }> {
  const t = tokens(work);
  const out: Array<{ token: string; count: number; unit: boolean }> = [];
  for (let i = 0; i < t.length; i++) {
    const n = parseNumber(t[i]);
    if (n !== null) {
      let j = i + 1;
      const u = j < t.length ? UNITS.get(stem(t[j])) : undefined;
      if (u) j++;
      if (j < t.length && isContentWord(t[j])) {
        out.push({ token: t[j], count: u && u.kind === 'amount' ? 1 : n, unit: !!u });
        i = j;
      }
    } else if (isContentWord(t[i]) && i + 2 < t.length && parseNumber(t[i + 1]) !== null &&
               UNITS.get(stem(t[i + 2]))?.kind === 'piece') {
      out.push({ token: t[i], count: parseNumber(t[i + 1]) as number, unit: true });
      i += 2;
    }
  }
  return out;
}

/** Nájde slovo v pôvodnej správe (s diakritikou) podľa jeho normalizovanej podoby. */
function originalWord(original: string, token: string): string {
  const word = original.split(/\s+/).map(w => w.replace(/[.,!?:;()"„“]+/g, '')).find(w => norm(w) === token) || token;
  return word[0].toUpperCase() + word.slice(1);
}

function askCalories(name: string, count: number): string {
  return `„${name}“ ešte nepoznám. Koľko to má kalórií${count > 1 ? ' na jeden kus' : ''}? ` +
    'Napíš mi len číslo (napríklad „240“) a nabudúce si to už budem pamätať.';
}

/** Z pôvodnej správy vytiahne názov jedla bez slovies a čísel. */
function dishName(original: string): string {
  const name = original
    .replace(/\d+([.,]\d+)?\s*(kcal|kal\w*)/gi, ' ')
    .replace(/^\s*(dnes|včera|vcera|predvčerom)?\s*(na\s+(raňajky|ranajky|obed|večeru|veceru|desiatu|olovrant)\s+)?(som\s+)?(si\s+)?(zjedol|zjedla|jedol|jedla|mal|mala|dal|dala|vypil|vypila|zapíš|zapis|pridaj)?(\s+som)?(\s+si)?(\s+mi)?/i, ' ')
    .replace(/\b(na\s+(raňajky|ranajky|obed|večeru|veceru|desiatu|olovrant))\b/gi, ' ')
    .replace(/[.,!?:;()]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return name ? name[0].toUpperCase() + name.slice(1) : 'Jedlo';
}

function detectFood(p: Parse, ctx: CoachContext, original: string): void {
  let explicitKcal: number | null = null;
  const kcal = /(\d+(?:\.\d+)?)\s*(?:kcal|kalori\w*|kal)\b/.exec(p.work);
  if (kcal) {
    explicitKcal = parseFloat(kcal[1]);
    p.work = blank(p.work, kcal.index, kcal[0].length);
  }

  const scan = findFoods(p.work, customIndex(ctx.customFoods));
  const hits = scan.hits;
  const mealWord = parseMealType(p.full);
  const hasVerb = EAT_VERB.test(p.full) || LOG_VERB.test(p.full);
  const lookup = /\b(kolko|ake|aka|aku|ma|maju|obsahuj\w*)\b.*\b(kalori\w*|kcal|bielkovin|protein\w*|sacharid\w*|tuk\w*|cukr\w*|hodnot\w*)\b/.test(p.full) && !hasVerb;
  const wantsLog = !p.future && !lookup && (hasVerb || (!p.question && (!!mealWord || scan.quantified || explicitKcal !== null)));

  const meal = mealWord || mealByHour(ctx.now.getHours());
  const date = entryDate(ctx, p.when, meal);

  // položka s množstvom, ktorú nepoznám → nezahodiť ju potichu, ale opýtať sa
  const strong = EAT_VERB.test(p.full) || hits.length > 0 || /\b(dal\w* som si|som si dal\w*|dam si|davam si)\b/.test(p.full);
  const unknown = wantsLog && explicitKcal === null
    ? unknownItems(scan.work).filter(u => strong || u.unit)
    : [];
  if (unknown.length) {
    const name = originalWord(original, unknown[0].token);
    p.pending = { name, count: unknown[0].count };
    p.asks.push(askCalories(name, unknown[0].count));
    if (!hits.length) return;
  }

  const unknownMain = !unknown.length && hits.length > 0 && EAT_VERB.test(p.full) && explicitKcal === null &&
    hits.every(h => !h.explicit) &&
    hits.reduce((sum, h) => sum + h.item.kcal * h.grams / 100, 0) < 150 &&
    unknownWords(scan.work) >= 1;

  if (hits.length && wantsLog && !unknownMain) {
    p.work = scan.work;
    const entries = hits.map(h => foodEntry(h, meal, date));
    if (explicitKcal !== null && entries.length === 1 && explicitKcal > 0) {
      const scale = entries[0].calories > 0 ? explicitKcal / entries[0].calories : 1;
      entries[0].calories = Math.round(explicitKcal);
      (['protein', 'carbs', 'fats'] as const).forEach(key => entries[0][key] = round(entries[0][key] * scale, 1));
    } else if (scan.estimated) {
      p.estimated = true;
    }
    for (const e of entries) {
      p.actions.push({ kind: 'save', type: 'food', label: e.name, data: e });
      p.notes.push(`${e.category === 'drink' ? '🥤' : '🍽️'} ${e.name} – ${e.calories} kcal` +
        (e.protein >= 1 ? `, bielkoviny ${Math.round(e.protein)} g` : ''));
    }
    return;
  }

  // neznáme jedlo s uvedenými kalóriami: "zjedol som langoš 600 kcal"
  if (!hits.length && explicitKcal !== null && explicitKcal > 0 && explicitKcal < 6000 && wantsLog) {
    const label = dishName(original);
    const data = { name: label, calories: Math.round(explicitKcal), protein: 0, carbs: 0, fats: 0, mealType: meal, category: 'food', date };
    p.actions.push({ kind: 'save', type: 'food', label, data });
    p.notes.push(`🍽️ ${label} – ${data.calories} kcal`);
    if (label.split(' ').length <= 3 && label !== 'Jedlo') {
      p.actions.push({ kind: 'learn', food: { name: label, calories: data.calories } });
      p.tips.push(`Zapamätal som si: ${label} = ${data.calories} kcal. Nabudúce stačí napísať názov.`);
    }
    return;
  }

  // jedlo mimo databázy: odhadni ho podľa typu, nech používateľ nemusí nič počítať
  if ((!hits.length || unknownMain) && EAT_VERB.test(p.full) && !p.question && !p.future && !p.actions.length) {
    const guess = GUESSES.find(g => g.match.test(p.work));
    const words = tokens(scan.work).filter(isContentWord);
    if (!guess && !unknownMain && words.length === 1) {
      const name = originalWord(original, words[0]);
      p.pending = { name, count: 1 };
      p.asks.push(askCalories(name, 1));
      return;
    }
    let size = 1;
    if (/dve porcie|dvojit|dvojnasob/.test(p.work)) size = 2;
    else if (/velk|poriadn|obrovsk|vela/.test(p.work)) size = 1.4;
    else if (/pol porcie|polovic/.test(p.work)) size = 0.5;
    else if (/\bmal[yaeu]\b|mens|trochu|kusok/.test(p.work)) size = 0.7;
    const base = guess || { type: 'bežné hlavné jedlo', kcal: 600, p: 28, c: 60, f: 25 };
    const label = dishName(original);
    const data = {
      name: `${label} (odhad)`,
      calories: Math.round(base.kcal * size),
      protein: Math.round(base.p * size), carbs: Math.round(base.c * size), fats: Math.round(base.f * size),
      mealType: meal, category: guess?.type === 'nápoj' ? 'drink' : 'food', date
    };
    p.actions.push({ kind: 'save', type: 'food', label: data.name, data });
    p.notes.push(`🍽️ ${label} – približne ${data.calories} kcal`);
    p.tips.push(`Toto jedlo v databáze nemám, preto som ho odhadol ako ${base.type} v bežnej porcii. ` +
      'Ak poznáš presnejšie číslo, napíš „zmaž posledný záznam“ a pošli mi ho s kalóriami.');
  }
}

/** "Bola to veľká porcia" – prepočíta jedlá z posledného zápisu. */
function adjustLast(full: string, ctx: CoachContext): EngineResult | null {
  const foods = (ctx.lastBatch || []).filter(e => e.type === 'food');
  if (!foods.length) return null;
  let factor = 0;
  if (/dvojnasob|dvojit\w* porci|dve porcie|2 porcie/.test(full)) factor = 2;
  else if (/polovic|pol porcie/.test(full)) factor = 0.5;
  else if (/(bol[aoi]?|bolo) (to |toho )?(ovela |trochu |o nieco )?(velk|vacs|viac|vela|poriadn)|(velk|vacs|poriadn|obrovsk)\w* porci|^(viac|vacsie)$/.test(full)) factor = 1.4;
  else if (/(bol[aoi]?|bolo) (to |toho )?(ovela |trochu |o nieco )?(mal|mens|menej)|(mal|mens)\w* porci|^(menej|mensie)$/.test(full)) factor = 0.7;
  if (!factor) return null;

  const actions: EngineAction[] = [{ kind: 'undo' }];
  const lines: string[] = [];
  for (const e of ctx.lastBatch || []) {
    if (e.type !== 'food') { actions.push({ kind: 'save', type: e.type, data: e.data, label: '' }); continue; }
    const d = { ...e.data };
    (['calories', 'protein', 'carbs', 'fats'] as const).forEach(key => d[key] = round(num(d[key]) * factor, key === 'calories' ? 0 : 1));
    d.name = String(d.name).replace(/\((\d+) (g|ml)\)/, (_m, g, u) => `(${Math.round(+g * factor)} ${u})`);
    actions.push({ kind: 'save', type: 'food', data: d, label: d.name });
    lines.push(`  • 🍽️ ${d.name} – ${d.calories} kcal`);
  }
  return {
    text: `✅ Upravil som posledný zápis (×${String(factor).replace('.', ',')}):\n${lines.join('\n')}`,
    actions, intent: 'adjust'
  };
}

// ------------------------------------------------------------
// Odpovede
// ------------------------------------------------------------

function todayLine(ctx: CoachContext, added: { calories: number; protein: number; burned: number }): string[] {
  const t = dayTotals(ctx);
  const calories = t.calories + added.calories;
  const protein = t.protein + added.protein;
  const target = targetCalories(ctx);
  const pTarget = proteinTarget(ctx);
  const lines: string[] = [];
  if (target) {
    const left = target - calories;
    lines.push(`📊 Dnes: ${calories} / ${target} kcal – ` +
      (left >= 0 ? `ostáva ti ${left} kcal.` : `si ${-left} kcal nad cieľom.`));
    if (left < -150) lines.push('Nič sa nedeje, jeden deň pokrok nezničí. Zajtra pokračuj normálne, bez trestania sa hladom.');
  } else {
    lines.push(`📊 Dnes spolu: ${calories} kcal.`);
  }
  if (pTarget) {
    lines.push(`Bielkoviny: ${protein} / ${pTarget} g.` +
      (ctx.now.getHours() >= 16 && protein < pTarget * 0.6 ? ' Večer pridaj niečo bielkovinové – tvaroh, vajcia, mäso alebo strukoviny.' : ''));
  }
  return lines;
}

function confirmation(p: Parse, ctx: CoachContext): string {
  const saves = p.actions.filter(a => a.kind === 'save') as Array<Extract<EngineAction, { kind: 'save' }>>;
  const head = p.when.daysAgo ? `✅ Zapísané (${p.when.label}):` : pick(['✅ Zapísané do denníka:', '✅ Mám to zapísané:', '✅ Hotovo, zapísal som:']);
  const lines = [head, ...p.notes.map(n => `  • ${n}`)];

  const foods = saves.filter(a => a.type === 'food');
  if (foods.length > 1) {
    const kcal = foods.reduce((s, a) => s + a.data.calories, 0);
    const protein = Math.round(foods.reduce((s, a) => s + a.data.protein, 0));
    lines.push(`Spolu ${kcal} kcal a ${protein} g bielkovín.`);
  }

  if (!p.when.daysAgo && foods.length) {
    lines.push('', ...todayLine(ctx, {
      calories: foods.reduce((s, a) => s + a.data.calories, 0),
      protein: Math.round(foods.reduce((s, a) => s + a.data.protein, 0)),
      burned: 0
    }));
  }
  if (p.tips.length) lines.push('', ...p.tips);
  if (p.asks.length) lines.push('', ...p.asks);
  if (foods.length && p.estimated) {
    lines.push('', 'Množstvá som odhadol z opisu ako bežné porcie. Ak to bolo inak, napíš napríklad „bola to veľká porcia“ alebo „bolo toho menej“.');
  }
  return lines.join('\n');
}

function todayStatus(ctx: CoachContext): string {
  const t = dayTotals(ctx);
  const target = targetCalories(ctx);
  const pTarget = proteinTarget(ctx);
  const lines = ['📊 **Tvoj dnešok**', ''];
  if (!t.count) {
    lines.push('Dnes zatiaľ nemáš zapísané žiadne jedlo.' + (target ? ` Tvoj cieľ je ${target} kcal.` : ''));
  } else {
    lines.push(`🍽️ Prijaté: ${t.calories} kcal` + (target ? ` z ${target} kcal` : ''));
    if (target) {
      const left = target - t.calories;
      lines.push(left >= 0 ? `✅ Ostáva ti ${left} kcal.` : `⚠️ Si ${-left} kcal nad cieľom.`);
    }
    lines.push(`Bielkoviny ${t.protein} g` + (pTarget ? ` (cieľ ${pTarget} g)` : '') + `, sacharidy ${t.carbs} g, tuky ${t.fats} g`);
  }
  if (t.exerciseMin) lines.push(`🏃 Pohyb: ${t.exerciseMin} min, spálených približne ${t.burned} kcal`);
  else lines.push('🏃 Pohyb dnes zatiaľ nemáš zapísaný.');
  if (target && t.count) {
    const left = target - t.calories;
    if (left > 250) lines.push('', `Na ďalšie jedlo máš priestor. Napíš „čo si mám dať na ${ctx.now.getHours() < 15 ? 'obed' : 'večeru'}“ a navrhnem ti ho.`);
  }
  return lines.join('\n');
}

function weightStatus(ctx: CoachContext): string {
  const list = sortByTime(ctx.entries.weight);
  const current = currentWeight(ctx);
  if (!current) return '⚖️ Zatiaľ nemám tvoju váhu. Napíš napríklad „vážim 80 kg“ a začnem ju sledovať.';
  const lines = [`⚖️ Tvoja aktuálna váha je **${current} kg**.`];
  if (list.length >= 2) {
    const first = num(list[0].weight);
    const diff = round(current - first, 1);
    lines.push(`Za posledné obdobie je to zmena ${diff > 0 ? '+' : ''}${diff} kg (${list.length} záznamov).`);
  }
  const target = num(ctx.profile?.targetWeight);
  if (target) {
    const left = round(current - target, 1);
    lines.push(Math.abs(left) < 0.5 ? `🎯 Si na cieľovej váhe ${target} kg.` : `Cieľ je ${target} kg, ${left > 0 ? 'ostáva zhodiť' : 'chýba nabrať'} ${Math.abs(left)} kg.`);
  }
  const b = bmi(ctx);
  if (b) lines.push(`BMI ${b} – ${bmiLabel(b)}.`);
  return lines.join('\n');
}

function energyNeeds(ctx: CoachContext): string {
  const base = Math.round(bmr(ctx));
  if (!base) return 'Na výpočet potrebujem v profile vek, výšku a váhu. Doplň ich v Nastaveniach a spočítam ti to presne.';
  const maintenance = Math.round(tdee(ctx));
  const target = targetCalories(ctx);
  const protein = proteinTarget(ctx);
  const lines = [
    '🔢 **Tvoja energetická potreba**', '',
    `  • bazálny metabolizmus: ${base} kcal (telo v úplnom pokoji)`,
    `  • udržiavací príjem: približne ${maintenance} kcal denne`,
    `  • tvoj denný cieľ: **${target} kcal**`
  ];
  if (protein) lines.push(`  • bielkoviny: okolo ${protein} g denne`);
  lines.push('', 'Čísla sú odhad (rovnica Mifflin-St Jeor). Ak sa ti váha 2–3 týždne nehýbe želaným smerom, uprav príjem o 100–200 kcal.');
  return lines.join('\n');
}

function bmiAnswer(ctx: CoachContext): string {
  const b = bmi(ctx);
  if (!b) return 'Na výpočet BMI potrebujem v profile výšku a váhu.';
  return `📐 Tvoje BMI je **${b}** – ${bmiLabel(b)}.\n\nBMI je len orientačné číslo: nerozlišuje svaly od tuku. Viac ti povie obvod pása a to, ako sa cítiš a vládzeš.`;
}

function nutritionLookup(hits: FoodHit[]): string {
  const lines: string[] = [];
  hits.slice(0, 4).forEach(h => {
    const k = h.grams / 100;
    const unitLabel = h.item.drink ? 'ml' : 'g';
    lines.push(`**${h.item.name}** – ${h.grams} ${unitLabel}: ${Math.round(h.item.kcal * k)} kcal`,
      `  • bielkoviny ${round(h.item.protein * k, 1)} g, sacharidy ${round(h.item.carbs * k, 1)} g, tuky ${round(h.item.fats * k, 1)} g`,
      `  • na 100 ${unitLabel}: ${h.item.kcal} kcal`);
  });
  lines.push('', 'Ak si to zjedol, napíš napríklad „zjedol som ' + hits[0].item.name.toLowerCase() + '“ a zapíšem ti to.');
  return lines.join('\n');
}

function burnLookup(ctx: CoachContext, item: ActivityItem, text: string): string {
  const weight = currentWeight(ctx) || 75;
  let minutes = 30;
  MINUTES_RE.lastIndex = 0; HOURS_RE.lastIndex = 0;
  const mm = MINUTES_RE.exec(text);
  const hh = HOURS_RE.exec(text);
  if (mm) minutes = parseFloat(mm[1]); else if (hh) minutes = hoursFromMatch(hh) * 60;
  const burned = Math.round(item.met * weight * (minutes / 60));
  return `🔥 ${item.name}, ${Math.round(minutes)} min pri váhe ${weight} kg: približne **${burned} kcal**.\n\nJe to odhad, skutočná hodnota závisí od tempa a kondície.`;
}

function mealSuggestion(ctx: CoachContext, text: string): string {
  const type = parseMealType(text) || mealByHour(ctx.now.getHours());
  const target = targetCalories(ctx);
  const t = dayTotals(ctx);
  const left = target ? target - t.calories : 0;
  const share: Record<MealType, number> = { breakfast: 0.26, lunch: 0.36, dinner: 0.28, snack: 0.11 };
  const budget = target ? Math.round(Math.max(150, Math.min(left, target * share[type] * 1.15))) : 500;
  const meals = suggestMeals(ctx, type, budget, 3, parseMenuOptions(text, ctx, excludedFoods(text)));
  const lines = [`🍽️ **Tipy na ${MEAL_SK_ACC[type]}**`];
  if (target) {
    lines.push(left > 0 ? `Dnes ti ostáva ${left} kcal, porcie som nastavil približne na ${budget} kcal.` : 'Dnešný cieľ už máš naplnený, preto sú porcie menšie.');
  }
  lines.push('');
  meals.forEach(meal => {
    lines.push(`**${meal.name}** – ${meal.calories} kcal, bielkoviny ${meal.protein} g`);
    lines.push(`  • ${meal.ingredients.map(ingredientText).join(', ')}`);
  });
  lines.push('', 'Keď si niečo z toho dáš, napíš mi to a zapíšem ti to.');
  return lines.join('\n');
}

/** Suroviny, ktoré používateľ nechce: "bez rýb", "nemám rád tvaroh", "okrem vajec". */
function excludedFoods(text: string): string[] {
  const names = new Set<string>();
  const re = /\b(?:bez|okrem|nechcem|neznasam|nemam rad|nemam rada|nejem|alergi\w* na)\s+([a-z ]{3,40})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    findFoods(m[1]).hits.forEach(h => names.add(h.item.name));
    if (/ryb|ryby/.test(m[1])) ['Ryba', 'Losos', 'Tuniak'].forEach(n => names.add(n));
    if (/vajc|vajec|vajic/.test(m[1])) names.add('Vajce');
    if (/orech|arasid/.test(m[1])) ['Orechy', 'Arašidové maslo'].forEach(n => names.add(n));
  }
  return Array.from(names);
}

function greeting(ctx: CoachContext): string {
  const name = firstName(ctx);
  const hour = ctx.now.getHours();
  const hello = hour < 10 ? 'Dobré ráno' : hour < 18 ? 'Ahoj' : 'Dobrý večer';
  const t = dayTotals(ctx);
  const target = targetCalories(ctx);
  const lines = [`👋 ${hello}${name ? ', ' + name : ''}!`];
  if (t.count && target) lines.push(`Dnes máš zatiaľ ${t.calories} z ${target} kcal.`);
  else if (target) lines.push(`Dnes ešte nemáš nič zapísané, tvoj cieľ je ${target} kcal.`);
  lines.push('', 'Napíš mi, čo si jedol alebo ako si cvičil, a zapíšem to. Alebo sa opýtaj – napríklad „čo si mám dať na večeru?“ či „ako sa mi darilo tento týždeň?“');
  return lines.join('\n');
}

const FALLBACK =
  'Tejto správe som úplne nerozumel. 🤔 Skús to napísať inak, napríklad:\n\n' +
  '  • „zjedol som 2 vajcia a chlieb“\n  • „bol som behať 30 minút“\n  • „koľko mi dnes ostáva kalórií?“\n  • „čo si mám dať na večeru?“\n  • „zostav mi tréningový plán“\n\nAlebo napíš „čo vieš“ a ukážem ti všetko, s čím pomôžem.';

// ------------------------------------------------------------
// Hlavná funkcia
// ------------------------------------------------------------

/** Zapíše jedlo, na ktoré sa tréner pýtal, a zapamätá si ho. */
function logPending(ctx: CoachContext, perPiece: number): EngineResult {
  const { name, count } = ctx.pending as { name: string; count: number };
  const calories = Math.round(perPiece * count);
  const label = count === 1 ? name : `${name} ×${String(count).replace('.', ',')}`;
  const data = {
    name: label, calories, protein: 0, carbs: 0, fats: 0,
    mealType: mealByHour(ctx.now.getHours()), category: 'food'
  };
  const lines = [
    '✅ Zapísané do denníka:', `  • 🍽️ ${label} – ${calories} kcal`, '',
    ...todayLine(ctx, { calories, protein: 0, burned: 0 }), '',
    `Zapamätal som si: ${name} = ${perPiece} kcal. Nabudúce stačí napísať názov.`
  ];
  return {
    text: lines.join('\n'),
    actions: [
      { kind: 'save', type: 'food', data, label },
      { kind: 'learn', food: { name, calories: perPiece } }
    ],
    intent: 'log'
  };
}

export function respond(message: string, ctx: CoachContext): EngineResult {
  const full = norm(message);
  if (!full) return { text: FALLBACK, actions: [], intent: 'empty', fallback: true };

  // odpoveď na otázku "koľko to má kalórií?" – stačí samotné číslo
  if (ctx.pending) {
    const answer = /^(?:asi |cca |okolo |priblizne |malo |mala |mal |ma |je to |bolo to |to je )*(\d{2,4})(?: ?(?:kcal|kalori\w*|kal))?$/.exec(full);
    if (answer) return logPending(ctx, +answer[1]);
  }

  const question = /\?/.test(message) ||
    /^(kolko|ako|co|aky|aka|ake|aku|preco|kedy|kde|ktor\w*|mozem|je |su |da sa|oplati|poradis|vies|navrhni|odporuc|porad|zostav|ukaz|povedz|chcem vediet)/.test(full);
  const future = /\b(chcem|chcel\w* by som|pojdem|planujem|zajtra|mal\w* by som|chystam sa|rozmyslam|mam ist|oplati sa|mozem)\b/.test(full);

  const planning = /jedalnic|nakupn\w* zoznam|zoznam na nakup|\bplan\w*|\bmenu\b|recept|navrhn|odporuc|porad\w* mi|\btip\w*/.test(full);
  const p: Parse = {
    work: full, full, actions: [], notes: [], tips: [], asks: [],
    question, future: future || planning, when: parseWhen(full)
  };

  detectWeight(p, ctx);
  detectSleep(p, ctx);
  detectMood(p, ctx);
  detectStress(p, ctx);
  detectExercise(p, ctx);
  detectFood(p, ctx, message);

  if (p.actions.length) {
    return { text: confirmation(p, ctx), actions: p.actions, intent: 'log', pending: p.pending };
  }
  if (p.pending) return { text: p.asks.join('\n'), actions: [], intent: 'ask', pending: p.pending };

  const adjusted = adjustLast(full, ctx);
  if (adjusted) return adjusted;

  // "a čo tá tribitka?" – používateľ pripomína jedlo, ktoré v zápise chýba
  const also = /^a (?:co|este) (?:s |so )?(?:ta |ten |to |tie |tym |tou |tu |moja |moj )?(.+)$/.exec(full);
  if (also && !/vies|mozes|dokazes|umies|robit|dalej|teraz/.test(also[1]) && (ctx.lastBatch || []).some(e => e.type === 'food')) {
    if (findFoods(also[1], customIndex(ctx.customFoods)).hits.length) {
      return respond(`zjedol som ${also[1]}`, ctx);
    }
    const word = tokens(also[1]).filter(isContentWord).pop();
    if (word) {
      const name = originalWord(message, word);
      return { text: askCalories(name, 1), actions: [], intent: 'ask', pending: { name, count: 1 } };
    }
  }

  const short = tokens(full).length <= 5;
  const has = (re: RegExp) => re.test(full);

  if (has(/\b(zmaz|vymaz|zrus|odstran|vrat)\w*\b.*\b(posledn\w*|zaznam\w*|spat|to)\b|^(zmaz|vymaz|zrus) to\b|^(spat|undo)$/)) {
    return ctx.canUndo
      ? { text: '↩️ Posledný záznam som vymazal.', actions: [{ kind: 'undo' }], intent: 'undo' }
      : { text: 'V tomto rozhovore nemám záznam, ktorý by som vedel vrátiť. Staršie záznamy vymažeš v Tabuľkách.', actions: [], intent: 'undo' };
  }

  const injury = findTopic(full);
  if (injury?.id === 'injury') return { text: injury.answer(ctx), actions: [], intent: 'topic:injury' };

  if (p.asks.length) return { text: p.asks.join('\n'), actions: [], intent: 'ask' };

  if (short && has(/^(ahoj|ahojte|cau|caw|cus|zdravim|dobry den|dobre rano|dobry vecer|servus|nazdar|hey|hi|hello|cauko|dobry)\b/)) {
    return { text: greeting(ctx), actions: [], intent: 'greeting' };
  }
  if (short && has(/dakujem|vdaka|\bdik\b|diky|si super|super si|parada/)) {
    return { text: pick(['Rado sa stalo! 💪 Ideme ďalej.', 'Nemáš za čo. Som tu, kedykoľvek budeš potrebovať. 🙂', 'S radosťou! Daj vedieť, keď budeš chcieť niečo zapísať alebo poradiť.']), actions: [], intent: 'thanks' };
  }
  if (has(/co (este )?(vsetko )?(este )?(vies|dokazes|umies|zvladnes)|kto si|^pomoc$|^help$|ako (ta|to) pouzivat|ako fungujes|co mozem (napisat|robit)|s cim (mi )?(vies )?pomoz/)) {
    return { text: CAPABILITIES, actions: [], intent: 'capabilities' };
  }

  if (has(/(kolko|co) .*(dnes|zatial).*(zjedol|zjedla|prijal|prijala|najedol|mal|mala)|kolko (mi )?(dnes )?(este )?(zostava|ostava|zvysuje|mozem (este )?(zjest|jest))|dnesn\w* (prijem|kalori\w*|bilanc\w*|prehlad|sumar)|ako som na tom dnes|kolko mam dnes|bilanc|moj dnesok|dnesny den/)) {
    return { text: todayStatus(ctx), actions: [], intent: 'today' };
  }
  if (has(/tyzden|tyzdn|report|zhrnutie|sumar|ako sa mi dari|ako som na tom|pokrok|progres|vyhodnot|statistik|prehlad/) && !has(/jedalnic|nakup|strav|menu|diet/)) {
    return { text: weeklyReportText(ctx), actions: [], intent: 'weekly' };
  }
  if (has(/(moja|aka|aku|akej) .*vah|kolko vazim|vyvoj vahy|trend vahy|moju vahu/)) {
    return { text: weightStatus(ctx), actions: [], intent: 'weight' };
  }
  if (has(/\bbmi\b/)) return { text: bmiAnswer(ctx), actions: [], intent: 'bmi' };
  if (has(/kolko (kalorii|kcal|energie) (denne )?(potrebujem|mam (jest|prijat|zjest|mat)|by som mal\w*)|moj (kaloricky |denny )*(ciel|prijem)|bazal|\bbmr\b|\btdee\b|udrziavac|kaloricky prijem/)) {
    return { text: energyNeeds(ctx), actions: [], intent: 'energy' };
  }

  const need = has(/potrebujem|mam (jest|prijat|zjest|mat)|denne|by som mal/);
  const foods = findFoods(full, customIndex(ctx.customFoods)).hits;
  if (foods.length && !need && !planning && (short || has(/kalori|kcal|bielkovin|protein|sacharid|tuk|cukr|hodnot|zdrav/))) {
    return { text: nutritionLookup(foods), actions: [], intent: 'nutrition' };
  }

  const toks = tokenize(full);
  let activity: ActivityItem | null = null;
  for (let i = 0; i < toks.length && !activity; i++) activity = matchAt(ACTIVITY_INDEX, toks, i)?.item || null;
  if (activity && has(/kolko|spal|kalori|kcal/) && !has(/plan|kolkokrat|ako casto/)) {
    return { text: burnLookup(ctx, activity, full), actions: [], intent: 'burn' };
  }
  if (activity && future && !has(/plan|ako |kolkokrat/)) {
    return {
      text: `👍 Dobrý plán! ${burnLookup(ctx, activity, full).split('\n')[0]}\n\nKeď to budeš mať za sebou, napíš mi to (napr. „${activity.name.toLowerCase()} 30 minút“) a zapíšem ti to do denníka.`,
      actions: [], intent: 'future-activity'
    };
  }

  if (has(/nakupn\w* zoznam|zoznam (na )?nakup|co (mam )?(na)?kupit|nakup na tyzden/)) {
    return { text: shoppingListText(ctx, parseMenuOptions(full, ctx, excludedFoods(full))), actions: [], intent: 'shopping' };
  }
  if (has(/jedalnic|jedalny listok|menu na (den|dnes|zajtra|cely|tyzden)|co (mam )?jest cely den|plan stravy|stravovac\w* plan|co jest pocas dna|dieta na|diet\w* plan|naplanuj.*(jedl|strav)/)) {
    const opts = parseMenuOptions(full, ctx, excludedFoods(full));
    const another = has(/\b(iny|inak|dalsi|zmen|novy|nove|este jeden)\b/);
    if (has(/tyzden|tyzdn|7 dni|sedem dni|cely tyzden/)) {
      if (another) opts.seed = weekSeed(ctx.now) + Math.floor(Math.random() * 1e6) + 1;
      return { text: weekPlanText(ctx, opts), actions: [], intent: 'menu-week' };
    }
    return { text: dayPlanText(ctx, opts), actions: [], intent: 'menu' };
  }
  if (has(/(co|nieco|navrh\w*|odporuc\w*|porad\w*|tip\w*|recept\w*|inspirac\w*|napad\w*).*(jest|zjest|jedl\w*|ranajk\w*|obed\w*|vecer\w*|desiat\w*|olovrant|snack|dat si|uvarit|navarit|pod zub)|co si (mam )?dat|som hladn|mam hlad|\b(hrozny|velky|strasny|vlci) hlad|hladujem|co (mam )?(dnes )?varit/)) {
    return { text: mealSuggestion(ctx, full), actions: [], intent: 'meal' };
  }

  if (has(/cvik|cvicen|cvicit|trening|posiln|spevn|precvic|vyrysov|zosiln|nabrat|chcem (vacs|silnejs|pevnejs)/)) {
    const muscle = MUSCLE_EXERCISES.find(mx => mx.match.test(full));
    if (muscle) {
      return {
        text: `💪 **Cviky na ${muscle.title}**\n\n` + muscle.items.map(i => `  • ${i}`).join('\n') +
          '\n\nVyber si 3–4 cviky a zaraď ich 2× týždenne. Techniku uprednostni pred váhou.',
        actions: [], intent: 'muscle'
      };
    }
  }
  if (has(/(trening\w*|cvicebn\w*|posilnovac\w*|fitness) plan|plan (cvicen|trening|na cvicen)|zostav.*(plan|trening)|ako (mam )?(zacat )?(cvicit|trenovat)|co (mam )?(dnes )?(cvicit|trenovat)|aky trening|rozpis (cvicen|trening)|navrhni.*trening|chcem zacat cvicit|porad\w* .*(trening|cvicen)|pomoz\w* .*(trening|cvicen)/)) {
    const days = /(\d)\s*(?:x|krat|dni|dny|den|treningy|treningov)/.exec(full);
    return { text: workoutPlanText(buildWorkoutPlan(ctx, days ? +days[1] : undefined)), actions: [], intent: 'plan' };
  }

  const topic = findTopic(full);
  if (topic) return { text: topic.answer(ctx), actions: [], intent: `topic:${topic.id}` };

  if (foods.length) return { text: nutritionLookup(foods), actions: [], intent: 'nutrition' };
  return { text: FALLBACK, actions: [], intent: 'fallback', fallback: true };
}
