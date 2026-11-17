import { beforeAll, describe, expect, it } from 'vitest';
import { CoachContext } from '../../src/app/ai/context';
import { EngineAction, respond } from '../../src/app/ai/engine';
import { catalogSize, loadCatalog, searchCatalog } from '../../src/app/ai/food-catalog';

// Malá vzorka v rovnakom formáte, aký vytvára scripts/build-food-catalog.mjs
beforeAll(() => {
  loadCatalog({
    items: [
      ['Kinder Pingui', 'Ferrero', 448, 7.4, 33, 31, 30, 0, 150],
      ['Tatranka lieskovooriešková', 'Pečivárne Liptovský Hrádok', 520, 7, 60, 27, 47, 0, 300],
      ['Relax pomaranč 100 %', 'Relax', 45, 0.7, 10, 0, 0, 1, 90],
      ['Jogurt biely', 'Rajo', 62, 4.5, 5, 3, 150, 0, 900],
      ['Lay\'s Solené', 'Lay\'s', 536, 6.5, 52, 33, 30, 0, 400],
      ['Proteínová tyčinka Choco Brownie', 'Nutrend', 360, 30, 35, 12, 60, 0, 40],
      ['Milk', 'K-Classic', 48, 3.4, 4.8, 1.5, 0, 1, 900],
      ['Mléčná čokoláda', 'Milka', 530, 6.5, 58, 29, 0, 0, 120],
      ['Activia jahoda', 'Danone', 93, 3.5, 13, 2.9, 120, 0, 300]
    ]
  });
});

function context(): CoachContext {
  return {
    now: new Date(2026, 10, 17, 13, 0, 0),
    profile: { firstName: 'Test', age: 25, gender: 'male', height: 180, currentWeight: 82, fitnessGoal: 'maintain', activityLevel: 'moderate' },
    entries: { food: [], exercise: [], weight: [], mood: [], sleep: [], stress: [] }
  };
}

type Save = Extract<EngineAction, { kind: 'save' }>;
const saves = (message: string) =>
  respond(message, context()).actions.filter((a): a is Save => a.kind === 'save');

describe('food catalog', () => {
  it('loads the compact file format', () => {
    expect(catalogSize()).toBe(9);
  });

  it('prefers the exact word and the brand over a word with the same stem', () => {
    expect(searchCatalog(['milka'])?.name).toBe('Mléčná čokoláda, Milka');
  });

  it('lets a brand refine a generic food instead of logging both', () => {
    const result = saves('zjedol som activia jogurt');
    expect(result.map(a => a.data.name)).toEqual(['Activia jahoda, Danone (120 g)']);
    expect(saves('zjedol som banán a activiu').map(a => a.data.name)).toHaveLength(2);
  });

  it('finds products by name in any grammatical case', () => {
    expect(searchCatalog(['pingui'])?.name).toBe('Kinder Pingui, Ferrero');
    expect(searchCatalog(['relaxu'])?.name).toBe('Relax pomaranč 100 %');
    expect(searchCatalog(['lays'])?.name).toContain('Lay');
  });

  it('needs every word to match when two are given', () => {
    expect(searchCatalog(['proteinovu', 'tycinku'])?.name).toContain('Nutrend');
    expect(searchCatalog(['tatranka', 'cokoladova'])).toBeNull();
  });

  it('logs a product with its serving size when no amount is given', () => {
    const [entry] = saves('zjedol som kinder pingui');
    expect(entry.data).toMatchObject({ name: 'Kinder Pingui, Ferrero (30 g)', calories: 134 });
  });

  it('uses the amount the user gave', () => {
    const [entry] = saves('zjedol som 60 g pingui');
    expect(entry.data.calories).toBe(269);
    expect(saves('zjedol som 2 pingui')[0].data.name).toContain('(60 g)');
  });

  it('logs drinks in millilitres', () => {
    const [entry] = saves('vypil som pohár relaxu');
    expect(entry.data).toMatchObject({ category: 'drink', calories: 113 });
    expect(entry.data.name).toContain('250 ml');
  });

  it('mentions the data source in the reply', () => {
    expect(respond('zjedol som kinder pingui', context()).text).toContain('Open Food Facts');
  });

  it('answers nutrition questions about products', () => {
    const result = respond('koľko kalórií má kinder pingui', context());
    expect(result.intent).toBe('nutrition');
    expect(result.text).toContain('448 kcal');
  });

  it('still prefers the built-in database for generic foods', () => {
    expect(saves('zjedol som banán')[0].data.name).toContain('Banán');
    expect(saves('zjedol som jogurt')[0].data.name).toContain('Biely jogurt');
  });

  it('still asks about foods that are nowhere', () => {
    const result = respond('zjedol som 2 bombičky', context());
    expect(result.intent).toBe('ask');
    expect(result.pending?.name).toBe('Bombičky');
  });
});
