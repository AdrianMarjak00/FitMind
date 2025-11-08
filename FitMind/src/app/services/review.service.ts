import { Injectable } from '@angular/core';
import { Firestore, collectionData, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Review {
  author: string;
  rating: number;        
  text: string;
  date: any;  
}

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
