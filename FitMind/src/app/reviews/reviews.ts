import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Review } from '../models/review.interface';
import { ReviewsService } from '../services/review.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from "@angular/material/icon";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    ReactiveFormsModule, 
    MatInputModule
  ],
  templateUrl: './reviews.html',
  styleUrls: ['./reviews.scss']
})
export class Reviews {
  // Použitie inject() je v novom Angulari modernejšie
  private reviewsService = inject(ReviewsService);
  private fb = inject(FormBuilder);

  reviews$: Observable<Review[]>;
  reviewForm: FormGroup;
  
  showForm = false;
  isSubmitting = false;
  isSuccess = false; // Premenná pre zobrazenie ďakovnej správy

  constructor() {
    this.reviews$ = this.reviewsService.getReviews();
    
    this.reviewForm = this.fb.group({
      author: ['', [Validators.required, Validators.minLength(3)]],
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      text: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    // Ak formulár zatvárame, môžeme resetovať stav úspechu
    if (!this.showForm) {
      this.isSuccess = false;
    }
  }

  setRating(rating: number): void {
    this.reviewForm.patchValue({ rating });
  }

  // Funkcia na resetovanie po úspechu (volaná aj z HTML tlačidla)
  resetFormAfterSuccess(): void {
    this.isSuccess = false;
    this.reviewForm.reset({ rating: 5, author: '', text: '' });
  }

  async onSubmit(): Promise<void> {
    if (this.reviewForm.valid) {
      this.isSubmitting = true;
      
      const newReview: Review = {
        ...this.reviewForm.value,
        date: Timestamp.now()
      };

      try {
        await this.reviewsService.addReview(newReview);
        
        // Nastavenie stavu úspechu
        this.isSuccess = true;
        
        // Reset formulára na pozadie
        this.reviewForm.reset({ rating: 5, author: '', text: '' });
        
        // Voliteľné: Ak chceš formulár po pár sekundách úplne zavrieť
        // setTimeout(() => { this.showForm = false; this.isSuccess = false; }, 5000);

      } catch (error) {
        console.error('Chyba pri odosielaní recenzie:', error);
        alert('Ups! Nepodarilo sa odoslať recenziu. Skúste to prosím neskôr.');
      } finally {
        this.isSubmitting = false;
      }
    } else {
      // Označíme všetky polia ako dotknuté, aby sa zobrazili chyby, ak používateľ klikne na odoslať
      this.reviewForm.markAllAsTouched();
    }
  }
}