import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Activity } from '../models/activity.model';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  // Use a dedicated endpoint for structured data processing
  private activityApiUrl = 'http://localhost:8000/api/process-activity'; 
  private chatApiUrl = 'http://localhost:8000/api/chat';
  
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // New method for processing text input into Activity data
  processInputForActivity(userId: string, rawInput: string): Observable<Activity | null> {
    return this.http.post<any>(this.activityApiUrl, { user_id: userId, raw_input: rawInput }).pipe(
      map(response => {
        // Assume backend returns a structured object matching Activity interface
        if (response && response.type && response.description) {
          // Map response fields to the Activity interface
          const activity: Activity = {
            userId: userId,
            type: response.type,
            description: response.description,
            timestamp: new Date(), 
            caloriesIn: response.calories_in,
            caloriesOut: response.calories_out,
            durationMin: response.duration_min,
            rawInput: rawInput,
          };
          return activity;
        }
        return null;
      })
    );
  }

  // Existing chat method
  sendMessage(userId: string, message: string): Observable<any> {
    return this.http.post<any>(this.chatApiUrl, { user_id: userId, message }).pipe(
      tap(response => {
        const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date() };
        const aiMsg: ChatMessage = { role: 'assistant', content: response.odpoved || response.message || 'Response ready', timestamp: new Date() };
        
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, userMsg, aiMsg]);
      })
    );
  }

  clearChat(): void {
    this.messagesSubject.next([]);
  }
}