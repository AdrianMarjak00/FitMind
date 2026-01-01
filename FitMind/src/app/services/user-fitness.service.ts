import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDoc, setDoc, updateDoc, collectionData, query, where, orderBy, limit, Timestamp, addDoc } from '@angular/fire/firestore';
import { Observable, from, map, switchMap } from 'rxjs';
import { UserFitnessProfile, FoodEntry, ExerciseEntry, StressEntry, MoodEntry, SleepEntry, WeightEntry } from '../models/user-fitness-data.interface';

@Injectable({
  providedIn: 'root'
})
export class UserFitnessService {
  private readonly COLLECTION_NAME = 'userFitnessProfiles';

  constructor(private firestore: Firestore) {}

  // Získať alebo vytvoriť profil používateľa
  getUserProfile(userId: string): Observable<UserFitnessProfile | null> {
    const profileRef = doc(this.firestore, this.COLLECTION_NAME, userId);
    return from(getDoc(profileRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserFitnessProfile;
          return { ...data, userId: docSnap.id };
        }
        return null;
      })
    );
  }

  // Vytvoriť alebo aktualizovať profil
  saveUserProfile(profile: UserFitnessProfile): Observable<void> {
    const profileRef = doc(this.firestore, this.COLLECTION_NAME, profile.userId);
    const data = {
      ...profile,
      updatedAt: Timestamp.now(),
      createdAt: profile.createdAt || Timestamp.now()
    };
    return from(setDoc(profileRef, data, { merge: true }));
  }

  // Pridať záznam o jedle
  addFoodEntry(userId: string, entry: Omit<FoodEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.COLLECTION_NAME, userId, 'foodEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(
      map(ref => ref.id)
    );
  }

  // Pridať záznam o cvičení
  addExerciseEntry(userId: string, entry: Omit<ExerciseEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.COLLECTION_NAME, userId, 'exerciseEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(
      map(ref => ref.id)
    );
  }

  // Pridať záznam o strese
  addStressEntry(userId: string, entry: Omit<StressEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.COLLECTION_NAME, userId, 'stressEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(
      map(ref => ref.id)
    );
  }

  // Pridať záznam o nálade
  addMoodEntry(userId: string, entry: Omit<MoodEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.COLLECTION_NAME, userId, 'moodEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(
      map(ref => ref.id)
    );
  }

  // Pridať záznam o spánku
  addSleepEntry(userId: string, entry: Omit<SleepEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.COLLECTION_NAME, userId, 'sleepEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(
      map(ref => ref.id)
    );
  }

  // Pridať záznam o váhe
  addWeightEntry(userId: string, entry: Omit<WeightEntry, 'id'>): Observable<string> {
    const entryRef = collection(this.firestore, this.COLLECTION_NAME, userId, 'weightEntries');
    const data = {
      ...entry,
      timestamp: entry.timestamp || Timestamp.now()
    };
    return from(addDoc(entryRef, data)).pipe(
      map(ref => ref.id)
    );
  }

  // Získať posledné záznamy (pre AI kontext)
  getRecentEntries(userId: string, days: number = 7): Observable<{
    food: FoodEntry[];
    exercise: ExerciseEntry[];
    stress: StressEntry[];
    mood: MoodEntry[];
    sleep: SleepEntry[];
    weight: WeightEntry[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const foodRef = query(
      collection(this.firestore, this.COLLECTION_NAME, userId, 'foodEntries'),
      where('timestamp', '>=', cutoffTimestamp),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const exerciseRef = query(
      collection(this.firestore, this.COLLECTION_NAME, userId, 'exerciseEntries'),
      where('timestamp', '>=', cutoffTimestamp),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const stressRef = query(
      collection(this.firestore, this.COLLECTION_NAME, userId, 'stressEntries'),
      where('timestamp', '>=', cutoffTimestamp),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const moodRef = query(
      collection(this.firestore, this.COLLECTION_NAME, userId, 'moodEntries'),
      where('timestamp', '>=', cutoffTimestamp),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const sleepRef = query(
      collection(this.firestore, this.COLLECTION_NAME, userId, 'sleepEntries'),
      where('timestamp', '>=', cutoffTimestamp),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const weightRef = query(
      collection(this.firestore, this.COLLECTION_NAME, userId, 'weightEntries'),
      where('timestamp', '>=', cutoffTimestamp),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    return new Observable(observer => {
      const result = {
        food: [] as FoodEntry[],
        exercise: [] as ExerciseEntry[],
        stress: [] as StressEntry[],
        mood: [] as MoodEntry[],
        sleep: [] as SleepEntry[],
        weight: [] as WeightEntry[]
      };

      let completed = 0;
      const total = 6;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          observer.next(result);
          observer.complete();
        }
      };

      collectionData(foodRef, { idField: 'id' }).subscribe({
        next: (data) => { result.food = data as FoodEntry[]; checkComplete(); },
        error: (err) => { console.error('Food entries error:', err); checkComplete(); }
      });

      collectionData(exerciseRef, { idField: 'id' }).subscribe({
        next: (data) => { result.exercise = data as ExerciseEntry[]; checkComplete(); },
        error: (err) => { console.error('Exercise entries error:', err); checkComplete(); }
      });

      collectionData(stressRef, { idField: 'id' }).subscribe({
        next: (data) => { result.stress = data as StressEntry[]; checkComplete(); },
        error: (err) => { console.error('Stress entries error:', err); checkComplete(); }
      });

      collectionData(moodRef, { idField: 'id' }).subscribe({
        next: (data) => { result.mood = data as MoodEntry[]; checkComplete(); },
        error: (err) => { console.error('Mood entries error:', err); checkComplete(); }
      });

      collectionData(sleepRef, { idField: 'id' }).subscribe({
        next: (data) => { result.sleep = data as SleepEntry[]; checkComplete(); },
        error: (err) => { console.error('Sleep entries error:', err); checkComplete(); }
      });

      collectionData(weightRef, { idField: 'id' }).subscribe({
        next: (data) => { result.weight = data as WeightEntry[]; checkComplete(); },
        error: (err) => { console.error('Weight entries error:', err); checkComplete(); }
      });
    });
  }

  // Aktualizovať základné informácie profilu
  updateProfile(userId: string, updates: Partial<UserFitnessProfile>): Observable<void> {
    const profileRef = doc(this.firestore, this.COLLECTION_NAME, userId);
    return from(updateDoc(profileRef, {
      ...updates,
      updatedAt: Timestamp.now()
    }));
  }
}






