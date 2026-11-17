import { describe, expect, it } from 'vitest';
import { CoachContext } from '../../src/app/ai/context';
import { EngineAction, respond } from '../../src/app/ai/engine';
import { buildDayPlan, buildWeekPlan, missingIngredients, shoppingList } from '../../src/app/ai/meal-planner';
import { buildWorkoutPlan } from '../../src/app/ai/planner';
import { norm, parseNumber, stem } from '../../src/app/ai/text';

function context(overrides: Partial<CoachContext> = {}): CoachContext {
  const now = new Date(2026, 10, 16, 13, 0, 0);
  return {
    now,
    profile: {
      firstName: 'Test', age: 25, gender: 'male', height: 180,
      currentWeight: 82, targetWeight: 76, fitnessGoal: 'lose_weight', activityLevel: 'moderate'
    },
    entries: { food: [], exercise: [], weight: [], mood: [], sleep: [], stress: [] },
    ...overrides
  };
}

type Save = Extract<EngineAction, { kind: 'save' }>;
const saves = (message: string, ctx = context()) =>
  respond(message, ctx).actions.filter((a): a is Save => a.kind === 'save');

describe('text helpers', () => {
  it('strips diacritics and separates numbers from units', () => {
    expect(norm('Zjedol som 200g ryže')).toBe('zjedol som 200 g ryze');
    expect(norm('81,5 kg')).toBe('81.5 kg');
  });

  it('stems Slovak case endings to a common form', () => {
    expect(stem('ryzu')).toBe(stem('ryza'));
    expect(stem('halusiek')).toBe(stem('halusky'));
    expect(stem('paradajok')).toBe(stem('paradajky'));
  });

  it('reads number words', () => {
    expect(parseNumber('dve')).toBe(2);
    expect(parseNumber('pol')).toBe(0.5);
    expect(parseNumber('1/2')).toBe(0.5);
  });
});

describe('food logging', () => {
  it('logs several foods with counts', () => {
    const result = saves('Na raňajky som mal 2 vajcia, chlieb s maslom a kávu s mliekom');
    expect(result.map(a => a.type)).toEqual(['food', 'food', 'food']);
    expect(result[0].data.name).toContain('Vajce (110 g)');
    expect(result[0].data.mealType).toBe('breakfast');
    expect(result[2].data.category).toBe('drink');
  });

  it('uses explicit weights when given', () => {
    const [rice, chicken] = saves('ryža 150 g a kuracie prsia 200 g');
    expect(rice.data.calories).toBe(195);
    expect(chicken.data.calories).toBe(320);
  });

  it('estimates portions from a description without weights', () => {
    const [normal] = saves('zjedol som tanier guláša');
    const [large] = saves('zjedol som veľký tanier guláša');
    expect(large.data.calories).toBeGreaterThan(normal.data.calories);
  });

  it('understands a double portion and genitive plural', () => {
    const [entry] = saves('mal som dvojitú porciu halušiek');
    expect(entry.data.name).toContain('Bryndzové halušky (700 g)');
  });

  it('adds calories for fried preparation', () => {
    const [plain] = saves('zjedol som 150 g kuracích pŕs');
    const [fried] = saves('zjedol som 150 g vyprážaných kuracích pŕs');
    expect(fried.data.calories).toBeGreaterThan(plain.data.calories);
  });

  it('accepts an unknown dish with stated calories', () => {
    const [entry] = saves('zjedol som trdelníkový pohár 650 kcal');
    expect(entry.data.calories).toBe(650);
  });

  it('estimates an unknown dish by type instead of refusing', () => {
    const result = respond('zjedol som babkin zapekaný baklažán', context());
    const [entry] = result.actions.filter((a): a is Save => a.kind === 'save');
    expect(entry.data.name).toContain('(odhad)');
    expect(entry.data.calories).toBeGreaterThan(100);
  });

  it('does not log a question or a plan as food', () => {
    expect(saves('koľko kalórií má banán?')).toHaveLength(0);
    expect(saves('vegetariánsky jedálniček na 1800 kcal bez vajec')).toHaveLength(0);
    expect(respond('koľko kalórií má banán?', context()).intent).toBe('nutrition');
  });

  it('rescales the last entry on "bola to veľká porcia"', () => {
    const ctx = context({
      canUndo: true,
      lastBatch: [{ type: 'food', data: { name: 'Guláš (300 g)', calories: 390, protein: 30, carbs: 18, fats: 22 } }]
    });
    const result = respond('bola to veľká porcia', ctx);
    expect(result.intent).toBe('adjust');
    expect(result.actions[0]).toEqual({ kind: 'undo' });
    expect((result.actions[1] as Save).data.calories).toBe(546);
  });
});

describe('other diary entries', () => {
  it('logs exercise with duration and burned calories', () => {
    const [run] = saves('bol som behať 30 minút');
    expect(run.type).toBe('exercise');
    expect(run.data.duration).toBe(30);
    expect(run.data.caloriesBurned).toBeGreaterThan(200);
  });

  it('converts distance to minutes', () => {
    const [run] = saves('zabehol som 5 km');
    expect(run.data.duration).toBe(30);
  });

  it('does not log a future plan', () => {
    expect(saves('chcem ísť zajtra behať 5 km')).toHaveLength(0);
  });

  it('logs weight, sleep, mood and stress', () => {
    expect(saves('vážim 81,5 kg')[0].data.weight).toBe(81.5);
    expect(saves('spal som zle, len 5 hodín')[0].data).toMatchObject({ hours: 5, quality: 'poor' });
    expect(saves('nálada 8/10')[0].data.score).toBe(8);
    expect(saves('stres 8 z 10 kvôli práci')[0].data.level).toBe(8);
  });

  it('logs several kinds of entries from one message', () => {
    const types = saves('včera som odcvičil hodinu v posilke a spal som 7 a pol hodiny').map(a => a.type).sort();
    expect(types).toEqual(['exercise', 'sleep']);
  });

  it('does not treat food eaten after training as a workout', () => {
    expect(saves('dal som si banán po tréningu').map(a => a.type)).toEqual(['food']);
  });
});

describe('questions and advice', () => {
  const intent = (message: string) => respond(message, context()).intent;

  it('routes common questions to the right intent', () => {
    expect(intent('koľko mi dnes ostáva?')).toBe('today');
    expect(intent('ako sa mi darilo tento týždeň')).toBe('weekly');
    expect(intent('čo si mám dať na večeru?')).toBe('meal');
    expect(intent('zostav mi tréningový plán')).toBe('plan');
    expect(intent('jedálniček na týždeň')).toBe('menu-week');
    expect(intent('nákupný zoznam')).toBe('shopping');
    expect(intent('koľko bielkovín potrebujem?')).toBe('topic:protein');
    expect(intent('bmi')).toBe('bmi');
  });

  it('answers pain questions with a safety message first', () => {
    expect(intent('boli ma koleno pri drepoch')).toBe('topic:injury');
  });

  it('marks unrelated questions as fallback', () => {
    expect(respond('kto vyhral majstrovstvá sveta', context()).fallback).toBe(true);
  });
});

describe('meal planner', () => {
  it('only uses ingredients that exist in the food database', () => {
    expect(missingIngredients()).toEqual([]);
  });

  it('builds a day plan close to the calorie target', () => {
    const plan = buildDayPlan(context(), { calories: 2000, seed: 1 });
    expect(Math.abs(plan.calories - 2000)).toBeLessThan(200);
    expect(plan.meals.length).toBeGreaterThanOrEqual(3);
  });

  it('respects diet and excluded ingredients', () => {
    const plan = buildDayPlan(context(), { vegan: true, exclude: ['Tofu'], seed: 2 });
    const names = plan.meals.flatMap(m => m.ingredients.map(i => i.name));
    expect(names).not.toContain('Tofu');
    expect(names).not.toContain('Kuracie prsia');
    expect(names).not.toContain('Vajce');
  });

  it('builds a stable week plan and a matching shopping list', () => {
    const first = buildWeekPlan(context(), { seed: 7 });
    const second = buildWeekPlan(context(), { seed: 7 });
    expect(first.days).toHaveLength(7);
    expect(second.days.map(d => d.meals.map(m => m.name))).toEqual(first.days.map(d => d.meals.map(m => m.name)));
    expect(shoppingList(first).length).toBeGreaterThan(5);
  });
});

describe('workout planner', () => {
  it('adapts the number of training days', () => {
    expect(buildWorkoutPlan(context()).days).toHaveLength(4);
    expect(buildWorkoutPlan(context(), 5).days).toHaveLength(5);
    expect(buildWorkoutPlan(context(), 9).days).toHaveLength(5);
  });
});

describe('unknown and branded foods', () => {
  it('knows branded snacks, including number-first names', () => {
    const result = saves('teraz som mal liter polotučného mlieka a jednu 46 g tribitku');
    expect(result.map(a => a.data.name)).toEqual(['Mlieko (1000 ml)', '3Bit (46 g)']);
    expect(saves('mal som s tým mliekom ešte 3bit 1ks').map(a => a.data.name)).toEqual(['3Bit (46 g)']);
  });

  it('asks about an unknown item instead of dropping it silently', () => {
    const result = respond('mal som liter mlieka a jednu 40 g bombičku', context());
    expect(result.actions.filter(a => a.kind === 'save')).toHaveLength(1);
    expect(result.pending).toEqual({ name: 'Bombičku', count: 1 });
    expect(result.text).toContain('ešte nepoznám');
  });

  it('asks when only an unknown item with a count is mentioned', () => {
    const result = respond('mal som bombičku 2 ks', context());
    expect(result.intent).toBe('ask');
    expect(result.pending).toEqual({ name: 'Bombičku', count: 2 });
  });

  it('logs and learns the food when the user answers with a number', () => {
    const result = respond('240', context({ pending: { name: 'Bombička', count: 2 } }));
    const save = result.actions.find((a): a is Save => a.kind === 'save');
    expect(save?.data).toMatchObject({ name: 'Bombička ×2', calories: 480 });
    expect(result.actions).toContainEqual({ kind: 'learn', food: { name: 'Bombička', calories: 240 } });
  });

  it('uses a learned food next time, in any grammatical case', () => {
    const ctx = context({ customFoods: [{ name: 'Bombička', calories: 240 }] });
    expect(saves('zjedol som bombičku', ctx)[0].data).toMatchObject({ name: 'Bombička', calories: 240 });
    expect(saves('zjedol som 2 bombičky', ctx)[0].data.calories).toBe(480);
  });

  it('learns a food logged with explicit calories', () => {
    const result = respond('zjedol som gofru 380 kcal', context());
    expect(result.actions).toContainEqual({ kind: 'learn', food: { name: 'Gofru', calories: 380 } });
  });

  it('handles "a čo tá …" after a food log', () => {
    const ctx = context({ lastBatch: [{ type: 'food', data: { name: 'Mlieko (1000 ml)', calories: 470 } }] });
    expect(respond('a čo tá tribitka', ctx).actions.filter(a => a.kind === 'save')).toHaveLength(1);
    const unknown = respond('a čo tá bombička', ctx);
    expect(unknown.intent).toBe('ask');
    expect(unknown.pending?.name).toBe('Bombička');
  });

  it('logs a food once when two words name the same thing', () => {
    expect(saves('zjedol som oreo sušienky')).toHaveLength(1);
    expect(saves('dal som si deli tyčinku')).toHaveLength(1);
    expect(saves('zjedol som 2 vajcia a 2 vajcia')).toHaveLength(2);
  });

  it('tolerates a typo in a food name', () => {
    expect(saves('zjedol som jogrut')[0].data.name).toContain('jogurt');
    expect(saves('zjedol som 2 banny')[0].data.name).toContain('Banán');
  });

  it('does not ask about non-food words with numbers', () => {
    expect(respond('zjedol som 2 vajcia pred 3 hodinami', context()).pending).toBeUndefined();
    expect(respond('mal som 2 schôdzky', context()).pending).toBeUndefined();
  });
});
