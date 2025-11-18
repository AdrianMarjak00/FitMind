import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OllamaService {

  private apiUrl = 'http://localhost:11434/api/generate'; // zmeň podľa potreby

  constructor(private http: HttpClient) {}

  generateResponse(prompt: string): Observable<any> {
    const body = {
      model: 'llama3',         // alebo iný model
      prompt: prompt
    };

    return this.http.post<any>(this.apiUrl, body);
  }
}
