import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../services/auth.service';
import { UserFitnessService } from '../../services/user-fitness.service';
import { UserProfile } from '../../models/user-profile.interface';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  templateUrl: './complete-profile.html',
  styleUrls: ['./complete-profile.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class CompleteProfileComponent implements OnInit {
  currentStep = 1;
  isLoading = false;
  errorMsg = '';

  userEmail = '';
  userId = '';

  profile: Partial<UserProfile> = {
    firstName: '',
    lastName: '',
    age: 25,
    gender: 'male',
    height: 170,
    currentWeight: 70,
    targetWeight: 65,
    fitnessGoal: 'maintain',
    activityLevel: 'moderate'
  };

  medicalConditionsText = '';

  constructor(
    private auth: AuthService,
    private userFitnessService: UserFitnessService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.getCurrentUser().subscribe(user => {
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      this.userId = user.uid;
      this.userEmail = user.email || '';

      // Predvyplň meno ak je dostupné z Google/Apple
      if (user.displayName) {
        const nameParts = user.displayName.split(' ');
        this.profile.firstName = nameParts[0] || '';
        this.profile.lastName = nameParts.slice(1).join(' ') || '';
      }
    });
  }

  nextStep(): void {
    this.errorMsg = '';

    if (this.currentStep === 1) {
      if (!this.profile.firstName || !this.profile.lastName) {
        this.errorMsg = 'Vyplň meno a priezvisko.';
        return;
      }
      if ((this.profile.age ?? 0) < 1) {
        this.errorMsg = 'Vek musí byť väčší ako 0.';
        return;
      }
    }

    if (this.currentStep < 2) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  calculateBMI(): string {
    if (this.profile.height && this.profile.currentWeight) {
      const h = this.profile.height / 100;
      return (this.profile.currentWeight / (h * h)).toFixed(1);
    }
    return '--';
  }

  saveProfile(): void {
    this.errorMsg = '';

    if (!this.profile.firstName || !this.profile.lastName) {
      this.errorMsg = 'Vyplň meno a priezvisko.';
      return;
    }

    this.isLoading = true;

    const userProfile: UserProfile = {
      userId: this.userId,
      email: this.userEmail.toLowerCase(),

      firstName: this.profile.firstName || '',
      lastName: this.profile.lastName || '',
      age: this.profile.age || 0,
      gender: this.profile.gender || 'male',

      height: this.profile.height || 0,
      currentWeight: this.profile.currentWeight || 0,
      targetWeight: this.profile.targetWeight || 0,

      fitnessGoal: this.profile.fitnessGoal || 'maintain',
      activityLevel: this.profile.activityLevel || 'moderate',

      medicalConditions: this.medicalConditionsText
        ? this.medicalConditionsText.split(',').map(v => v.trim())
        : [],

      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.userFitnessService.createUserProfile(userProfile).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isLoading = false;
        this.errorMsg = 'Chyba pri ukladaní profilu. Skús to znova.';
      }
    });
  }
}
