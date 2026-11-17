import { FoodItem } from './food-db';
import { norm, stem, tokens } from './text';

/**
 * Veľký katalóg potravín zo slovenských a českých obchodov (Open Food Facts,
 * licencia ODbL). Súbor public/data/foods.json vytvára skript
 * scripts/build-food-catalog.mjs; aplikácia ho načíta raz a engine v ňom
 * hľadá jedlá, ktoré nepozná jeho vlastná databáza (food-db.ts).
 *
 * Modul je čistý TypeScript – katalóg mu podá aplikácia cez loadCatalog().
 */

export interface CatalogFile {
  source?: string;
  license?: string;
  generated?: string;
  fields?: string[];
  items: Array<[string, string, number, number, number, number, number, number, number]>;
}

interface Entry {
  item: FoodItem;
  stems: string[];
  /** Slová bez odrezaných koncoviek – "milka" sa tak nepomýli s "milk". */
  words: Set<string>;
  brandStems: Set<string>;
  popularity: number;
}

let entries: Entry[] = [];
const byStem = new Map<string, number[]>();
const byPrefix = new Map<string, number[]>();
let generated = '';

const PREFIX = 5;
/** Slová, ktoré sú v názvoch produktov všade a nič neodlišujú. */
const NOISE = new Set([
  'bio', 'light', 'zero', 'max', 'mini', 'maxi', 'mix', 'classic', 'original', 'premium', 'extra', 'super',
  'balenie', 'kusy', 'kus', 'gram', 'with', 'and', 'the', 'pre', 'pro', 'bez', 'pri', 'nad', 'pod', 'mit', 'und'
]);

function push(map: Map<string, number[]>, key: string, id: number): void {
  const list = map.get(key);
  if (list) { if (list[list.length - 1] !== id) list.push(id); } else map.set(key, [id]);
}

function wordsOf(text: string): string[] {
  // "Lay's" → "lays", aby sa dalo nájsť tak, ako to ľudia píšu
  const plain = text.replace(/['’`]/g, '');
  return Array.from(new Set(tokens(norm(plain)).filter(t => t.length >= 3 && /[a-z]/.test(t))));
}

function stemsOf(text: string): string[] {
  return Array.from(new Set(wordsOf(text).map(stem)));
}

/** Načíta katalóg (pri opakovanom volaní ho nahradí). Vráti počet potravín. */
export function loadCatalog(file: CatalogFile): number {
  entries = [];
  byStem.clear();
  byPrefix.clear();
  generated = file.generated || '';
  for (const row of file.items || []) {
    const [name, brand, kcal, protein, carbs, fats, serving, drink, scans] = row;
    if (!name || !(kcal >= 0)) continue;
    const isDrink = drink === 1;
    const portion = serving > 0 ? serving : (isDrink ? 250 : 100);
    const item: FoodItem = {
      name: brand && !norm(name).includes(norm(brand)) ? `${name}, ${brand}` : name,
      aliases: [],
      kcal, protein, carbs, fats,
      portion,
      piece: serving > 0 && !isDrink ? serving : undefined,
      drink: isDrink,
      catalog: true
    };
    const stems = stemsOf(`${name} ${brand}`).filter(s => !NOISE.has(s));
    if (!stems.length) continue;
    const id = entries.length;
    entries.push({
      item, stems,
      words: new Set(wordsOf(`${name} ${brand}`)),
      brandStems: new Set(brand ? stemsOf(brand) : []),
      popularity: Math.log10((scans || 0) + 1)
    });
    for (const s of stems) {
      push(byStem, s, id);
      if (s.length >= PREFIX) push(byPrefix, s.slice(0, PREFIX), id);
    }
  }
  return entries.length;
}

export function catalogSize(): number {
  return entries.length;
}

export function catalogDate(): string {
  return generated;
}

/** Kandidáti pre jedno slovo – presná zhoda kmeňa alebo spoločný začiatok dlhšieho slova. */
function candidates(s: string): number[] {
  const exact = byStem.get(s) || [];
  if (s.length < PREFIX) return exact;
  const loose = (byPrefix.get(s.slice(0, PREFIX)) || []).filter(id =>
    entries[id].stems.some(t => t !== s && t.length >= PREFIX && (t.startsWith(s) || s.startsWith(t))));
  return exact.length ? Array.from(new Set([...exact, ...loose])) : loose;
}

/**
 * Nájde potravinu podľa slov zo správy (už normalizovaných, bez slovies a čísel).
 * Prvé slovo musí sedieť vždy; z ďalších sa započíta každé, ktoré sedí.
 */
export function searchCatalog(words: string[]): FoodItem | null {
  if (!entries.length) return null;
  const queryWords = words.map(w => norm(w.replace(/['’`]/g, ''))).filter(w => w.length >= 3);
  const queryStems = Array.from(new Set(queryWords.map(stem))).filter(s => !NOISE.has(s)).slice(0, 4);
  if (!queryStems.length) return null;

  const first = candidates(queryStems[0]);
  // príliš všeobecné slovo (napr. "jogurt") – to má riešiť vlastná databáza alebo otázka
  if (!first.length || (first.length > 600 && queryStems.length === 1)) return null;

  const matchSets = queryStems.slice(1).map(s => new Set(candidates(s)));
  let best: { id: number; score: number } | null = null;
  for (const id of first) {
    const extra = matchSets.reduce((n, set) => n + (set.has(id) ? 1 : 0), 0);
    const matched = 1 + extra;
    // pri dvoch slovách chceme obe, pri viacerých aspoň dve
    if (queryStems.length === 2 && matched < 2) continue;
    if (queryStems.length > 2 && matched < 2) continue;
    const e = entries[id];
    const coverage = matched / e.stems.length;
    const exactWords = queryWords.filter(w => e.words.has(w)).length;
    const brandHit = queryStems.some(s => e.brandStems.has(s)) ? 1 : 0;
    const score = matched * 10 + coverage * 6 + exactWords * 4 + brandHit * 2 + e.popularity;
    if (!best || score > best.score) best = { id, score };
  }
  return best ? entries[best.id].item : null;
}
