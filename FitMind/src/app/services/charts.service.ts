import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChartData {
  chart_type: string;
  data: any;
  days: number;
}

export interface StatsData {
  calories: any;
  exercise: any;
  sleep: any;
  mood_trend: any[];
  stress_trend: any[];
  weight_trend: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ChartsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStats(userId: string, days: number = 30): Observable<StatsData> {
    return this.http.get<StatsData>(`${this.apiUrl}/stats/${userId}?days=${days}`);
  }

  getChartData(userId: string, chartType: string, days: number = 30): Observable<ChartData> {
    return this.http.get<ChartData>(`${this.apiUrl}/chart/${userId}/${chartType}?days=${days}`);
  }

  getEntries(userId: string, entryType: string, days: number = 30, limit: number = 100): Observable<any> {
    return this.http.get(`${this.apiUrl}/entries/${userId}/${entryType}?days=${days}&limit=${limit}`);
  }
}






