import { Component } from '@angular/core';
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
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
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
export class RegisterComponent {
  email = '';
  password = '';

  currentStep = 1;
  isLoading = false;
  errorMsg = '';

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

  nextStep(): void {
    this.errorMsg = '';

    if (this.currentStep === 1) {
      if (this.password.length < 8) {
        this.errorMsg = 'Heslo musí mať aspoň 8 znakov.';
        return;
      }

      if ((this.profile.age ?? 0) < 0) {
        this.errorMsg = 'Vek nemôže byť záporný.';
        return;
      }
    }

    if (this.currentStep < 3) {
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

  register(): void {
    this.errorMsg = '';

    if (this.password.length < 8) {
      this.errorMsg = 'Heslo musí mať aspoň 8 znakov.';
      return;
    }

    if ((this.profile.age ?? 0) < 0) {
      this.errorMsg = 'Vek nemôže byť záporný.';
      return;
    }

    this.isLoading = true;

    this.auth.register(this.email, this.password).subscribe({
      next: user => {
        const userProfile: UserProfile = {
          userId: user.uid,
          email: this.email,

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
            alert('✅ Účet bol úspešne vytvorený!');
            this.router.navigate(['/dashboard']);
          },
          error: () => {
            this.isLoading = false;
            this.errorMsg = 'Chyba pri ukladaní profilu.';
          }
        });
      },
      error: err => {
        this.isLoading = false;

        if (err.code === 'auth/email-already-in-use') {
          this.errorMsg = 'Tento e-mail už je registrovaný.';
        } else if (err.code === 'auth/weak-password') {
          this.errorMsg = 'Heslo musí mať aspoň 8 znakov.';
        } else {
          this.errorMsg = 'Chyba pri registrácii.';
        }
      }
    });
  }
}
