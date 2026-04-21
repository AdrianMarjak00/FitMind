import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Polozka {
  nazov: string;
  cena: number;
}

@Injectable({ providedIn: 'root' })
export class TestPythonService {
  // Test server beží na porte 8001, oddelene od FitMind backendu (8000)
  private apiUrl = 'http://localhost:8001';

  constructor(private http: HttpClient) {}

  getPolozky(): Observable<Polozka[]> {
    return this.http.get<Polozka[]>(`${this.apiUrl}/polozky`);
  }

  pridajPolozku(polozka: Polozka): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/polozky`, polozka);
  }
}
