import { Injectable } from '@angular/core';
import { Firestore, collectionData, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Review } from '../models/review.interface';

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  constructor(private firestore: Firestore) {}

  getReviews(): Observable<Review[]> {
    const reviewsRef = collection(this.firestore, 'reviews');
    return collectionData(reviewsRef, { idField: 'id' }) as Observable<Review[]>;
  }
}
