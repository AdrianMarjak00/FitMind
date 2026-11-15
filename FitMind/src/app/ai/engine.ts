import { ACTIVITIES, ActivityItem } from './exercise-db';
import { FOODS, FoodItem } from './food-db';
import { CAPABILITIES, findTopic } from './knowledge';
import {
  MEAL_SK, MUSCLE_EXERCISES, MealType, buildWorkoutPlan, dayMenuText, suggestMeals, workoutPlanText
} from './planner';
import { weeklyReportText } from './coach';
import {
  CoachContext, EntryType, bmi, bmiLabel, bmr, currentWeight, dayTotals, firstName,
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
  | { kind: 'undo' };

export interface EngineResult {
  text: string;
  actions: EngineAction[];
  intent: string;
  /** Engine otázke nerozumel – môže ju prevziať voliteľný LLM. */
  fallback?: boolean;
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
  | { kind: 'piece' } | { kind: 'slice' } | { kind: 'portion' };

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
unit('pohar|pohare|poharov|salka|salky|hrncek|sklenica|sklenicu', { kind: 'amount', value: 250 });
unit('flasa|flasu|flase', { kind: 'amount', value: 500 });
unit('plechovka|plechovku|plechovky', { kind: 'amount', value: 330 });
unit('ks|kus|kusy|kusov|x|kusok|kusky', { kind: 'piece' });
unit('platok|platky|platkov|krajec|krajce|krajcov|kolecko|kolecka', { kind: 'slice' });
unit('porcia|porciu|porcie|tanier|taniere|miska|misku|misky', { kind: 'portion' });

const SIZE_WORDS: Record<string, number> = {
  velky: 1.5, velka: 1.5, velke: 1.5, velku: 1.5, dvojity: 2, dvojite: 2, dvojitu: 2,
  maly: 0.7, male: 0.7, malu: 0.7, mensi: 0.7, mensiu: 0.7, mensie: 0.7
};

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
    if (!p.question && /\b(spal|spala|naspal|naspala)\b/.test(p.work)) {
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

interface FoodHit { item: FoodItem; grams: number; }

function findFoods(work: string): { hits: FoodHit[]; quantified: boolean; work: string } {
  const toks = tokenize(work);
  const hits: FoodHit[] = [];
  const used = new Set<number>();
  let quantified = false;
  let out = work;

  for (let i = 0; i < toks.length; i++) {
    const hit = matchAt(FOOD_INDEX, toks, i);
    if (!hit) continue;
    const item = hit.item;
    const len = hit.stems.length;
    let grams: number | null = null;

    const free = (k: number) => k >= 0 && !used.has(k);
    let j = i - 1;
    let size = 1;
    if (free(j) && SIZE_WORDS[toks[j].t]) { size = SIZE_WORDS[toks[j].t]; used.add(j); j--; }

    const u = free(j) ? UNITS.get(toks[j].s) : undefined;
    const resolve = (count: number, un: Unit | undefined): number => {
      if (!un) return count * (item.piece ?? item.portion);
      if (un.kind === 'amount') return count * un.value;
      if (un.kind === 'piece') return count * (item.piece ?? item.slice ?? item.portion);
      if (un.kind === 'slice') return count * (item.slice ?? item.piece ?? 25);
      return count * item.portion;
    };
    if (u) {
      const n = free(j - 1) ? parseNumber(toks[j - 1].t) : null;
      grams = resolve(n ?? 1, u);
      used.add(j); if (n !== null) used.add(j - 1);
      quantified = true;
    } else {
      const n = free(j) ? parseNumber(toks[j].t) : null;
      if (n !== null) { grams = resolve(n, undefined); used.add(j); quantified = true; }
    }

    // množstvo až za jedlom: "ryža 200 g"
    if (grams === null) {
      const k = i + len;
      const n = k < toks.length ? parseNumber(toks[k].t) : null;
      const un = k + 1 < toks.length ? UNITS.get(toks[k + 1].s) : undefined;
      if (n !== null && un) {
        grams = resolve(n, un);
        used.add(k); used.add(k + 1);
        quantified = true;
      }
    }

    if (grams === null) {
      const withWord = i > 0 && /^(s|so)$/.test(toks[i - 1].t);
      grams = withWord && item.side ? item.side : item.portion;
    }
    grams = Math.round(grams * size);
    if (size !== 1) quantified = true;

    if (grams > 0 && grams <= 5000) hits.push({ item, grams });
    for (let k = i; k < i + len; k++) {
      used.add(k);
      out = blank(out, toks[k].i, toks[k].t.length);
    }
    i += len - 1;
  }
  return { hits, quantified, work: out };
}

function foodEntry(hit: FoodHit, meal: MealType, date?: string): any {
  const k = hit.grams / 100;
  return {
    name: `${hit.item.name} (${hit.grams} ${hit.item.drink ? 'ml' : 'g'})`,
    calories: Math.round(hit.item.kcal * k),
    protein: round(hit.item.protein * k, 1),
    carbs: round(hit.item.carbs * k, 1),
    fats: round(hit.item.fats * k, 1),
    mealType: meal,
    category: hit.item.drink ? 'drink' : 'food',
    date
  };
}

const EAT_VERB = /\b(zjedol|zjedla|jedol|jedla|zjedli|vypil|vypila|pil som|pila som|ranajkoval\w*|obedoval\w*|veceral\w*|desiatoval\w*|olovrantoval\w*|papal\w*|zhltol|zhltla|dojedol|dojedla|najedol|najedla|schrumal\w*)\b/;
const LOG_VERB = /\b(mal som|mala som|mal som si|som si dal\w*|som mal|som mala|som si daval\w*|dal som si|dala som si|daval\w* som si|zapis|zapisat|pridaj|pridat|zaznamenaj|zaznac|uloz|dnes som mal\w*|bolo na|bol na|bola na)\b/;

function detectFood(p: Parse, ctx: CoachContext, original: string): void {
  let explicitKcal: number | null = null;
  const kcal = /(\d+(?:\.\d+)?)\s*(?:kcal|kalori\w*|kal)\b/.exec(p.work);
  if (kcal) {
    explicitKcal = parseFloat(kcal[1]);
    p.work = blank(p.work, kcal.index, kcal[0].length);
  }

  const { hits, quantified, work } = findFoods(p.work);
  const mealWord = parseMealType(p.full);
  const hasVerb = EAT_VERB.test(p.full) || LOG_VERB.test(p.full);
  const lookup = /\b(kolko|ake|aka|aku|ma|maju|obsahuj\w*)\b.*\b(kalori\w*|kcal|bielkovin|protein\w*|sacharid\w*|tuk\w*|cukr\w*|hodnot\w*)\b/.test(p.full) && !hasVerb;
  const wantsLog = !p.future && !lookup && (hasVerb || (!p.question && (!!mealWord || quantified || explicitKcal !== null)));

  const meal = mealWord || mealByHour(ctx.now.getHours());
  const date = entryDate(ctx, p.when, meal);

  if (hits.length && wantsLog) {
    p.work = work;
    const entries = hits.map(h => foodEntry(h, meal, date));
    if (explicitKcal !== null && entries.length === 1 && explicitKcal > 0) {
      const scale = entries[0].calories > 0 ? explicitKcal / entries[0].calories : 1;
      entries[0].calories = Math.round(explicitKcal);
      (['protein', 'carbs', 'fats'] as const).forEach(key => entries[0][key] = round(entries[0][key] * scale, 1));
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
    const name = original
      .replace(/\d+([.,]\d+)?\s*(kcal|kal\w*)/gi, ' ')
      .replace(/^\s*(dnes|včera|vcera|predvčerom)?\s*(na\s+\S+\s+)?(som\s+)?(si\s+)?(zjedol|zjedla|jedol|jedla|mal|mala|dal|dala|vypil|vypila|zapíš|zapis|pridaj)?(\s+som)?(\s+si)?(\s+mi)?/i, ' ')
      .replace(/[.,!?:;()]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    const label = name ? name[0].toUpperCase() + name.slice(1) : 'Jedlo';
    const data = { name: label, calories: Math.round(explicitKcal), protein: 0, carbs: 0, fats: 0, mealType: meal, category: 'food', date };
    p.actions.push({ kind: 'save', type: 'food', label, data });
    p.notes.push(`🍽️ ${label} – ${data.calories} kcal`);
    return;
  }

  if (!hits.length && EAT_VERB.test(p.full) && !p.question && !p.actions.length) {
    p.asks.push('Toto jedlo ešte v databáze nemám. Napíš mi ho aj s kalóriami, napríklad „zjedol som langoš 600 kcal“, a zapíšem ho.');
  }
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
  if (foods.length) lines.push('', 'Ak množstvo nesedí, napíš „zmaž posledný záznam“ a pošli mi ho presnejšie (napr. v gramoch).');
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
  const share: Record<MealType, number> = { breakfast: 0.28, lunch: 0.38, dinner: 0.32, snack: 0.14 };
  const budget = target ? Math.max(150, Math.min(left, target * share[type] * 1.2)) : 0;
  const meals = suggestMeals(ctx, type, budget);
  const lines = [`🍽️ **Tipy na ${MEAL_SK[type] === 'večera' ? 'večeru' : MEAL_SK[type] === 'desiata' ? 'desiatu' : MEAL_SK[type]}**`];
  if (target) {
    lines.push(left > 0 ? `Dnes ti ostáva ${left} kcal, takže hľadám niečo do ${Math.round(budget)} kcal.` : 'Dnešný cieľ už máš naplnený, preto vyberám ľahšie možnosti.');
  }
  lines.push('');
  meals.forEach(mm => lines.push(`  • ${mm.name} – približne ${mm.kcal} kcal, ${mm.protein} g bielkovín`));
  lines.push('', 'Keď si niečo z toho dáš, napíš mi to a zapíšem ti to.');
  return lines.join('\n');
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

export function respond(message: string, ctx: CoachContext): EngineResult {
  const full = norm(message);
  if (!full) return { text: FALLBACK, actions: [], intent: 'empty', fallback: true };

  const question = /\?/.test(message) ||
    /^(kolko|ako|co|aky|aka|ake|aku|preco|kedy|kde|ktor\w*|mozem|je |su |da sa|oplati|poradis|vies|navrhni|odporuc|porad|zostav|ukaz|povedz|chcem vediet)/.test(full);
  const future = /\b(chcem|chcel\w* by som|pojdem|planujem|zajtra|mal\w* by som|chystam sa|rozmyslam|mam ist|oplati sa|mozem)\b/.test(full);

  const p: Parse = {
    work: full, full, actions: [], notes: [], tips: [], asks: [],
    question, future, when: parseWhen(full)
  };

  detectWeight(p, ctx);
  detectSleep(p, ctx);
  detectMood(p, ctx);
  detectStress(p, ctx);
  detectExercise(p, ctx);
  detectFood(p, ctx, message);

  if (p.actions.length) {
    return { text: confirmation(p, ctx), actions: p.actions, intent: 'log' };
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
  if (has(/co (vsetko )?(vies|dokazes|umies|zvladnes)|kto si|^pomoc$|^help$|ako (ta|to) pouzivat|ako fungujes|co mozem (napisat|robit)|s cim (mi )?(vies )?pomoz/)) {
    return { text: CAPABILITIES, actions: [], intent: 'capabilities' };
  }

  if (has(/(kolko|co) .*(dnes|zatial).*(zjedol|zjedla|prijal|prijala|najedol|mal|mala)|kolko (mi )?(dnes )?(este )?(zostava|ostava|zvysuje|mozem (este )?(zjest|jest))|dnesn\w* (prijem|kalori\w*|bilanc\w*|prehlad|sumar)|ako som na tom dnes|kolko mam dnes|bilanc|moj dnesok|dnesny den/)) {
    return { text: todayStatus(ctx), actions: [], intent: 'today' };
  }
  if (has(/tyzden|tyzdn|report|zhrnutie|sumar|ako sa mi dari|ako som na tom|pokrok|progres|vyhodnot|statistik|prehlad/)) {
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
  const foods = findFoods(full).hits;
  if (foods.length && !need && (short || has(/kalori|kcal|bielkovin|protein|sacharid|tuk|cukr|hodnot|zdrav/))) {
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

  if (has(/jedalnic|jedalny listok|menu na (den|dnes|zajtra|cely)|co (mam )?jest cely den|plan stravy|stravovac\w* plan|co jest pocas dna/)) {
    return { text: dayMenuText(ctx), actions: [], intent: 'menu' };
  }
  if (has(/(co|nieco|navrh\w*|odporuc\w*|porad\w*|tip\w*|recept\w*|inspirac\w*|napad\w*).*(jest|zjest|jedl\w*|ranajk\w*|obed\w*|vecer\w*|desiat\w*|olovrant|snack|dat si|uvarit|navarit|pod zub)|co si (mam )?dat|som hladn|mam hlad|co (mam )?(dnes )?varit/)) {
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
  if (has(/(trening\w*|cvicebn\w*|posilnovac\w*|fitness) plan|plan (cvicen|trening|na cvicen)|zostav.*(plan|trening)|ako (mam )?(zacat )?(cvicit|trenovat)|co (mam )?(dnes )?(cvicit|trenovat)|aky trening|rozpis (cvicen|trening)|navrhni.*trening|chcem zacat cvicit/)) {
    const days = /(\d)\s*(?:x|krat|dni|dny|den|treningy|treningov)/.exec(full);
    return { text: workoutPlanText(buildWorkoutPlan(ctx, days ? +days[1] : undefined)), actions: [], intent: 'plan' };
  }

  const topic = findTopic(full);
  if (topic) return { text: topic.answer(ctx), actions: [], intent: `topic:${topic.id}` };

  if (foods.length) return { text: nutritionLookup(foods), actions: [], intent: 'nutrition' };
  return { text: FALLBACK, actions: [], intent: 'fallback', fallback: true };
}
