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

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = `${environment.apiUrl}/chat`;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {}

  sendMessage(userId: string, message: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { user_id: userId, message }).pipe(
      tap(response => {
        const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date() };
        const aiMsg: ChatMessage = { role: 'assistant', content: response.odpoved, timestamp: new Date() };
        
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, userMsg, aiMsg]);
      })
    );
  }

  clearChat(): void {
    this.messagesSubject.next([]);
  }
}
