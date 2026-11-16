import { CoachContext, proteinTarget, targetCalories, tdee } from './context';
import { FOODS, FoodItem } from './food-db';
import { norm } from './text';

/**
 * Generátor jedálničkov. Recepty sú zložené zo surovín z databázy jedál,
 * takže kalórie aj makrá sa počítajú, nie odhadujú, a porcie sa dajú
 * presne prispôsobiť kalorickému cieľu používateľa.
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SK: Record<MealType, string> = {
  breakfast: 'raňajky', lunch: 'obed', dinner: 'večera', snack: 'desiata'
};
/** 4. pád – "tipy na večeru". */
export const MEAL_SK_ACC: Record<MealType, string> = {
  breakfast: 'raňajky', lunch: 'obed', dinner: 'večeru', snack: 'desiatu'
};

interface Recipe {
  type: MealType;
  name: string;
  items: Array<[string, number]>;   // [názov suroviny z FOODS, gramy]
  veg: boolean; vegan: boolean; noLactose: boolean; noGluten: boolean;
}

/** flags: v = vegetariánske, V = vegánske, l = bez laktózy, g = bez lepku */
function r(type: MealType, name: string, flags: string, ...items: Array<[string, number]>): Recipe {
  return {
    type, name, items,
    veg: /v/i.test(flags), vegan: /V/.test(flags), noLactose: /l/.test(flags), noGluten: /g/.test(flags)
  };
}

const RECIPES: Recipe[] = [
  // --- Raňajky ---
  r('breakfast', 'Ovsená kaša s banánom a arašidovým maslom', 'v', ['Ovsené vločky', 60], ['Mlieko', 200], ['Banán', 120], ['Arašidové maslo', 15]),
  r('breakfast', 'Praženica s celozrnným chlebom a paradajkou', 'vl', ['Vajce', 165], ['Celozrnný chlieb', 100], ['Paradajka', 120], ['Olivový olej', 5]),
  r('breakfast', 'Grécky jogurt s ovocím, orechmi a medom', 'vg', ['Grécky jogurt', 250], ['Jahody', 150], ['Orechy', 25], ['Med', 15]),
  r('breakfast', 'Tvaroh s banánom a ovsenými vločkami', 'v', ['Tvaroh', 250], ['Banán', 120], ['Ovsené vločky', 40], ['Med', 10]),
  r('breakfast', 'Celozrnný chlieb so šunkou, syrom a zeleninou', '', ['Celozrnný chlieb', 100], ['Šunka', 60], ['Syr eidam', 40], ['Paprika', 100]),
  r('breakfast', 'Vajíčka na tvrdo s avokádom a chlebom', 'vl', ['Vajce', 110], ['Avokádo', 70], ['Celozrnný chlieb', 100], ['Paradajka', 100]),
  r('breakfast', 'Müsli s jogurtom a ovocím', 'v', ['Müsli', 60], ['Biely jogurt', 200], ['Jablko', 160]),
  r('breakfast', 'Smoothie miska s ovsenými vločkami a orechmi', 'vVl', ['Banán', 120], ['Jahody', 150], ['Rastlinné mlieko', 250], ['Ovsené vločky', 50], ['Orechy', 20]),
  r('breakfast', 'Tofu praženica s chlebom a zeleninou', 'vVl', ['Tofu', 180], ['Celozrnný chlieb', 100], ['Paprika', 100], ['Olivový olej', 5]),
  r('breakfast', 'Cottage cheese s ryžovými chlebíkmi a uhorkou', 'vg', ['Cottage cheese', 200], ['Knäckebrot', 40], ['Uhorka', 150]),

  // --- Obed ---
  r('lunch', 'Kuracie prsia s ryžou a dusenou zeleninou', 'lg', ['Kuracie prsia', 170], ['Ryža (varená)', 220], ['Brokolica', 200], ['Olivový olej', 8]),
  r('lunch', 'Losos s varenými zemiakmi a šalátom', 'lg', ['Losos', 150], ['Zemiaky (varené)', 280], ['Šalát so zeleninou', 200], ['Olivový olej', 5]),
  r('lunch', 'Hovädzie na šťave so zemiakmi a zeleninou', 'lg', ['Hovädzie mäso', 150], ['Zemiaky (varené)', 280], ['Brokolica', 150]),
  r('lunch', 'Celozrnné cestoviny s tuniakom a paradajkovou omáčkou', 'l', ['Cestoviny (varené)', 260], ['Tuniak', 120], ['Paradajková omáčka', 150], ['Olivový olej', 8]),
  r('lunch', 'Morčacie mäso s kuskusom a pečenou zeleninou', 'l', ['Morčacie mäso', 170], ['Kuskus', 220], ['Paprika', 150], ['Olivový olej', 8]),
  r('lunch', 'Špagety s mletým mäsom a paradajkovou omáčkou', 'l', ['Cestoviny (varené)', 250], ['Mleté mäso', 110], ['Paradajková omáčka', 150]),
  r('lunch', 'Kuracie stehno s pohánkou a uhorkovým šalátom', 'lg', ['Kuracie stehno', 180], ['Pohánka', 220], ['Uhorkový šalát', 150]),
  r('lunch', 'Pečená ryba so zemiakmi a brokolicou', 'lg', ['Ryba', 200], ['Zemiaky (varené)', 300], ['Brokolica', 200], ['Olivový olej', 10]),
  r('lunch', 'Šošovica s vajcom a chlebom', 'vl', ['Fazuľa / strukoviny', 280], ['Vajce', 110], ['Celozrnný chlieb', 60], ['Olivový olej', 5]),
  r('lunch', 'Cícerové kari s ryžou', 'vVlg', ['Fazuľa / strukoviny', 250], ['Ryža (varená)', 220], ['Paradajková omáčka', 120], ['Olivový olej', 10]),
  r('lunch', 'Tofu so zeleninou a ryžou', 'vVlg', ['Tofu', 200], ['Ryža (varená)', 220], ['Brokolica', 200], ['Olivový olej', 8]),
  r('lunch', 'Quinoa miska s fazuľou, kukuricou a avokádom', 'vVlg', ['Quinoa', 220], ['Fazuľa / strukoviny', 150], ['Kukurica', 80], ['Avokádo', 70], ['Paradajka', 120]),

  // --- Večera ---
  r('dinner', 'Veľký šalát s kuracím mäsom a olivovým olejom', 'lg', ['Kuracie prsia', 150], ['Šalát so zeleninou', 300], ['Olivový olej', 12], ['Celozrnný chlieb', 50]),
  r('dinner', 'Omeleta so zeleninou a syrom', 'vg', ['Vajce', 165], ['Syr eidam', 30], ['Paprika', 120], ['Paradajka', 120], ['Olivový olej', 5]),
  r('dinner', 'Tvaroh s chlebom a zeleninou', 'v', ['Tvaroh', 250], ['Celozrnný chlieb', 80], ['Uhorka', 150], ['Paradajka', 120]),
  r('dinner', 'Tuniakový šalát s vajcom a chlebom', 'l', ['Tuniak', 120], ['Vajce', 110], ['Šalát so zeleninou', 250], ['Celozrnný chlieb', 60], ['Olivový olej', 8]),
  r('dinner', 'Pečený losos s brokolicou', 'lg', ['Losos', 150], ['Brokolica', 250], ['Zemiaky (varené)', 150]),
  r('dinner', 'Tortilla s kuracím mäsom a zeleninou', 'l', ['Tortilla', 60], ['Kuracie prsia', 130], ['Paprika', 100], ['Avokádo', 50], ['Paradajka', 100]),
  r('dinner', 'Mozzarella s paradajkami a celozrnným chlebom', 'v', ['Mozzarella', 125], ['Paradajka', 250], ['Celozrnný chlieb', 80], ['Olivový olej', 8]),
  r('dinner', 'Morčacie mäso s dusenou zeleninou a ryžou', 'lg', ['Morčacie mäso', 150], ['Brokolica', 250], ['Ryža (varená)', 150]),
  r('dinner', 'Strukovinový šalát s paprikou a chlebom', 'vVl', ['Fazuľa / strukoviny', 250], ['Paprika', 150], ['Paradajka', 120], ['Olivový olej', 10], ['Celozrnný chlieb', 50]),
  r('dinner', 'Pečené tofu so zeleninou a quinoou', 'vVlg', ['Tofu', 180], ['Brokolica', 250], ['Quinoa', 150], ['Olivový olej', 8]),

  // --- Desiata / olovrant ---
  r('snack', 'Jablko a hrsť orechov', 'vVlg', ['Jablko', 160], ['Orechy', 25]),
  r('snack', 'Grécky jogurt s ovocím', 'vg', ['Grécky jogurt', 200], ['Jahody', 120]),
  r('snack', 'Proteínový nápoj a banán', 'vg', ['Proteínový nápoj', 30], ['Banán', 120]),
  r('snack', 'Cottage cheese s paradajkou', 'vg', ['Cottage cheese', 180], ['Paradajka', 120]),
  r('snack', 'Ryžové chlebíky s arašidovým maslom', 'vVl', ['Knäckebrot', 30], ['Arašidové maslo', 20]),
  r('snack', 'Varené vajcia a zelenina', 'vlg', ['Vajce', 110], ['Mrkva', 80], ['Uhorka', 100]),
  r('snack', 'Hummus s mrkvou a paprikou', 'vVlg', ['Hummus', 60], ['Mrkva', 100], ['Paprika', 100]),
  r('snack', 'Banán s arašidovým maslom', 'vVlg', ['Banán', 120], ['Arašidové maslo', 20]),
  r('snack', 'Tvaroh s medom a orechmi', 'vg', ['Tvaroh', 150], ['Med', 10], ['Orechy', 15])
];

const FOOD_BY_NAME = new Map<string, FoodItem>(FOODS.map(f => [f.name, f]));

/** Suroviny, ktoré v receptoch chýbajú v databáze – používa to test. */
export function missingIngredients(): string[] {
  const missing = new Set<string>();
  RECIPES.forEach(rec => rec.items.forEach(([name]) => { if (!FOOD_BY_NAME.has(name)) missing.add(name); }));
  return Array.from(missing);
}

// ------------------------------------------------------------
// Výstupné typy
// ------------------------------------------------------------

export interface PlannedIngredient { name: string; amount: number; unit: 'g' | 'ml'; pieces?: number; }
export interface PlannedMeal {
  type: MealType;
  label: string;
  name: string;
  calories: number; protein: number; carbs: number; fats: number;
  ingredients: PlannedIngredient[];
}
export interface DayPlan {
  day?: string;
  target: number;
  meals: PlannedMeal[];
  calories: number; protein: number; carbs: number; fats: number;
}
export interface WeekPlan { target: number; days: DayPlan[]; averageCalories: number; averageProtein: number; }

export interface MenuOptions {
  calories?: number;
  mealsPerDay?: number;           // 3–6
  vegetarian?: boolean;
  vegan?: boolean;
  noLactose?: boolean;
  noGluten?: boolean;
  /** Názvy surovín (z FOODS), ktoré používateľ nechce. */
  exclude?: string[];
  highProtein?: boolean;
  /** Rovnaké semienko = rovnaký jedálniček (aby sedel aj nákupný zoznam). */
  seed?: number;
}

// ------------------------------------------------------------
// Pomocné funkcie
// ------------------------------------------------------------

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Číslo týždňa – jedálniček "na tento týždeň" ostáva celý týždeň rovnaký. */
export function weekSeed(now: Date): number {
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 86400000));
  return now.getFullYear() * 100 + week;
}

function profileDiet(ctx: CoachContext): { vegetarian: boolean; vegan: boolean; noLactose: boolean; noGluten: boolean } {
  const raw = norm([...(ctx.profile?.dietaryRestrictions || []), ...(ctx.profile?.medicalConditions || [])].join(' '));
  const vegan = /vegan/.test(raw);
  return {
    vegan,
    vegetarian: vegan || /veget/.test(raw),
    noLactose: /lakt|mliek/.test(raw),
    noGluten: /lepok|lepk|glut|celiak/.test(raw)
  };
}

function recipeKcal(rec: Recipe): number {
  return rec.items.reduce((s, [name, grams]) => s + (FOOD_BY_NAME.get(name)?.kcal || 0) * grams / 100, 0);
}
function recipeProtein(rec: Recipe): number {
  return rec.items.reduce((s, [name, grams]) => s + (FOOD_BY_NAME.get(name)?.protein || 0) * grams / 100, 0);
}

function allowed(ctx: CoachContext, opts: MenuOptions): Recipe[] {
  const diet = profileDiet(ctx);
  const vegan = opts.vegan || diet.vegan;
  const veg = vegan || opts.vegetarian || diet.vegetarian;
  const noLactose = opts.noLactose || diet.noLactose;
  const noGluten = opts.noGluten || diet.noGluten;
  const exclude = new Set(opts.exclude || []);
  return RECIPES.filter(rec =>
    (!vegan || rec.vegan) && (!veg || rec.veg) &&
    (!noLactose || rec.noLactose) && (!noGluten || rec.noGluten) &&
    !rec.items.some(([name]) => exclude.has(name)));
}

/** Zaokrúhli množstvo tak, aby sa dalo reálne navážiť (kusy na celé, gramy na 5/10). */
function niceAmount(food: FoodItem, grams: number): { amount: number; pieces?: number } {
  if (food.piece && food.piece >= 40 && food.piece <= 130 && !food.drink) {
    const pieces = Math.max(1, Math.round(grams / food.piece));
    return { amount: pieces * food.piece, pieces };
  }
  const step = grams < 40 ? 5 : 10;
  return { amount: Math.max(step, Math.round(grams / step) * step) };
}

/** Prispôsobí recept kalorickému rozpočtu a spočíta výsledné hodnoty. */
function scaleRecipe(rec: Recipe, budget: number, label: string): PlannedMeal {
  const base = recipeKcal(rec);
  const factor = budget > 0 && base > 0 ? Math.min(1.6, Math.max(0.55, budget / base)) : 1;
  const meal: PlannedMeal = {
    type: rec.type, label, name: rec.name, calories: 0, protein: 0, carbs: 0, fats: 0, ingredients: []
  };
  for (const [name, grams] of rec.items) {
    const food = FOOD_BY_NAME.get(name);
    if (!food) continue;
    const nice = niceAmount(food, grams * factor);
    const k = nice.amount / 100;
    meal.calories += food.kcal * k;
    meal.protein += food.protein * k;
    meal.carbs += food.carbs * k;
    meal.fats += food.fats * k;
    meal.ingredients.push({ name: food.name, amount: nice.amount, unit: food.drink ? 'ml' : 'g', pieces: nice.pieces });
  }
  meal.calories = Math.round(meal.calories);
  meal.protein = Math.round(meal.protein);
  meal.carbs = Math.round(meal.carbs);
  meal.fats = Math.round(meal.fats);
  return meal;
}

function slots(mealsPerDay: number): Array<{ type: MealType; label: string; share: number }> {
  const n = Math.min(6, Math.max(3, Math.round(mealsPerDay)));
  const B = { type: 'breakfast' as MealType, label: 'Raňajky' };
  const D = { type: 'snack' as MealType, label: 'Desiata' };
  const L = { type: 'lunch' as MealType, label: 'Obed' };
  const O = { type: 'snack' as MealType, label: 'Olovrant' };
  const V = { type: 'dinner' as MealType, label: 'Večera' };
  const S = { type: 'snack' as MealType, label: 'Druhá večera' };
  switch (n) {
    case 3: return [{ ...B, share: 0.30 }, { ...L, share: 0.40 }, { ...V, share: 0.30 }];
    case 4: return [{ ...B, share: 0.26 }, { ...L, share: 0.36 }, { ...O, share: 0.11 }, { ...V, share: 0.27 }];
    case 5: return [{ ...B, share: 0.24 }, { ...D, share: 0.09 }, { ...L, share: 0.33 }, { ...O, share: 0.09 }, { ...V, share: 0.25 }];
    default: return [{ ...B, share: 0.22 }, { ...D, share: 0.09 }, { ...L, share: 0.30 }, { ...O, share: 0.09 }, { ...V, share: 0.22 }, { ...S, share: 0.08 }];
  }
}

function sumDay(target: number, meals: PlannedMeal[], day?: string): DayPlan {
  const sum = (key: 'calories' | 'protein' | 'carbs' | 'fats') => meals.reduce((s, m) => s + m[key], 0);
  return { day, target, meals, calories: sum('calories'), protein: sum('protein'), carbs: sum('carbs'), fats: sum('fats') };
}

export function menuTarget(ctx: CoachContext, opts: MenuOptions = {}): number {
  return Math.round(opts.calories || targetCalories(ctx) || 2000);
}

// ------------------------------------------------------------
// Skladanie jedálnička
// ------------------------------------------------------------

function buildDay(
  ctx: CoachContext, opts: MenuOptions, random: () => number,
  recent: Map<MealType, string[]>, day?: string
): DayPlan {
  const target = menuTarget(ctx, opts);
  const pool = allowed(ctx, opts);
  const wantProtein = opts.highProtein || ['lose_weight', 'gain_muscle'].includes(ctx.profile?.fitnessGoal);
  const usedToday = new Set<string>();
  const meals: PlannedMeal[] = [];

  const plan = slots(opts.mealsPerDay || (target >= 2200 ? 5 : 4));
  let spent = 0;
  plan.forEach((slot, index) => {
    // posledné jedlo dorovná, čo zaokrúhľovanie predtým ubralo alebo pridalo
    const isLast = index === plan.length - 1;
    const fair = target * slot.share;
    const budget = isLast ? Math.min(fair * 1.25, Math.max(fair * 0.8, target - spent)) : fair;

    let candidates = pool.filter(rec => rec.type === slot.type && !usedToday.has(rec.name));
    if (!candidates.length) candidates = RECIPES.filter(rec => rec.type === slot.type && !usedToday.has(rec.name));
    const seen = recent.get(slot.type) || [];
    const fresh = candidates.filter(rec => !seen.includes(rec.name));
    if (fresh.length) candidates = fresh;

    // skóre: recept, ktorý netreba veľmi naťahovať, a pri cieli chudnúť/naberať viac bielkovín
    const scored = candidates.map(rec => {
      const stretch = Math.abs(Math.log(budget / Math.max(1, recipeKcal(rec))));
      const density = recipeProtein(rec) / Math.max(1, recipeKcal(rec));
      return { rec, score: stretch * 1.2 - (wantProtein ? density * 2.5 : density) + random() * 0.5 };
    }).sort((x, y) => x.score - y.score);

    const chosen = scored[0]?.rec;
    if (!chosen) return;
    usedToday.add(chosen.name);
    recent.set(slot.type, [...seen, chosen.name].slice(-(slot.type === 'snack' ? 3 : 4)));
    const meal = scaleRecipe(chosen, budget, slot.label);
    spent += meal.calories;
    meals.push(meal);
  });

  return sumDay(target, meals, day);
}

export function buildDayPlan(ctx: CoachContext, opts: MenuOptions = {}): DayPlan {
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  return buildDay(ctx, opts, rng(seed), new Map());
}

const WEEK_DAYS = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];

export function buildWeekPlan(ctx: CoachContext, opts: MenuOptions = {}): WeekPlan {
  const random = rng(opts.seed ?? weekSeed(ctx.now));
  const recent = new Map<MealType, string[]>();
  const days = WEEK_DAYS.map(day => buildDay(ctx, opts, random, recent, day));
  return {
    target: menuTarget(ctx, opts),
    days,
    averageCalories: Math.round(days.reduce((s, d) => s + d.calories, 0) / days.length),
    averageProtein: Math.round(days.reduce((s, d) => s + d.protein, 0) / days.length)
  };
}

/** Návrhy jedného jedla do daného rozpočtu (pre "čo si mám dať na večeru"). */
export function suggestMeals(ctx: CoachContext, type: MealType, budget: number, count = 3, opts: MenuOptions = {}): PlannedMeal[] {
  let pool = allowed(ctx, opts).filter(rec => rec.type === type);
  if (!pool.length) pool = RECIPES.filter(rec => rec.type === type);
  const wantProtein = ['lose_weight', 'gain_muscle'].includes(ctx.profile?.fitnessGoal);
  return pool
    .map(rec => ({
      rec,
      score: Math.abs(Math.log(Math.max(1, budget) / Math.max(1, recipeKcal(rec)))) -
        (wantProtein ? recipeProtein(rec) / Math.max(1, recipeKcal(rec)) * 2.5 : 0) + Math.random() * 0.6
    }))
    .sort((x, y) => x.score - y.score)
    .slice(0, count)
    .map(x => scaleRecipe(x.rec, budget, MEAL_SK[type]));
}

// ------------------------------------------------------------
// Nákupný zoznam
// ------------------------------------------------------------

export interface ShoppingItem { name: string; amount: number; unit: 'g' | 'ml'; pieces?: number; }

export function shoppingList(week: WeekPlan): ShoppingItem[] {
  const totals = new Map<string, ShoppingItem>();
  week.days.forEach(day => day.meals.forEach(meal => meal.ingredients.forEach(ing => {
    const item = totals.get(ing.name) || { name: ing.name, amount: 0, unit: ing.unit };
    item.amount += ing.amount;
    if (ing.pieces) item.pieces = (item.pieces || 0) + ing.pieces;
    totals.set(ing.name, item);
  })));
  return Array.from(totals.values()).sort((x, y) => x.name.localeCompare(y.name, 'sk'));
}

// ------------------------------------------------------------
// Texty pre chat
// ------------------------------------------------------------

export function ingredientText(ing: PlannedIngredient): string {
  const name = ing.name.toLowerCase();
  if (ing.pieces) return `${name} ${ing.amount} ${ing.unit} (${ing.pieces} ks)`;
  return `${name} ${ing.amount} ${ing.unit}`;
}

function amountText(item: ShoppingItem): string {
  if (item.pieces) return `${item.pieces} ks (${item.amount} ${item.unit})`;
  if (item.amount >= 1000) return `${(item.amount / 1000).toFixed(1).replace('.', ',')} ${item.unit === 'ml' ? 'l' : 'kg'}`;
  return `${item.amount} ${item.unit}`;
}

function dietLabel(ctx: CoachContext, opts: MenuOptions): string {
  const diet = profileDiet(ctx);
  const parts: string[] = [];
  if (opts.vegan || diet.vegan) parts.push('vegánsky');
  else if (opts.vegetarian || diet.vegetarian) parts.push('vegetariánsky');
  if (opts.noLactose || diet.noLactose) parts.push('bez laktózy');
  if (opts.noGluten || diet.noGluten) parts.push('bez lepku');
  if (opts.exclude?.length) parts.push('bez: ' + opts.exclude.map(n => n.toLowerCase()).join(', '));
  return parts.length ? ` (${parts.join(', ')})` : '';
}

export function dayPlanText(ctx: CoachContext, opts: MenuOptions = {}): string {
  const plan = buildDayPlan(ctx, opts);
  const protein = proteinTarget(ctx);
  const lines = [`🍽️ **Jedálniček na deň – ${plan.target} kcal**${dietLabel(ctx, opts)}`, ''];
  plan.meals.forEach(meal => {
    lines.push(`**${meal.label}: ${meal.name}** – ${meal.calories} kcal, bielkoviny ${meal.protein} g`);
    lines.push(`  • ${meal.ingredients.map(ingredientText).join(', ')}`);
  });
  lines.push('', `Spolu ${plan.calories} kcal: bielkoviny ${plan.protein} g, sacharidy ${plan.carbs} g, tuky ${plan.fats} g.`);
  if (protein && plan.protein < protein * 0.85) {
    lines.push(`Tvoj cieľ bielkovín je okolo ${protein} g – doplň ho napríklad tvarohom alebo proteínovým nápojom.`);
  }
  const maintenance = Math.round(tdee(ctx));
  if (maintenance && !opts.calories) {
    const diff = plan.target - maintenance;
    if (Math.abs(diff) >= 100) lines.push(`Je to ${Math.abs(diff)} kcal ${diff < 0 ? 'pod' : 'nad'} tvojím udržiavacím príjmom (${maintenance} kcal), teda v súlade s tvojím cieľom.`);
  }
  lines.push('', 'Ryža, cestoviny a zemiaky sú uvedené vo varenom stave. Chceš iný návrh? Napíš „iný jedálniček“, „jedálniček na týždeň“ alebo napríklad „jedálniček na 1800 kcal bez rýb“.');
  return lines.join('\n');
}

export function weekPlanText(ctx: CoachContext, opts: MenuOptions = {}): string {
  const week = buildWeekPlan(ctx, opts);
  const lines = [`📅 **Jedálniček na týždeň – ${week.target} kcal denne**${dietLabel(ctx, opts)}`, ''];
  week.days.forEach(day => {
    lines.push(`**${day.day}** – ${day.calories} kcal, bielkoviny ${day.protein} g`);
    day.meals.forEach(meal => lines.push(`  • ${meal.label}: ${meal.name} (${meal.calories} kcal)`));
  });
  lines.push('', `Priemer ${week.averageCalories} kcal a ${week.averageProtein} g bielkovín denne.`,
    'Napíš „nákupný zoznam“ a spočítam ti suroviny na celý týždeň. Presné gramáže jedného dňa dostaneš cez „jedálniček na dnes“.');
  return lines.join('\n');
}

export function shoppingListText(ctx: CoachContext, opts: MenuOptions = {}): string {
  const week = buildWeekPlan(ctx, opts);
  const lines = [`🛒 **Nákupný zoznam na týždeň** (jedálniček ${week.target} kcal denne)${dietLabel(ctx, opts)}`, ''];
  shoppingList(week).forEach(item => lines.push(`  • ${item.name}: ${amountText(item)}`));
  lines.push('', 'Ryža, cestoviny, kuskus a strukoviny sú rátané vo varenom stave – surových kúp približne tretinu tejto hmotnosti.');
  return lines.join('\n');
}

/** Z vety vytiahne požiadavky na jedálniček: kalórie, diétu, počet jedál, vylúčené suroviny. */
export function parseMenuOptions(text: string, ctx: CoachContext, excludeFoods: string[] = []): MenuOptions {
  const opts: MenuOptions = {};
  const kcal = /(\d{4})\s*(?:kcal|kalori\w*|kal)?\b/.exec(text);
  if (kcal && +kcal[1] >= 1000 && +kcal[1] <= 6000) opts.calories = +kcal[1];
  const meals = /(\d)\s*(?:jedal|jedla|jedlo|jedl|chodov|krat denne|x denne)/.exec(text);
  if (meals) opts.mealsPerDay = +meals[1];
  if (/vegan/.test(text)) opts.vegan = true;
  if (/veget|bez masa|bezmasit/.test(text)) opts.vegetarian = true;
  if (/bez laktoz|bezlaktoz|bez mlieka/.test(text)) opts.noLactose = true;
  if (/bez lepku|bezlepk|bezglut/.test(text)) opts.noGluten = true;
  if (/bielkovin|protein|high protein/.test(text)) opts.highProtein = true;
  if (excludeFoods.length) opts.exclude = excludeFoods;

  const maintenance = tdee(ctx);
  if (!opts.calories && maintenance) {
    if (/chudn|redukc|schudn|diet[au]|na zhodenie/.test(text)) opts.calories = Math.round(maintenance - 500);
    else if (/nabera|objem|na svaly|pribrat/.test(text)) opts.calories = Math.round(maintenance + 300);
    else if (/udrzan|udrziavac/.test(text)) opts.calories = Math.round(maintenance);
  }
  return opts;
}
