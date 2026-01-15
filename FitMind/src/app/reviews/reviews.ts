import { Component, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Review } from '../models/review.interface';
import { ReviewsService } from '../services/review.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIcon],
  templateUrl: './reviews.html',
  styleUrls: ['./reviews.scss']
})
export class ReviewsComponent {
  reviews: Observable<Review[]>;

  constructor(private reviewsService: ReviewsService) {
    this.reviews = this.reviewsService.getReviews();
  }
}
