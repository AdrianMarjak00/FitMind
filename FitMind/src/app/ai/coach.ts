import {
  CoachContext, average, lastDays, num, sortByTime, targetCalories
} from './context';
import { dayKey, round, toDate } from './text';

/**
 * Reporty a odporúčania z dát používateľa. Pôvodne bežali na Python
 * backende (coach_service.py), teraz sa počítajú priamo v zariadení.
 */

export interface WeeklyReportData {
  period: string;
  week_start: string;
  week_end: string;
  summary: any;
  achievements: string[];
  areas_to_improve: string[];
  recommendations: string[];
  goal_progress: any;
  overall_rating: string;
  overall_message: string;
}

function daysTracked(entries: any[]): number {
  return new Set(entries.map(e => toDate(e.timestamp)).filter(Boolean).map(d => dayKey(d as Date))).size;
}

export function weeklyReport(ctx: CoachContext): WeeklyReportData {
  const now = ctx.now;
  const start = new Date(now);
  start.setDate(start.getDate() - 6);

  const food = lastDays(ctx.entries.food, 7, now);
  const exercise = lastDays(ctx.entries.exercise, 7, now);
  const mood = lastDays(ctx.entries.mood, 7, now);
  const stress = lastDays(ctx.entries.stress, 7, now);
  const sleep = lastDays(ctx.entries.sleep, 7, now);
  const weight = sortByTime(lastDays(ctx.entries.weight, 30, now));

  const report: WeeklyReportData = {
    period: 'weekly',
    week_start: start.toISOString(),
    week_end: now.toISOString(),
    summary: {},
    achievements: [],
    areas_to_improve: [],
    recommendations: [],
    goal_progress: {},
    overall_rating: 'needs_improvement',
    overall_message: ''
  };

  // Kalórie
  if (food.length) {
    const total = food.reduce((s, e) => s + num(e.calories), 0);
    const tracked = daysTracked(food);
    const avg = total / Math.max(tracked, 1);
    report.summary.calories = { total: round(total), daily_average: round(avg), days_tracked: tracked };

    const target = targetCalories(ctx);
    if (target) {
      const diffPct = ((avg - target) / target) * 100;
      report.goal_progress.calories = {
        target, actual: round(avg), difference: round(avg - target), on_track: Math.abs(diffPct) <= 10
      };
      if (Math.abs(diffPct) <= 10) {
        report.achievements.push(`🎯 Držíš kalorický cieľ (${target} kcal/deň)`);
      } else if (diffPct > 10) {
        report.areas_to_improve.push(`⚠️ Priemerný príjem ${Math.round(avg)} kcal je nad cieľom (${target} kcal)`);
        report.recommendations.push('Zmenši porcie príloh a sladené nápoje vymeň za vodu');
      } else {
        report.areas_to_improve.push(`⚠️ Priemerný príjem ${Math.round(avg)} kcal je výrazne pod cieľom (${target} kcal)`);
        report.recommendations.push('Jedz pravidelnejšie – príliš nízky príjem spomaľuje regeneráciu');
      }
    }
    if (tracked >= 6) report.achievements.push(`📊 Jedlo zapísané ${tracked} dní zo 7`);
  } else {
    report.areas_to_improve.push('❌ Žiadne záznamy o jedle tento týždeň');
    report.recommendations.push('Začni zapisovať jedlá – stačí mi napísať, čo si jedol');
  }

  // Cvičenie
  if (exercise.length) {
    const minutes = exercise.reduce((s, e) => s + num(e.duration), 0);
    const count = exercise.length;
    report.summary.exercise = {
      total_minutes: round(minutes),
      workout_count: count,
      avg_duration: round(minutes / count),
      types: Array.from(new Set(exercise.map(e => e.type || 'iné')))
    };
    if (count >= 5) report.achievements.push(`💪 ${count} tréningov tento týždeň – skvelé!`);
    else if (count >= 3) report.achievements.push(`✅ ${count} tréningy – dobré tempo!`);
    else {
      report.areas_to_improve.push(`⚠️ Tento týždeň len ${count}× pohyb`);
      report.recommendations.push('Snaž sa hýbať aspoň 3–4× týždenne');
    }
    if (minutes >= 150) report.achievements.push(`🏆 ${Math.round(minutes)} min aktivity – splnené odporúčanie WHO`);
  } else {
    report.areas_to_improve.push('❌ Žiadne cvičenie tento týždeň');
    report.recommendations.push('Začni s 20–30 minútami denne, napríklad rýchlou chôdzou');
  }

  // Nálada
  if (mood.length) {
    const avg = average(mood.map(e => num(e.score)));
    report.summary.mood = { average_score: round(avg, 1), entries_count: mood.length };
    if (avg >= 7) report.achievements.push(`😊 Výborná nálada tento týždeň (${avg.toFixed(1)}/10)`);
    else if (avg < 4) {
      report.areas_to_improve.push(`😔 Nižšia nálada (${avg.toFixed(1)}/10)`);
      report.recommendations.push('Pohyb vonku, spánok a kontakt s ľuďmi náladu citeľne zlepšujú');
    }
  }

  // Spánok
  if (sleep.length) {
    const avg = average(sleep.map(e => num(e.hours)));
    report.summary.sleep = { average_hours: round(avg, 1), nights_tracked: sleep.length };
    if (avg >= 7 && avg <= 9) report.achievements.push(`😴 Optimálny spánok (${avg.toFixed(1)} h/noc)`);
    else if (avg < 7) {
      report.areas_to_improve.push(`⚠️ Málo spánku (${avg.toFixed(1)} h)`);
      report.recommendations.push('Choď spať o 30 minút skôr a hodinu pred spaním odlož obrazovky');
    }
  }

  // Stres
  if (stress.length) {
    const avg = average(stress.map(e => num(e.level)));
    report.summary.stress = { average_level: round(avg, 1), entries_count: stress.length };
    if (avg > 7) {
      report.areas_to_improve.push(`😰 Vysoký stres (${avg.toFixed(1)}/10)`);
      report.recommendations.push('Zaraď dychové cvičenia, prechádzky alebo jogu');
    }
  }

  // Váha
  if (weight.length >= 2) {
    const latest = num(weight[weight.length - 1].weight);
    const earliest = num(weight[0].weight);
    report.summary.weight = { current: latest, change: round(latest - earliest, 2), entries: weight.length };
    const target = num(ctx.profile?.targetWeight);
    if (target) {
      const diff = latest - target;
      report.goal_progress.weight = { target, current: latest, to_goal: round(diff, 1) };
      if (Math.abs(diff) < 2) report.achievements.push(`🎯 Si blízko cieľovej váhy (${target} kg)!`);
    }
  }

  const wins = report.achievements.length;
  if (wins >= 5) {
    report.overall_rating = 'excellent';
    report.overall_message = '🌟 Excelentný týždeň! Pokračuj ďalej!';
  } else if (wins >= 3) {
    report.overall_rating = 'good';
    report.overall_message = '✅ Dobrá práca! Ešte pár vylepšení a si na vrchole.';
  } else {
    report.overall_message = '💪 Tento týždeň bol slabší, no každý zápis sa počíta. Ideme ďalej!';
  }
  return report;
}

export function weeklyReportText(ctx: CoachContext): string {
  const r = weeklyReport(ctx);
  const lines = ['📊 **Tvoj týždeň v číslach**', ''];
  const s = r.summary;
  if (s.calories) lines.push(`🍽️ Jedlo: priemer ${s.calories.daily_average} kcal/deň (dni so záznamom: ${s.calories.days_tracked})`);
  if (s.exercise) lines.push(`🏃 Pohyb: ${s.exercise.workout_count}× spolu ${s.exercise.total_minutes} min`);
  if (s.sleep) lines.push(`😴 Spánok: priemer ${s.sleep.average_hours} h`);
  if (s.mood) lines.push(`😊 Nálada: ${s.mood.average_score}/10`);
  if (s.stress) lines.push(`😰 Stres: ${s.stress.average_level}/10`);
  if (s.weight) {
    const ch = s.weight.change;
    lines.push(`⚖️ Váha: ${s.weight.current} kg (${ch > 0 ? '+' : ''}${ch} kg za posledný mesiac)`);
  }
  if (r.achievements.length) {
    lines.push('', '**Čo sa podarilo**');
    r.achievements.forEach(a => lines.push(`  • ${a}`));
  }
  if (r.areas_to_improve.length) {
    lines.push('', '**Na čom popracovať**');
    r.areas_to_improve.forEach(a => lines.push(`  • ${a}`));
  }
  if (r.recommendations.length) {
    lines.push('', '**Odporúčania**');
    r.recommendations.forEach(a => lines.push(`  • ${a}`));
  }
  lines.push('', r.overall_message);
  return lines.join('\n');
}

export function recommendations(ctx: CoachContext): string[] {
  const list = [...weeklyReport(ctx).recommendations];
  const goal = ctx.profile?.fitnessGoal;
  if (goal === 'lose_weight') {
    list.push('🔥 Pre chudnutie: kardio 3–4× a silový tréning 2–3× týždenne');
    list.push('🍎 Kalorický deficit 300–500 kcal denne – nie viac');
  } else if (goal === 'gain_muscle') {
    list.push('💪 Pre svaly: silový tréning 4–5× týždenne s postupným pridávaním záťaže');
    list.push('🥩 Bielkoviny: 1,6–2,2 g na kg tvojej váhy denne');
  } else if (goal === 'improve_health') {
    list.push('⚡ Pre energiu: pravidelný spánok 7–8 h a raňajky do hodiny po prebudení');
    list.push('💧 Pitný režim: aspoň 2–3 litre vody denne');
  }
  if (!list.length) {
    return [
      '🎯 Nastav si konkrétne ciele v profile',
      '📊 Zapisuj jedlo a pohyb každý deň',
      '💪 Aspoň 30 minút pohybu denne',
      '😴 Pravidelný spánok 7–8 hodín',
      '💧 Aspoň 2 litre vody denne'
    ];
  }
  return list.slice(0, 5);
}

export function goalProgress(ctx: CoachContext, userId: string): any {
  const items: any[] = [];
  const targetWeight = num(ctx.profile?.targetWeight);
  const weights = sortByTime(ctx.entries.weight);
  const startWeight = num(ctx.profile?.currentWeight);

  if (targetWeight && (weights.length || startWeight)) {
    const current = weights.length ? num(weights[weights.length - 1].weight) : startWeight;
    const diff = current - targetWeight;
    const span = Math.abs(startWeight - targetWeight);
    const percentage = span > 0
      ? Math.max(0, Math.min(100, Math.round((1 - Math.abs(diff) / span) * 100)))
      : (Math.abs(diff) < 0.5 ? 100 : 0);
    items.push({
      goal: 'Cieľová váha',
      target: `${targetWeight} kg`,
      current: `${current} kg`,
      difference: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`,
      percentage,
      on_track: Math.abs(diff) < 5
    });
  }

  const target = targetCalories(ctx);
  const food = lastDays(ctx.entries.food, 7, ctx.now);
  if (target && food.length) {
    const avg = food.reduce((s, e) => s + num(e.calories), 0) / Math.max(daysTracked(food), 1);
    const diff = avg - target;
    items.push({
      goal: 'Denný kalorický cieľ',
      target: `${target} kcal`,
      current: `${Math.round(avg)} kcal (priemer dní so záznamom)`,
      difference: `${diff > 0 ? '+' : ''}${Math.round(diff)} kcal`,
      percentage: Math.max(0, Math.min(100, Math.round((avg / target) * 100))),
      on_track: Math.abs(diff) <= target * 0.1
    });
  }

  return { user_id: userId, goals: items.map(i => i.goal), progress_items: items };
}
