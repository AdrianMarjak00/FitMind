import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Stats } from '../models/stats.interface';

@Injectable({
  providedIn: 'root'
})
export class StatsService {

  constructor(private firestore: Firestore) {}

  getStats(): Observable<Stats[]> {
    const statsRef = collection(this.firestore, 'stats');
    return collectionData(statsRef, { idField: 'id' }) as Observable<Stats[]>;
  }
}
