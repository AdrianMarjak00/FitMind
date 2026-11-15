import { dayKey, round, toDate } from './text';

export type EntryType = 'food' | 'exercise' | 'mood' | 'stress' | 'sleep' | 'weight';

export interface CoachEntries {
  food: any[];
  exercise: any[];
  weight: any[];
  mood: any[];
  sleep: any[];
  stress: any[];
}

/** Všetko, čo engine o používateľovi vie v momente odpovede. */
export interface CoachContext {
  profile: any | null;
  entries: CoachEntries;
  now: Date;
  /** Či existuje záznam z tohto chatu, ktorý sa dá vrátiť späť. */
  canUndo?: boolean;
}

export const EMPTY_ENTRIES: CoachEntries = {
  food: [], exercise: [], weight: [], mood: [], sleep: [], stress: []
};

const ACTIVITY_MULT: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
};
const GOAL_ADJUST: Record<string, number> = {
  lose_weight: -500, gain_muscle: 300, maintain: 0, improve_health: 0
};

export const GOAL_SK: Record<string, string> = {
  lose_weight: 'schudnúť', gain_muscle: 'nabrať svaly',
  maintain: 'udržať váhu', improve_health: 'zlepšiť zdravie'
};

export function num(value: any): number {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return isFinite(n) ? n : 0;
}

export function firstName(ctx: CoachContext): string {
  return (ctx.profile?.firstName || '').trim();
}

/** Aktuálna váha – posledný záznam, inak z profilu. */
export function currentWeight(ctx: CoachContext): number {
  const sorted = sortByTime(ctx.entries.weight);
  const last = sorted.length ? num(sorted[sorted.length - 1].weight) : 0;
  return last || num(ctx.profile?.currentWeight);
}

export function bmr(ctx: CoachContext): number {
  const p = ctx.profile || {};
  const w = currentWeight(ctx), h = num(p.height), age = num(p.age);
  if (!w || !h || !age) return 0;
  return 10 * w + 6.25 * h - 5 * age + (p.gender === 'female' ? -161 : 5);
}

export function tdee(ctx: CoachContext): number {
  const base = bmr(ctx);
  return base ? base * (ACTIVITY_MULT[ctx.profile?.activityLevel] || 1.55) : 0;
}

/** Denný kalorický cieľ – z profilu, inak Mifflin-St Jeor + úprava podľa cieľa. */
export function targetCalories(ctx: CoachContext): number {
  const fromProfile = num(ctx.profile?.targetCalories);
  if (fromProfile) return Math.round(fromProfile);
  const t = tdee(ctx);
  if (!t) return 0;
  const floor = ctx.profile?.gender === 'female' ? 1200 : 1500;
  return Math.max(floor, Math.round(t + (GOAL_ADJUST[ctx.profile?.fitnessGoal] || 0)));
}

export function proteinTarget(ctx: CoachContext): number {
  const w = currentWeight(ctx);
  if (!w) return 0;
  const perKg: Record<string, number> = { lose_weight: 1.8, gain_muscle: 2, maintain: 1.4, improve_health: 1.4 };
  return Math.round(w * (perKg[ctx.profile?.fitnessGoal] || 1.4));
}

export function bmi(ctx: CoachContext): number {
  const w = currentWeight(ctx), h = num(ctx.profile?.height);
  return w && h ? round(w / Math.pow(h / 100, 2), 1) : 0;
}

export function bmiLabel(value: number): string {
  if (!value) return '';
  if (value < 18.5) return 'podváha';
  if (value < 25) return 'zdravé pásmo';
  if (value < 30) return 'nadváha';
  return 'obezita';
}

export function sortByTime(entries: any[]): any[] {
  return [...(entries || [])].sort(
    (x, y) => (toDate(x.timestamp)?.getTime() || 0) - (toDate(y.timestamp)?.getTime() || 0)
  );
}

export function onDay(entries: any[], day: Date): any[] {
  const key = dayKey(day);
  return (entries || []).filter(e => {
    const d = toDate(e.timestamp);
    return d ? dayKey(d) === key : false;
  });
}

export function lastDays(entries: any[], days: number, now: Date): any[] {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  return (entries || []).filter(e => {
    const d = toDate(e.timestamp);
    return d ? d >= from : false;
  });
}

export interface DayTotals {
  calories: number; protein: number; carbs: number; fats: number;
  burned: number; exerciseMin: number; count: number;
}

export function dayTotals(ctx: CoachContext, day: Date = ctx.now): DayTotals {
  const food = onDay(ctx.entries.food, day);
  const ex = onDay(ctx.entries.exercise, day);
  const sum = (list: any[], key: string) => list.reduce((s, e) => s + num(e[key]), 0);
  return {
    calories: Math.round(sum(food, 'calories')),
    protein: Math.round(sum(food, 'protein')),
    carbs: Math.round(sum(food, 'carbs')),
    fats: Math.round(sum(food, 'fats')),
    burned: Math.round(sum(ex, 'caloriesBurned')),
    exerciseMin: Math.round(sum(ex, 'duration')),
    count: food.length
  };
}

export function average(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}
