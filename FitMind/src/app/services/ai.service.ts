import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface WeeklyReport {
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

export interface MonthlyReport {
  period: string;
  month_start: string;
  month_end: string;
  summary: any;
  trends: any;
  achievements: string[];
  recommendations: string[];
}

export interface GoalProgress {
  user_id: string;
  goals: string[];
  progress_items: Array<{
    goal: string;
    target: string;
    current: string;
    difference: string;
    percentage: number;
    on_track: boolean;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private baseUrl = environment.apiUrl;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // === CHAT FUNKCIE ===

  sendMessage(userId: string, message: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/chat`, { user_id: userId, message }).pipe(
      tap(response => {
        const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date() };
        const aiMsg: ChatMessage = { 
          role: 'assistant', 
          content: response.odpoved || response.message || 'Odpoveď pripravená', 
          timestamp: new Date() 
        };
        
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, userMsg, aiMsg]);
      })
    );
  }

  getChatHistory(userId: string, limit: number = 50): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/chat/history/${userId}?limit=${limit}`);
  }

  clearChatHistory(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/chat/history/${userId}`).pipe(
      tap(() => this.clearChat())
    );
  }

  clearChat(): void {
    this.messagesSubject.next([]);
  }

  // === KOUČ FUNKCIE ===

  getWeeklyReport(userId: string): Observable<{ user_id: string; report: WeeklyReport }> {
    return this.http.get<{ user_id: string; report: WeeklyReport }>(
      `${this.baseUrl}/coach/weekly-report/${userId}`
    );
  }

  getMonthlyReport(userId: string): Observable<{ user_id: string; report: MonthlyReport }> {
    return this.http.get<{ user_id: string; report: MonthlyReport }>(
      `${this.baseUrl}/coach/monthly-report/${userId}`
    );
  }

  getPersonalizedRecommendations(userId: string): Observable<{ 
    user_id: string; 
    recommendations: string[]; 
    count: number 
  }> {
    return this.http.get<{ user_id: string; recommendations: string[]; count: number }>(
      `${this.baseUrl}/coach/recommendations/${userId}`
    );
  }

  getGoalProgress(userId: string): Observable<GoalProgress> {
    return this.http.get<GoalProgress>(`${this.baseUrl}/coach/goal-progress/${userId}`);
  }
}
