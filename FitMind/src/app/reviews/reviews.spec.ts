import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Reviews } from './reviews';
import { ReviewsService } from '../services/review.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Reviews', () => {
  let component: Reviews;
  let fixture: ComponentFixture<Reviews>;
  
  const reviewsServiceMock = {
    getReviews: jasmine.createSpy('getReviews').and.returnValue(of([])),
    addReview: jasmine.createSpy('addReview').and.returnValue(Promise.resolve())
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reviews, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        { provide: ReviewsService, useValue: reviewsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Reviews);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle form visibility', () => {
    component.toggleForm();
    expect(component.showForm).toBeTrue();
    component.toggleForm();
    expect(component.showForm).toBeFalse();
  });
});