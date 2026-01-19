import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collectionData, 
  collection, 
  addDoc, 
  query, 
  orderBy 
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Review } from '../models/review.interface';

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  // Použitie inject() je v modernom Angulari čistejšie ako cez constructor
  private firestore: Firestore = inject(Firestore);

  /**
   * Získa všetky recenzie z kolekcie 'reviews' zoradené podľa dátumu (od najnovších)
   */
  getReviews(): Observable<Review[]> {
    const reviewsRef = collection(this.firestore, 'reviews');
    // Vytvoríme dopyt, ktorý zoradí recenzie podľa poľa 'date' zostupne
    const reviewsQuery = query(reviewsRef, orderBy('date', 'desc'));
    
    return collectionData(reviewsQuery, { idField: 'id' }) as Observable<Review[]>;
  }

  /**
   * Pridá novú recenziu do Firestore
   * @param newReview Objekt recenzie (autor, text, hodnotenie, dátum)
   */
  async addReview(newReview: Review): Promise<void> {
    const reviewsRef = collection(this.firestore, 'reviews');
    try {
      await addDoc(reviewsRef, newReview);
    } catch (error) {
      console.error('Chyba pri ukladaní recenzie do Firestore:', error);
      throw error; // Posunieme chybu ďalej do komponentu pre zobrazenie alertu
    }
  }
}