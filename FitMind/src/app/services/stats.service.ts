import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, setDoc, query, where, orderBy } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { Activity } from '../models/activity.model';
import { Stats } from '../models/stats.interface';

@Injectable({
  providedIn: 'root'
})
export class StatsService {

  constructor(private firestore: Firestore) {}

  // Existing method (renamed from getStats to getOverallStats for clarity)
  getOverallStats(): Observable<Stats[]> {
    const statsRef = collection(this.firestore, 'overall_stats');
    return collectionData(statsRef, { idField: 'id' }) as Observable<Stats[]>;
  }

  // New method: Save a new activity (from AI)
  saveActivity(userId: string, activity: Activity): Observable<void> {
    const activityRef = doc(collection(this.firestore, 'activities'));
    
    // Set Firestore document ID and add user ID
    const dataToSave = { ...activity, userId: userId, timestamp: new Date() };
    delete dataToSave.id; // Ensure ID is not saved as a field
    
    return from(setDoc(activityRef, dataToSave));
  }

  // New method: Get recent activities for dashboard list
  getRecentActivities(userId: string): Observable<Activity[]> {
    const activitiesCollection = collection(this.firestore, 'activities');
    
    // Query to filter by user and order by recent time
    const q = query(
      activitiesCollection, 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
      // limit(10) - might be useful to add later
    );

    return collectionData(q, { idField: 'id' }) as Observable<Activity[]>;
  }
}