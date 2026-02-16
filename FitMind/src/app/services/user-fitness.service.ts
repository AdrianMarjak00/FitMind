import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, collectionData, query, where, orderBy, limit, Timestamp, addDoc } from '@angular/fire/firestore';
import { Observable, from, map, forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { FoodEntry, WorkoutEntry, StressEntry, MoodEntry, SleepEntry, WeightEntry } from '../models/user-fitness-data.interface';
import { UserProfile } from '../models/user-profile.interface';

@Injectable({
  providedIn: 'root'
})
export class UserFitnessService {
  // Jediná hlavná kolekcia pre všetky údaje používateľov
  private readonly USERS_COLLECTION = 'users';

  constructor(private firestore: Firestore, private injector: Injector) { }

  // ===== PROFIL POUŽÍVATEĽA =====

  /**
   * Vytvorí používateľský profil pri registrácii
   */
  createUserProfile(profile: UserProfile): Observable<void> {
    if (!profile.userId) {
      throw new Error('User ID is required');
    }
    const userDoc = doc(this.firestore, this.USERS_COLLECTION, profile.userId);
    const dataToSave = {
      ...profile,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    return from(setDoc(userDoc, dataToSave));
  }

  /**
   * Získa používateľský profil
   */
  getUserProfile(userId: string): Observable<UserProfile | null> {
    return runInInjectionContext(this.injector, () => {
      const userDoc = doc(this.firestore, this.USERS_COLLECTION, userId);
      return from(getDoc(userDoc)).pipe(
        map(docSnap => {
          if (docSnap.exists()) {
            return { ...docSnap.data(), userId } as UserProfile;
          }
          return null;
        })
      );
    });
  }

  /**
   * Aktualizuje používateľský profil
   */
  updateProfile(userId: string, updates: Partial<UserProfile>): Observable<void> {
    const userDoc = doc(this.firestore, this.USERS_COLLECTION, userId);
    return from(updateDoc(userDoc, {
      ...updates,
      updatedAt: Timestamp.now()
    }));
  }

  // ===== ZÁZNAMY O JEDLE (foodEntries) =====

  addFoodEntry(userId: string, entry: Omit<FoodEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.USERS_COLLECTION, userId, 'foodEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(map(ref => ref.id));
  }

  getFoodEntries(userId: string, days: number = 7): Observable<FoodEntry[]> {
    return runInInjectionContext(this.injector, () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      const entriesRef = query(
        collection(this.firestore, this.USERS_COLLECTION, userId, 'foodEntries'),
        where('timestamp', '>=', cutoffTimestamp),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      return collectionData(entriesRef, { idField: 'id' }) as Observable<FoodEntry[]>;
    });
  }

  deleteFoodEntry(userId: string, entryId: string): Observable<void> {
    const entryDoc = doc(this.firestore, this.USERS_COLLECTION, userId, 'foodEntries', entryId);
    return from(deleteDoc(entryDoc));
  }

  // ===== ZÁZNAMY O TRÉNINGOCH (workoutEntries) =====

  addWorkoutEntry(userId: string, entry: Omit<WorkoutEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.USERS_COLLECTION, userId, 'workoutEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(map(ref => ref.id));
  }

  getWorkoutEntries(userId: string, days: number = 7): Observable<WorkoutEntry[]> {
    return runInInjectionContext(this.injector, () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      const entriesRef = query(
        collection(this.firestore, this.USERS_COLLECTION, userId, 'workoutEntries'),
        where('timestamp', '>=', cutoffTimestamp),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      return collectionData(entriesRef, { idField: 'id' }) as Observable<WorkoutEntry[]>;
    });
  }

  deleteWorkoutEntry(userId: string, entryId: string): Observable<void> {
    const entryDoc = doc(this.firestore, this.USERS_COLLECTION, userId, 'workoutEntries', entryId);
    return from(deleteDoc(entryDoc));
  }

  // ===== ZÁZNAMY O STRESE (stressEntries) =====

  addStressEntry(userId: string, entry: Omit<StressEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.USERS_COLLECTION, userId, 'stressEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(map(ref => ref.id));
  }

  deleteStressEntry(userId: string, entryId: string): Observable<void> {
    const entryDoc = doc(this.firestore, this.USERS_COLLECTION, userId, 'stressEntries', entryId);
    return from(deleteDoc(entryDoc));
  }

  // ===== ZÁZNAMY O NÁLADE (moodEntries) =====

  addMoodEntry(userId: string, entry: Omit<MoodEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.USERS_COLLECTION, userId, 'moodEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(map(ref => ref.id));
  }

  deleteMoodEntry(userId: string, entryId: string): Observable<void> {
    const entryDoc = doc(this.firestore, this.USERS_COLLECTION, userId, 'moodEntries', entryId);
    return from(deleteDoc(entryDoc));
  }

  // ===== ZÁZNAMY O SPÁNKU (sleepEntries) =====

  addSleepEntry(userId: string, entry: Omit<SleepEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.USERS_COLLECTION, userId, 'sleepEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(map(ref => ref.id));
  }

  deleteSleepEntry(userId: string, entryId: string): Observable<void> {
    const entryDoc = doc(this.firestore, this.USERS_COLLECTION, userId, 'sleepEntries', entryId);
    return from(deleteDoc(entryDoc));
  }

  // ===== ZÁZNAMY O VÁHE (weightEntries) =====

  addWeightEntry(userId: string, entry: Omit<WeightEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.USERS_COLLECTION, userId, 'weightEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(map(ref => ref.id));
  }

  deleteWeightEntry(userId: string, entryId: string): Observable<void> {
    const entryDoc = doc(this.firestore, this.USERS_COLLECTION, userId, 'weightEntries', entryId);
    return from(deleteDoc(entryDoc));
  }

  // ===== AGREGOVANÉ DÁTA PRE AI =====

  /**
   * Získa posledné záznamy pre AI kontext pomocou forkJoin
   */
  getRecentEntries(userId: string, days: number = 7): Observable<{
    food: FoodEntry[];
    workout: WorkoutEntry[];
    stress: StressEntry[];
    mood: MoodEntry[];
    sleep: SleepEntry[];
    weight: WeightEntry[];
  }> {
    return runInInjectionContext(this.injector, () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      const createQuery = (subcollection: string, maxItems: number = 50) => query(
        collection(this.firestore, this.USERS_COLLECTION, userId, subcollection),
        where('timestamp', '>=', cutoffTimestamp),
        orderBy('timestamp', 'desc'),
        limit(maxItems)
      );

      return forkJoin({
        food: (collectionData(createQuery('foodEntries'), { idField: 'id' }) as Observable<FoodEntry[]>).pipe(take(1)),
        workout: (collectionData(createQuery('workoutEntries'), { idField: 'id' }) as Observable<WorkoutEntry[]>).pipe(take(1)),
        stress: (collectionData(createQuery('stressEntries'), { idField: 'id' }) as Observable<StressEntry[]>).pipe(take(1)),
        mood: (collectionData(createQuery('moodEntries'), { idField: 'id' }) as Observable<MoodEntry[]>).pipe(take(1)),
        sleep: (collectionData(createQuery('sleepEntries'), { idField: 'id' }) as Observable<SleepEntry[]>).pipe(take(1)),
        weight: (collectionData(createQuery('weightEntries', 10), { idField: 'id' }) as Observable<WeightEntry[]>).pipe(take(1))
      });
    });
  }
}
