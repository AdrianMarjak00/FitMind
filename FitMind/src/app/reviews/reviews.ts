import { Component } from '@angular/core';
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
  imports: [CommonModule, MatCardModule, MatIconModule, ReactiveFormsModule, MatInputModule],
  templateUrl: './reviews.html',
  styleUrls: ['./reviews.scss']
})
export class Reviews {
  reviews$: Observable<Review[]>;
  reviewForm: FormGroup;
  showForm = false;
  isSubmitting = false;

  constructor(
    private reviewsService: ReviewsService,
    private fb: FormBuilder
  ) {
    this.reviews$ = this.reviewsService.getReviews();
    
    this.reviewForm = this.fb.group({
      author: ['', [Validators.required, Validators.minLength(3)]],
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      text: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  setRating(rating: number): void {
    this.reviewForm.patchValue({ rating });
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
        this.reviewForm.reset({ rating: 5, author: '', text: '' });
        this.showForm = false;
      } catch (error) {
        console.error('Chyba pri odosielaní:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}