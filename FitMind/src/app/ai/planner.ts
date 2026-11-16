import { CoachContext, GOAL_SK } from './context';

// ============================================================
// TRÉNINGOVÝ PLÁN
// ============================================================

export interface PlanExercise { name: string; detail: string; }
export interface PlanDay { day: string; name: string; focus: string; items: PlanExercise[]; }
export interface WorkoutPlan {
  title: string;
  summary: string;
  daysPerWeek: number;
  days: PlanDay[];
  tips: string[];
}

const ex = (name: string, detail: string): PlanExercise => ({ name, detail });

const BLOCKS: Record<string, { name: string; focus: string; items: PlanExercise[] }> = {
  fullA: {
    name: 'Celé telo A', focus: 'Sila – základné cviky',
    items: [
      ex('Drepy', '3 × 10'), ex('Kliky alebo bench press', '3 × 8–12'),
      ex('Príťahy v predklone / s gumou', '3 × 10'), ex('Výpady', '2 × 10 na nohu'),
      ex('Plank', '3 × 30–45 s')
    ]
  },
  fullB: {
    name: 'Celé telo B', focus: 'Sila – zadný reťazec',
    items: [
      ex('Mŕtvy ťah (rumunský)', '3 × 8–10'), ex('Tlaky nad hlavu', '3 × 8–10'),
      ex('Zhyby alebo sťahovanie kladky', '3 × 6–10'), ex('Hip thrust / mostík', '3 × 12'),
      ex('Zdvihy nôh v ľahu', '3 × 12')
    ]
  },
  upper: {
    name: 'Vrch tela', focus: 'Prsia, chrbát, ramená, ruky',
    items: [
      ex('Bench press / kliky', '4 × 6–10'), ex('Príťahy činky v predklone', '4 × 8–10'),
      ex('Tlaky nad hlavu', '3 × 8–10'), ex('Sťahovanie kladky / zhyby', '3 × 8–12'),
      ex('Bicepsový zdvih', '2 × 12'), ex('Tricepsové stláčanie', '2 × 12')
    ]
  },
  lower: {
    name: 'Spodok tela', focus: 'Nohy, sedacie svaly, core',
    items: [
      ex('Drepy', '4 × 6–10'), ex('Rumunský mŕtvy ťah', '3 × 8–10'),
      ex('Výpady v chôdzi', '3 × 10 na nohu'), ex('Zakopávanie / hip thrust', '3 × 12'),
      ex('Výpony na lýtka', '3 × 15'), ex('Plank', '3 × 45 s')
    ]
  },
  push: {
    name: 'Push', focus: 'Prsia, ramená, triceps',
    items: [
      ex('Bench press', '4 × 6–10'), ex('Tlaky na šikmej lavici', '3 × 8–12'),
      ex('Tlaky nad hlavu', '3 × 8–10'), ex('Upažovanie', '3 × 12–15'),
      ex('Tricepsové stláčanie kladky', '3 × 12')
    ]
  },
  pull: {
    name: 'Pull', focus: 'Chrbát, biceps',
    items: [
      ex('Zhyby / sťahovanie kladky', '4 × 6–10'), ex('Príťahy v predklone', '4 × 8–10'),
      ex('Príťahy kladky v sede', '3 × 10–12'), ex('Face pull', '3 × 15'),
      ex('Bicepsový zdvih', '3 × 10–12')
    ]
  },
  legs: {
    name: 'Nohy', focus: 'Stehná, sedacie svaly, lýtka',
    items: [
      ex('Drepy', '4 × 6–10'), ex('Leg press / výpady', '3 × 10–12'),
      ex('Rumunský mŕtvy ťah', '3 × 8–10'), ex('Zakopávanie', '3 × 12'),
      ex('Výpony na lýtka', '4 × 15')
    ]
  },
  cardio: {
    name: 'Kardio', focus: 'Vytrvalosť a spaľovanie',
    items: [
      ex('Rýchla chôdza, beh alebo bicykel', '30–45 min v miernom tempe'),
      ex('Strečing', '5–10 min na záver')
    ]
  },
  hiit: {
    name: 'HIIT', focus: 'Intervaly – krátko a intenzívne',
    items: [
      ex('Rozcvička', '5 min'), ex('Intervaly: 30 s naplno / 60 s voľne', '8–10 kôl'),
      ex('Vychladnutie a strečing', '5–10 min')
    ]
  },
  mobility: {
    name: 'Mobilita a core', focus: 'Regenerácia, držanie tela',
    items: [
      ex('Joga alebo strečing celého tela', '20–30 min'),
      ex('Plank, bočný plank, bird-dog', '3 kolá'), ex('Prechádzka', '20–30 min')
    ]
  }
};

const WEEK = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];

const SCHEDULES: Record<string, Record<number, Array<[number, string]>>> = {
  lose_weight: {
    3: [[0, 'fullA'], [2, 'cardio'], [4, 'fullB']],
    4: [[0, 'fullA'], [1, 'cardio'], [3, 'fullB'], [5, 'hiit']],
    5: [[0, 'fullA'], [1, 'cardio'], [2, 'fullB'], [4, 'hiit'], [5, 'cardio']]
  },
  gain_muscle: {
    3: [[0, 'fullA'], [2, 'fullB'], [4, 'fullA']],
    4: [[0, 'upper'], [1, 'lower'], [3, 'upper'], [4, 'lower']],
    5: [[0, 'push'], [1, 'pull'], [2, 'legs'], [4, 'upper'], [5, 'lower']]
  },
  maintain: {
    3: [[0, 'fullA'], [2, 'cardio'], [4, 'fullB']],
    4: [[0, 'fullA'], [1, 'cardio'], [3, 'fullB'], [5, 'mobility']],
    5: [[0, 'upper'], [1, 'cardio'], [2, 'lower'], [4, 'fullA'], [5, 'mobility']]
  },
  improve_health: {
    3: [[0, 'fullA'], [2, 'cardio'], [4, 'mobility']],
    4: [[0, 'fullA'], [1, 'cardio'], [3, 'fullB'], [5, 'mobility']],
    5: [[0, 'fullA'], [1, 'cardio'], [2, 'mobility'], [4, 'fullB'], [5, 'cardio']]
  }
};

const DAYS_BY_ACTIVITY: Record<string, number> = {
  sedentary: 3, light: 3, moderate: 4, active: 5, very_active: 5
};

/** Zostaví týždenný plán podľa cieľa a úrovne aktivity z profilu. */
export function buildWorkoutPlan(ctx: CoachContext, daysOverride?: number): WorkoutPlan {
  const goal: string = SCHEDULES[ctx.profile?.fitnessGoal] ? ctx.profile.fitnessGoal : 'maintain';
  let days = daysOverride || DAYS_BY_ACTIVITY[ctx.profile?.activityLevel] || 3;
  days = Math.min(5, Math.max(3, Math.round(days)));

  const schedule = SCHEDULES[goal][days];
  const tips: Record<string, string[]> = {
    lose_weight: [
      'Silový tréning ti pri chudnutí udrží svaly – nevynechávaj ho kvôli kardiu.',
      'Mimo tréningov sa hýb: cieľ 7–10 tisíc krokov denne.',
      'Chudnutie rozhoduje strava: drž mierny deficit, nie hladovku.'
    ],
    gain_muscle: [
      'Každý týždeň skús pridať opakovanie alebo trochu váhy (progresívne preťaženie).',
      'Medzi sériami oddychuj 1,5–3 minúty, posledné 1–2 opakovania majú byť ťažké.',
      'Bez mierneho kalorického nadbytku a bielkovín svaly nerastú.'
    ],
    maintain: [
      'Kombinuj silu a kardio – udržíš svaly aj kondíciu.',
      'Drž pravidelnosť, je dôležitejšia než dokonalý plán.'
    ],
    improve_health: [
      'Začni ľahšie a pridávaj postupne – cieľom je vydržať dlhodobo.',
      'Aspoň 150 minút miernej aktivity týždenne je odporúčanie WHO.'
    ]
  };

  return {
    title: `Tréningový plán: ${GOAL_SK[goal]}`,
    summary: `${days} ${days >= 5 ? 'tréningov' : 'tréningy'} týždenne, ostatné dni sú oddych alebo ľahká prechádzka.`,
    daysPerWeek: days,
    days: schedule.map(([dayIndex, key]) => ({ day: WEEK[dayIndex], ...BLOCKS[key] })),
    tips: [...tips[goal], 'Pred tréningom sa 5–10 minút rozcvič a techniku uprednostni pred váhou.']
  };
}

export function workoutPlanText(plan: WorkoutPlan): string {
  const lines = [`🏋️ **${plan.title}**`, plan.summary, ''];
  for (const d of plan.days) {
    lines.push(`**${d.day} – ${d.name}** (${d.focus})`);
    d.items.forEach(i => lines.push(`  • ${i.name}: ${i.detail}`));
    lines.push('');
  }
  lines.push('💡 **Tipy**');
  plan.tips.forEach(t => lines.push(`  • ${t}`));
  return lines.join('\n');
}

export const MUSCLE_EXERCISES: Array<{ match: RegExp; title: string; items: string[] }> = [
  { match: /bruch|brus|core|stred tela|tehlick/, title: 'brucho a core', items: ['Plank – 3 × 30–60 s', 'Zdvihy nôh v ľahu – 3 × 12', 'Bicykel (bicycle crunch) – 3 × 20', 'Dead bug – 3 × 10 na stranu', 'Bočný plank – 2 × 30 s na stranu'] },
  { match: /chrbat|chrbt|lopatk/, title: 'chrbát', items: ['Zhyby alebo sťahovanie kladky – 4 × 6–10', 'Príťahy činky v predklone – 4 × 8–10', 'Príťahy kladky v sede – 3 × 10–12', 'Face pull – 3 × 15', 'Superman v ľahu – 3 × 12'] },
  { match: /prsi|prsn|hrudnik|hrud/, title: 'prsia', items: ['Bench press – 4 × 6–10', 'Kliky – 3 × do únavy', 'Tlaky s jednoručkami na šikmej lavici – 3 × 8–12', 'Rozpažovanie – 3 × 12–15'] },
  { match: /noh|stehn|lytk/, title: 'nohy', items: ['Drepy – 4 × 6–10', 'Výpady – 3 × 10 na nohu', 'Rumunský mŕtvy ťah – 3 × 8–10', 'Leg press – 3 × 10–12', 'Výpony na lýtka – 4 × 15'] },
  { match: /zadok|zadk|sedac|glute/, title: 'sedacie svaly', items: ['Hip thrust – 4 × 8–12', 'Bulharské drepy – 3 × 10 na nohu', 'Rumunský mŕtvy ťah – 3 × 10', 'Zakopávanie na kladke – 3 × 15', 'Mostík na jednej nohe – 3 × 12'] },
  { match: /ramen|plec|delt/, title: 'ramená', items: ['Tlaky nad hlavu – 4 × 8–10', 'Upažovanie – 3 × 12–15', 'Face pull – 3 × 15', 'Predpažovanie – 2 × 12'] },
  { match: /biceps|triceps|ruk|ruky|paz/, title: 'ruky', items: ['Bicepsový zdvih – 3 × 10–12', 'Kladivový zdvih – 3 × 12', 'Tricepsové kliky na lavičke – 3 × 10–15', 'Stláčanie kladky – 3 × 12', 'Zhyby podhmatom – 3 × max'] }
];
