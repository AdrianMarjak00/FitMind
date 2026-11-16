import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { EntryType, num, sortByTime } from '../ai/context';
import { FitDataService } from './fit-data.service';

export interface ChartData {
  chart_type: string;
  data: any;
  days: number;
}

export interface StatsData {
  calories: any;
  exercise: any;
  sleep?: any;
  mood_trend?: any[];
  stress_trend?: any[];
  weight_trend?: any[];
}

const r1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Štatistiky a záznamy pre Tabuľky. Počítajú sa v zariadení z dát
 * vo Firestore (predtým ich vracal Python backend na Renderi).
 */
@Injectable({ providedIn: 'root' })
export class ChartsService {
  constructor(private data: FitDataService) { }

  getStats(userId: string, days: number = 30): Observable<StatsData> {
    return from(Promise.all([this.calories(userId, days), this.exercise(userId, days)])).pipe(
      map(([calories, exercise]) => ({ calories, exercise }))
    );
  }

  getChartData(userId: string, chartType: string, days: number = 30): Observable<ChartData> {
    return from(this.chart(userId, chartType, days)).pipe(
      map(data => ({ chart_type: chartType, data, days }))
    );
  }

  getEntries(userId: string, entryType: string, days: number = 30, limit: number = 100): Observable<any> {
    return from(this.data.getEntries(userId, entryType as EntryType, days, limit));
  }

  addEntry(userId: string, entryType: string, data: any): Observable<any> {
    return from(this.data.addEntry(userId, entryType as EntryType, data)).pipe(
      map(id => ({ status: 'ok', id }))
    );
  }

  deleteEntry(userId: string, entryType: string, entryId: string): Observable<any> {
    return from(this.data.deleteEntry(userId, entryType as EntryType, entryId)).pipe(
      map(() => ({ status: 'ok' }))
    );
  }

  // ---------------- Výpočty ----------------

  private async chart(userId: string, chartType: string, days: number): Promise<any> {
    switch (chartType) {
      case 'calories': return this.calories(userId, days);
      case 'exercise': return this.exercise(userId, days);
      case 'mood': return { trend: await this.trend(userId, 'mood', days, e => ({ score: num(e.score), note: e.note || '' })) };
      case 'stress': return { trend: await this.trend(userId, 'stress', days, e => ({ level: num(e.level), source: e.source || '' })) };
      case 'sleep': return { trend: await this.trend(userId, 'sleep', days, e => ({ hours: num(e.hours), quality: e.quality || '' })) };
      case 'weight': return { trend: await this.trend(userId, 'weight', days, e => ({ weight: num(e.weight) })) };
      default: return {};
    }
  }

  private async calories(userId: string, days: number): Promise<any> {
    const entries = await this.data.getEntries(userId, 'food', days, 500);
    const byMeal: Record<string, number> = {};
    const byCategory: Record<string, number> = { food: 0, drink: 0 };
    let total = 0;
    for (const e of entries) {
      const kcal = num(e.calories);
      total += kcal;
      const meal = e.mealType || 'other';
      byMeal[meal] = (byMeal[meal] || 0) + kcal;
      const category = e.category || 'food';
      byCategory[category] = (byCategory[category] || 0) + kcal;
    }
    const round = (obj: Record<string, number>) =>
      Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, r1(v)]));
    return {
      total: r1(total),
      average: days > 0 ? r1(total / days) : 0,
      by_meal: round(byMeal),
      by_category: round(byCategory),
      count: entries.length
    };
  }

  private async exercise(userId: string, days: number): Promise<any> {
    const entries = await this.data.getEntries(userId, 'exercise', days, 300);
    const byType: Record<string, number> = {};
    let minutes = 0, burned = 0;
    for (const e of entries) {
      const duration = num(e.duration);
      minutes += duration;
      burned += num(e.caloriesBurned);
      const type = e.type || 'other';
      byType[type] = (byType[type] || 0) + duration;
    }
    return {
      total_minutes: r1(minutes),
      total_calories: r1(burned),
      by_type: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, r1(v)])),
      count: entries.length
    };
  }

  private async trend(userId: string, type: EntryType, days: number, pickFields: (e: any) => any): Promise<any[]> {
    const entries = await this.data.getEntries(userId, type, days, 300);
    return sortByTime(entries).map(e => ({ date: e.timestamp, ...pickFields(e) }));
  }
}
