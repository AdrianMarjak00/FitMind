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
import { MatCheckboxModule } from '@angular/material/checkbox';

import { sendEmailVerification, ActionCodeSettings } from '@angular/fire/auth';

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
    MatProgressSpinnerModule,
    MatCheckboxModule
  ]
})
export class RegisterComponent {

  email = '';
  password = '';
  confirmPassword = '';

  hidePassword = true;
  hideConfirmPassword = true;

  currentStep = 1;
  isLoading = false;
  errorMsg = '';

  gdprConsent = false;

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

  constructor(
    private auth: AuthService,
    private userFitnessService: UserFitnessService,
    private router: Router
  ) {}

  // =========================
  // STEP NAVIGATION
  // =========================

  nextStep(): void {
    this.errorMsg = '';

    if (!this.validateCurrentStep()) {
      return;
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

  // =========================
  // VALIDATION
  // =========================

  private validateCurrentStep(): boolean {

    if (this.currentStep === 1) {

      if (!this.profile.firstName || !this.profile.lastName) {
        this.errorMsg = 'Vyplň meno a priezvisko.';
        return false;
      }

      if (!this.email) {
        this.errorMsg = 'Zadaj e-mail.';
        return false;
      }

      if (this.password.length < 8) {
        this.errorMsg = 'Heslo musí mať aspoň 8 znakov.';
        return false;
      }

      if (this.password !== this.confirmPassword) {
        this.errorMsg = 'Heslá sa nezhodujú.';
        return false;
      }

      const age = Number(this.profile.age);

      if (isNaN(age) || age < 10 || age > 100) {
        this.errorMsg = 'Vek musí byť medzi 10 a 100 rokmi.';
        return false;
      }
    }

    if (this.currentStep === 2) {

      const height = Number(this.profile.height);
      const currentWeight = Number(this.profile.currentWeight);
      const targetWeight = Number(this.profile.targetWeight);

      if (isNaN(height) || height < 120 || height > 230) {
        this.errorMsg = 'Výška musí byť medzi 120 a 230 cm.';
        return false;
      }

      if (isNaN(currentWeight) || currentWeight < 30 || currentWeight > 300) {
        this.errorMsg = 'Aktuálna váha musí byť medzi 30 a 300 kg.';
        return false;
      }

      if (isNaN(targetWeight) || targetWeight < 30 || targetWeight > 300) {
        this.errorMsg = 'Cieľová váha musí byť medzi 30 a 300 kg.';
        return false;
      }

      if (Math.abs(currentWeight - targetWeight) > 100) {
        this.errorMsg = 'Rozdiel medzi aktuálnou a cieľovou váhou je príliš veľký.';
        return false;
      }
    }

    if (this.currentStep === 3) {

      if (!this.profile.fitnessGoal || !this.profile.activityLevel) {
        this.errorMsg = 'Vyber cieľ a úroveň aktivity.';
        return false;
      }

      if (!this.gdprConsent) {
        this.errorMsg = 'Musíte súhlasiť so spracovaním osobných údajov.';
        return false;
      }
    }

    return true;
  }

  // =========================
  // BMI
  // =========================

  calculateBMI(): string {
    const height = Number(this.profile.height);
    const weight = Number(this.profile.currentWeight);

    if (!isNaN(height) && !isNaN(weight) && height > 0) {
      const h = height / 100;
      return (weight / (h * h)).toFixed(1);
    }

    return '--';
  }

  // =========================
  // REGISTER
  // =========================

  register(): void {

    this.errorMsg = '';

    if (!this.validateCurrentStep()) {
      return;
    }

    this.isLoading = true;

    this.auth.checkEmailExists(this.email).subscribe({
      next: (exists) => {

        if (exists) {
          this.isLoading = false;
          this.errorMsg = 'Tento e-mail už je registrovaný.';
          return;
        }

        this.performRegistration();
      },
      error: () => {
        this.performRegistration();
      }
    });
  }

  private performRegistration(): void {

    this.auth.register(this.email, this.password).subscribe({

      next: user => {

        const userProfile: UserProfile = {
          userId: user.uid,
          email: this.email.toLowerCase(),

          firstName: this.profile.firstName || '',
          lastName: this.profile.lastName || '',
          age: Number(this.profile.age) || 0,
          gender: this.profile.gender || 'male',

          height: Number(this.profile.height) || 0,
          currentWeight: Number(this.profile.currentWeight) || 0,
          targetWeight: Number(this.profile.targetWeight) || 0,

          fitnessGoal: this.profile.fitnessGoal || 'maintain',
          activityLevel: this.profile.activityLevel || 'moderate',

          medicalConditions: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.userFitnessService.createUserProfile(userProfile).subscribe({

          next: () => {

            const actionCodeSettings: ActionCodeSettings = {
              url: 'https://fit-mind.sk/dashboard',
              handleCodeInApp: false
            };

            sendEmailVerification(user, actionCodeSettings);

            this.isLoading = false;
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
          this.errorMsg = 'Heslo je príliš slabé.';
        } else {
          this.errorMsg = 'Chyba pri registrácii.';
        }

      }

    });

  }

}
