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

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string;
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

  // Conversation management
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  private activeConversationIdSubject = new BehaviorSubject<string | null>(null);

  public conversations$ = this.conversationsSubject.asObservable();
  public activeConversationId$ = this.activeConversationIdSubject.asObservable();

  constructor(private http: HttpClient) {}

  // === CHAT FUNKCIE ===

  sendMessage(userId: string, message: string, conversationId?: string): Observable<any> {
    const convId = conversationId || this.activeConversationIdSubject.value;
    // Backend získa user_id z JWT tokenu, nie z requestu (bezpečnosť)
    return this.http.post<any>(`${this.baseUrl}/chat`, {
      message,
      conversation_id: convId
    }).pipe(
      tap(response => {
        const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date() };
        const aiMsg: ChatMessage = {
          role: 'assistant',
          content: response.odpoved || response.message || 'Odpoveď pripravená',
          timestamp: new Date()
        };

        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, userMsg, aiMsg]);

        // Refresh conversations to update lastMessage and updatedAt
        if (convId) {
          this.loadConversations(userId);
        }
      })
    );
  }

  getChatHistory(userId: string, limit: number = 50): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/chat/history/${userId}?limit=${limit}`);
  }

  loadChatHistory(userId: string, limit: number = 50): void {
    this.getChatHistory(userId, limit).subscribe({
      next: (response) => {
        if (response && response.messages) {
          // Konvertuj správy na ChatMessage formát
          const messages: ChatMessage[] = response.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: this.parseTimestamp(msg.timestamp)
          }));
          // Nahraď aktuálne správy históriou
          this.messagesSubject.next(messages);
        }
      },
      error: () => {
        // Tiché zlyhanie - história sa nenačíta
      }
    });
  }

  private parseTimestamp(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    if (timestamp?.toDate) return timestamp.toDate();
    return new Date();
  }

  clearChatHistory(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/chat/history/${userId}`).pipe(
      tap(() => this.clearChat())
    );
  }

  clearChat(): void {
    this.messagesSubject.next([]);
  }

  // === CONVERSATION MANAGEMENT ===

  getConversations(userId: string): Observable<{ conversations: Conversation[] }> {
    return this.http.get<{ conversations: Conversation[] }>(`${this.baseUrl}/conversations/${userId}`);
  }

  loadConversations(userId: string): void {
    this.getConversations(userId).subscribe({
      next: (response) => {
        if (response && response.conversations) {
          const conversations = response.conversations.map((conv: any) => ({
            ...conv,
            createdAt: this.parseTimestamp(conv.createdAt),
            updatedAt: this.parseTimestamp(conv.updatedAt)
          }));
          this.conversationsSubject.next(conversations);

          // Ak nie je aktívna konverzácia a existujú konverzácie, vyber prvú
          if (!this.activeConversationIdSubject.value && conversations.length > 0) {
            this.switchConversation(userId, conversations[0].id);
          }
        }
      },
      error: () => { /* Tiché zlyhanie */ }
    });
  }

  createConversation(userId: string, title?: string): Observable<{ conversation_id: string }> {
    return this.http.post<{ conversation_id: string }>(`${this.baseUrl}/conversations/${userId}`, {
      title: title || 'Nová konverzácia'
    }).pipe(
      tap((response) => {
        // Refresh conversations list
        this.loadConversations(userId);
        // Switch to new conversation
        this.activeConversationIdSubject.next(response.conversation_id);
        this.messagesSubject.next([]);
      })
    );
  }

  deleteConversation(userId: string, conversationId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/conversations/${userId}/${conversationId}`).pipe(
      tap(() => {
        // Refresh conversations list
        this.loadConversations(userId);
        // If we deleted the active conversation, clear messages
        if (this.activeConversationIdSubject.value === conversationId) {
          this.activeConversationIdSubject.next(null);
          this.messagesSubject.next([]);
        }
      })
    );
  }

  switchConversation(userId: string, conversationId: string): void {
    this.activeConversationIdSubject.next(conversationId);
    this.loadConversationMessages(userId, conversationId);
  }

  loadConversationMessages(userId: string, conversationId: string, limit: number = 50): void {
    this.http.get<{ messages: any[] }>(`${this.baseUrl}/conversations/${userId}/${conversationId}/messages?limit=${limit}`)
      .subscribe({
        next: (response) => {
          if (response && response.messages) {
            const messages: ChatMessage[] = response.messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
              timestamp: this.parseTimestamp(msg.timestamp)
            }));
            this.messagesSubject.next(messages);
          }
        },
        error: () => { /* Tiché zlyhanie */ }
      });
  }

  getActiveConversationId(): string | null {
    return this.activeConversationIdSubject.value;
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
