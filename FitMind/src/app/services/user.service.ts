import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    CreateUserProfileDto,
    UpdateGoalsDto,
    UpdatePreferencesDto
} from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private baseUrl = `${environment.apiUrl}/profile`;

    constructor(private http: HttpClient) { }

    /**
     * Create user profile
     */
    createProfile(userId: string, profileDto: CreateUserProfileDto): Observable<{ success: boolean }> {
        return this.http.post<{ success: boolean }>(this.baseUrl, {
            user_id: userId,
            ...this.convertToSnakeCase(profileDto)
        });
    }

    /**
     * Update user goals
     */
    updateGoals(userId: string, goalsDto: UpdateGoalsDto): Observable<{ success: boolean }> {
        return this.http.put<{ success: boolean }>(`${this.baseUrl}/${userId}/goals`, goalsDto);
    }

    /**
     * Update user preferences
     */
    updatePreferences(userId: string, preferencesDto: UpdatePreferencesDto): Observable<{ success: boolean }> {
        return this.http.put<{ success: boolean }>(`${this.baseUrl}/${userId}/preferences`, preferencesDto);
    }

    /**
     * Calculate BMI
     */
    calculateBMI(weightKg: number, heightCm: number): number {
        const heightM = heightCm / 100;
        return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    }

    /**
     * Convert camelCase to snake_case for backend API
     */
    private convertToSnakeCase(obj: any): any {
        const result: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                result[snakeKey] = obj[key];
            }
        }
        return result;
    }
}
