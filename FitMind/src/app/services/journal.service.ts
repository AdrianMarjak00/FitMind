import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Journal,
  CreateJournalDto,
  AddMealDto,
  AddActivityDto,
  UpdateMoodDto
} from '../models/journal.model';

@Injectable({
  providedIn: 'root'
})
export class JournalService {
  private baseUrl = `${environment.apiUrl}/journal`;

  constructor(private http: HttpClient) {}

  /**
   * Vytvorenie nového denníčka pre daný deň
   */
  createJournal(data: CreateJournalDto): Observable<{success: boolean; journalId: string}> {
    return this.http.post<{success: boolean; journalId: string}>(this.baseUrl, data);
  }

  /**
   * Získanie denníčka pre konkrétny deň
   */
  getJournalByDate(uid: string, date: string): Observable<{journal: Journal | null}> {
    return this.http.get<{journal: Journal | null}>(`${this.baseUrl}/${uid}/${date}`);
  }

  /**
   * Získanie denníčkov v rozsahu dátumov
   */
  getJournalRange(uid: string, startDate: string, endDate: string): Observable<{journals: Journal[]}> {
    return this.http.get<{journals: Journal[]}>(`${this.baseUrl}/${uid}/range`, {
      params: { startDate, endDate }
    });
  }

  /**
   * Update denníčka
   */
  updateJournal(journalId: string, data: Partial<Journal>): Observable<{success: boolean}> {
    return this.http.put<{success: boolean}>(`${this.baseUrl}/${journalId}`, data);
  }

  /**
   * Pridanie jedla do denníčka
   */
  addMeal(journalId: string, meal: AddMealDto): Observable<{success: boolean; mealId: string}> {
    return this.http.post<{success: boolean; mealId: string}>(`${this.baseUrl}/${journalId}/meal`, meal);
  }

  /**
   * Pridanie aktivity do denníčka
   */
  addActivity(journalId: string, activity: AddActivityDto): Observable<{success: boolean; activityId: string}> {
    return this.http.post<{success: boolean; activityId: string}>(`${this.baseUrl}/${journalId}/activity`, activity);
  }

  /**
   * Update nálady
   */
  updateMood(journalId: string, mood: UpdateMoodDto): Observable<{success: boolean}> {
    return this.http.put<{success: boolean}>(`${this.baseUrl}/${journalId}/mood`, mood);
  }

  /**
   * Update množstva vody
   */
  updateWater(journalId: string, water: number): Observable<{success: boolean}> {
    return this.http.put<{success: boolean}>(`${this.baseUrl}/${journalId}/water`, { water });
  }

  /**
   * Vymazanie denníčka
   */
  deleteJournal(journalId: string): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${this.baseUrl}/${journalId}`);
  }
}
