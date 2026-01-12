/**
 * Onboarding Component - Multi-step formulár pre nastavenie profilu
 * Používa Angular Material Stepper
 */
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import {
  Gender,
  ActivityLevel,
  PrimaryGoal,
  DietType,
  ACTIVITY_LEVEL_LABELS,
  GOAL_LABELS,
  DIET_TYPE_LABELS,
  CreateUserProfileDto,
  UpdateGoalsDto,
  UpdatePreferencesDto
} from '../models/user.model';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './onboarding.html',
  styleUrls: ['./onboarding.scss']
})
export class OnboardingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Form groups pre každý krok
  personalInfoForm!: FormGroup;
  physicalParamsForm!: FormGroup;
  goalsForm!: FormGroup;
  activityLevelForm!: FormGroup;
  dietPreferencesForm!: FormGroup;

  // Loading state
  isLoading = false;
  isSaving = false;

  // Data pre dropdowns
  genders: Gender[] = ['male', 'female', 'other'];
  activityLevels = Object.entries(ACTIVITY_LEVEL_LABELS);
  goals = Object.entries(GOAL_LABELS);
  dietTypes = Object.entries(DIET_TYPE_LABELS);

  // Alergény a neobľúbené jedlá
  availableAllergies = [
    'Mliečne výrobky', 'Vajcia', 'Arašidy', 'Orechy', 'Ryby',
    'Morské plody', 'Sója', 'Pšenica (lepok)', 'Sezam'
  ];

  selectedAllergies: string[] = [];
  dislikedFoods: string[] = [];
  preferredCuisines: string[] = [];

  currentUserId: string = '';

  ngOnInit(): void {
    // Get current user
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
      } else {
        // Redirect to login if not authenticated
        this.router.navigate(['/login']);
      }
    });

    this.initializeForms();
  }

  /**
   * Inicializácia všetkých formulárov
   */
  private initializeForms(): void {
    // Krok 1: Osobné údaje
    this.personalInfoForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required]
    });

    // Krok 2: Fyzické parametre
    this.physicalParamsForm = this.fb.group({
      height: ['', [Validators.required, Validators.min(100), Validators.max(250)]],
      currentWeight: ['', [Validators.required, Validators.min(30), Validators.max(300)]]
    });

    // Krok 3: Ciele
    this.goalsForm = this.fb.group({
      targetWeight: ['', [Validators.required, Validators.min(30), Validators.max(300)]],
      primaryGoal: ['', Validators.required],
      targetDate: ['', Validators.required],
      weeklyGoal: [0.5, [Validators.required, Validators.min(-2), Validators.max(2)]]
    });

    // Krok 4: Úroveň aktivity
    this.activityLevelForm = this.fb.group({
      activityLevel: ['', Validators.required]
    });

    // Krok 5: Stravovanie
    this.dietPreferencesForm = this.fb.group({
      dietType: ['none', Validators.required]
    });
  }

  /**
   * Pridanie/odstránenie alergénu
   */
  toggleAllergy(allergy: string): void {
    const index = this.selectedAllergies.indexOf(allergy);
    if (index >= 0) {
      this.selectedAllergies.splice(index, 1);
    } else {
      this.selectedAllergies.push(allergy);
    }
  }

  /**
   * Pridanie neobľúbeného jedla
   */
  addDislikedFood(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && !this.dislikedFoods.includes(value)) {
      this.dislikedFoods.push(value);
      input.value = '';
    }
  }

  /**
   * Odstránenie neobľúbeného jedla
   */
  removeDislikedFood(food: string): void {
    const index = this.dislikedFoods.indexOf(food);
    if (index >= 0) {
      this.dislikedFoods.splice(index, 1);
    }
  }

  /**
   * Pridanie preferovanej kuchyne
   */
  addCuisine(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && !this.preferredCuisines.includes(value)) {
      this.preferredCuisines.push(value);
      input.value = '';
    }
  }

  /**
   * Odstránenie preferovanej kuchyne
   */
  removeCuisine(cuisine: string): void {
    const index = this.preferredCuisines.indexOf(cuisine);
    if (index >= 0) {
      this.preferredCuisines.splice(index, 1);
    }
  }

  /**
   * Výpočet BMI pre zobrazenie
   */
  calculateBMI(): number | null {
    const height = this.physicalParamsForm.get('height')?.value;
    const weight = this.physicalParamsForm.get('currentWeight')?.value;

    if (height && weight) {
      return this.userService.calculateBMI(weight, height);
    }
    return null;
  }

  /**
   * Výpočet odporúčaného weekly goal
   */
  calculateRecommendedWeeklyGoal(): void {
    const currentWeight = this.physicalParamsForm.get('currentWeight')?.value;
    const targetWeight = this.goalsForm.get('targetWeight')?.value;

    if (currentWeight && targetWeight) {
      const diff = targetWeight - currentWeight;
      // Odporúčané je 0.5-1kg týždenne
      const recommended = diff < 0 ? -0.5 : 0.5;
      this.goalsForm.patchValue({ weeklyGoal: recommended });
    }
  }

  /**
   * Finálne uloženie všetkých dát
   */
  async onComplete(): Promise<void> {
    if (!this.currentUserId) {
      this.showError('Používateľ nie je prihlásený');
      return;
    }

    // Validate all forms
    if (!this.personalInfoForm.valid || !this.physicalParamsForm.valid ||
        !this.goalsForm.valid || !this.activityLevelForm.valid ||
        !this.dietPreferencesForm.valid) {
      this.showError('Vyplňte všetky povinné polia');
      return;
    }

    this.isSaving = true;

    try {
      // 1. Create profile
      const profileDto: CreateUserProfileDto = {
        firstName: this.personalInfoForm.value.firstName,
        lastName: this.personalInfoForm.value.lastName,
        dateOfBirth: this.personalInfoForm.value.dateOfBirth.toISOString(),
        gender: this.personalInfoForm.value.gender,
        height: this.physicalParamsForm.value.height,
        currentWeight: this.physicalParamsForm.value.currentWeight,
        targetWeight: this.goalsForm.value.targetWeight,
        activityLevel: this.activityLevelForm.value.activityLevel
      };

      await this.userService.createProfile(this.currentUserId, profileDto).toPromise();

      // 2. Update goals
      const goalsDto: UpdateGoalsDto = {
        primary: this.goalsForm.value.primaryGoal,
        targetDate: this.goalsForm.value.targetDate.toISOString(),
        weeklyGoal: this.goalsForm.value.weeklyGoal
      };

      await this.userService.updateGoals(this.currentUserId, goalsDto).toPromise();

      // 3. Update preferences
      const preferencesDto: UpdatePreferencesDto = {
        allergies: this.selectedAllergies,
        dietType: this.dietPreferencesForm.value.dietType,
        dislikedFoods: this.dislikedFoods,
        preferredCuisines: this.preferredCuisines
      };

      await this.userService.updatePreferences(this.currentUserId, preferencesDto).toPromise();

      // Success!
      this.showSuccess('Profil úspešne vytvorený!');

      // Redirect to dashboard
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1500);

    } catch (error: any) {
      console.error('Error saving profile:', error);
      this.showError('Chyba pri ukladaní profilu: ' + (error.message || 'Neznáma chyba'));
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Helper funkcie pre snackbar
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Zavrieť', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Gender labels pre UI
   */
  getGenderLabel(gender: Gender): string {
    const labels = {
      male: 'Muž',
      female: 'Žena',
      other: 'Iné'
    };
    return labels[gender];
  }

  /**
   * Výpočet maximálneho dátumu (18 rokov späť)
   */
  get maxDate(): Date {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    return today;
  }

  /**
   * Výpočet minimálneho dátumu (100 rokov späť)
   */
  get minDate(): Date {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 100);
    return today;
  }
}
