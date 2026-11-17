#!/usr/bin/env node
/**
 * Stiahne potraviny predávané na Slovensku a v Česku z Open Food Facts,
 * vyčistí ich a uloží do public/data/foods.json pre AI trénera.
 *
 *   node scripts/build-food-catalog.mjs
 *
 * Dáta: Open Food Facts (https://world.openfoodfacts.org), licencia ODbL.
 * Výsledný súbor je odvodená databáza a platí preň rovnaká licencia.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'foods.json');
// Vyhľadávacia služba Open Food Facts (search-a-licious) – zvláda stránkovanie do 10 000 výsledkov.
const API = 'https://search.openfoodfacts.org/search';
const COUNTRIES = ['en:slovakia', 'en:czech-republic'];
const PAGE_SIZE = 100;
const MAX_PAGES = 100;
const NAME_LANGS = ['sk', 'cs', 'en', 'de', 'pl', 'hu', 'it', 'fr', 'es'];
const FIELDS = [
  'code', 'lang', 'brands', 'quantity', 'unique_scans_n', 'categories_tags', 'nutriments',
  'product_name', ...NAME_LANGS.map(l => `product_name_${l}`)
].join(',');
const DELAY_MS = 1000;
const USER_AGENT = 'food-catalog-builder/1.0';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPage(country, page) {
  const q = encodeURIComponent(`countries_tags:"${country}"`);
  const url = `${API}?q=${q}&page_size=${PAGE_SIZE}&page=${page}&sort_by=-unique_scans_n&fields=${FIELDS}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) return await res.json();
      console.warn(`  ${country} s.${page}: HTTP ${res.status}, pokus ${attempt}`);
    } catch (err) {
      console.warn(`  ${country} s.${page}: ${err.message}, pokus ${attempt}`);
    }
    await sleep(DELAY_MS * 5 * attempt);
  }
  console.warn(`  ${country} s.${page}: preskakujem`);
  return null;
}

const LATIN = /^[\p{Script=Latin}0-9\s.,:;%&'’()\-+\/!*°]+$/u;
const num = value => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const r1 = value => Math.round(value * 10) / 10;

function pickName(p) {
  const order = ['sk', 'cs', p.lang, ...NAME_LANGS].filter(Boolean);
  for (const lang of [...order.map(l => `product_name_${l}`), 'product_name']) {
    const raw = p[lang];
    const name = (Array.isArray(raw) ? raw[0] : raw || '').replace(/\s+/g, ' ').trim();
    if (name.length >= 2 && name.length <= 70 && LATIN.test(name) && /\p{L}{2}/u.test(name)) return name;
  }
  return null;
}

/** Hmotnosť jedného kusu z údaja o balení: "46 g" → 46, "6 x 40 g" → 40, "0,33 l" → 330. */
function pieceFromQuantity(quantity, drink) {
  const q = String(quantity || '').toLowerCase().replace(',', '.');
  const multi = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|ml)\b/.exec(q);
  if (multi) return Math.round(+multi[2]);
  const single = /(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/.exec(q);
  if (!single) return 0;
  const factor = { kg: 1000, g: 1, ml: 1, cl: 10, l: 1000 }[single[2]];
  const amount = Math.round(+single[1] * factor);
  // celé balenie je jedna porcia len pri malých kusoch (tyčinka, jogurt, plechovka)
  if (drink) return amount >= 100 && amount <= 500 ? amount : 0;
  return amount >= 10 && amount <= 150 ? amount : 0;
}

function clean(p) {
  const n = p.nutriments || {};
  const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
  const kcal = num(n['energy-kcal_100g']) ?? (kj !== null ? kj / 4.184 : null);
  const protein = num(n.proteins_100g);
  const carbs = num(n.carbohydrates_100g);
  const fats = num(n.fat_100g);
  if (kcal === null || kcal < 0 || kcal > 920) return null;
  if ([protein, carbs, fats].filter(v => v !== null).length < 2) return null;

  const P = protein ?? 0, C = carbs ?? 0, F = fats ?? 0;
  if (P < 0 || C < 0 || F < 0 || P + C + F > 105) return null;

  const categories = p.categories_tags || [];
  const alcohol = num(n.alcohol_100g) ?? 0;
  // pozor: "en:plant-based-foods-and-beverages" je spoločná kategória aj pre müsli či orechy
  const drink = categories.some(c =>
    /^en:(beverages|non-alcoholic-beverages|alcoholic-beverages|carbonated-drinks|sodas|energy-drinks|juices|fruit-juices|waters|beers|wines|teas|iced-teas|coffee-drinks|dairy-drinks|plant-based-milk-alternatives|drinkable-yogurts)$/.test(c));
  // energia musí zhruba sedieť s makrami (alkohol a vláknina majú vlastné kalórie)
  const computed = 4 * P + 4 * C + 9 * F + 7 * alcohol;
  if (alcohol < 0.5 && Math.abs(computed - kcal) > Math.max(45, kcal * 0.35)) return null;

  const name = pickName(p);
  if (!name) return null;
  const brandRaw = Array.isArray(p.brands) ? p.brands[0] : String(p.brands || '').split(',')[0];
  const brand = (brandRaw || '').trim();

  return {
    name,
    brand: brand && LATIN.test(brand) && brand.length <= 40 && !name.toLowerCase().includes(brand.toLowerCase()) ? brand : '',
    kcal: Math.round(kcal),
    protein: r1(P),
    carbs: r1(C),
    fats: r1(F),
    serving: pieceFromQuantity(p.quantity, drink),
    drink,
    scans: num(p.unique_scans_n) ?? 0
  };
}

const key = item => `${item.name}|${item.brand}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function main() {
  const byKey = new Map();
  let seen = 0;
  for (const country of COUNTRIES) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await fetchPage(country, page);
      if (!data) continue;
      const hits = data.hits || [];
      for (const product of hits) {
        seen++;
        const item = clean(product);
        if (!item) continue;
        const k = key(item);
        const prev = byKey.get(k);
        if (!prev || item.scans > prev.scans) byKey.set(k, item);
      }
      if (page % 10 === 0 || hits.length < PAGE_SIZE) {
        console.log(`${country}: strana ${page}/${data.page_count}, zatiaľ ${byKey.size} použiteľných z ${seen}`);
      }
      if (hits.length < PAGE_SIZE || page >= (data.page_count || 0)) break;
      await sleep(DELAY_MS);
    }
  }

  const items = [...byKey.values()].sort((a, b) => b.scans - a.scans || a.name.localeCompare(b.name));
  // kompaktný formát: [názov, značka, kcal, bielkoviny, sacharidy, tuky, kus_g, nápoj, skeny]
  const rows = items.map(i => [i.name, i.brand, i.kcal, i.protein, i.carbs, i.fats, i.serving, i.drink ? 1 : 0, i.scans]);
  const out = {
    source: 'Open Food Facts – https://world.openfoodfacts.org',
    license: 'ODbL 1.0 – https://opendatacommons.org/licenses/odbl/1-0/',
    generated: new Date().toISOString().slice(0, 10),
    fields: ['name', 'brand', 'kcal', 'protein', 'carbs', 'fats', 'serving', 'drink', 'scans'],
    count: rows.length,
    items: rows
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`Hotovo: ${rows.length} potravín z ${seen} stiahnutých → ${OUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
