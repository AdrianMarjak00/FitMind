import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Material importy
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '../../services/auth.service';
import { UserFitnessService } from '../../services/user-fitness.service';
import { PaymentService, SubscriptionStatus } from '../../services/payment.service';
import { UserProfile } from '../../models/user-profile.interface';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    MatTabsModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class SettingsComponent implements OnInit, OnDestroy {
  // Loading states
  isLoading = true;
  isSaving = false;
  isUploadingImage = false;

  // User data
  userId: string | null = null;
  userEmail: string = '';

  // Profile data
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

  profileImageUrl: string | null = null;

  // Subscription data
  subscription: SubscriptionStatus | null = null;

  private authSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private userFitnessService: UserFitnessService,
    private paymentService: PaymentService,
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.userEmail = user.email || '';
        this.loadUserProfile();
        this.loadSubscriptionStatus();
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  loadUserProfile(): void {
    if (!this.userId) return;

    this.isLoading = true;
    this.userFitnessService.getUserProfile(this.userId).subscribe({
      next: (profile) => {
        if (profile) {
          this.profile = {
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            age: profile.age || 25,
            gender: profile.gender || 'male',
            height: profile.height || 170,
            currentWeight: profile.currentWeight || 70,
            targetWeight: profile.targetWeight || 65,
            fitnessGoal: profile.fitnessGoal || 'maintain',
            activityLevel: profile.activityLevel || 'moderate'
          };
          this.profileImageUrl = (profile as any).profileImageUrl || null;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.isLoading = false;
        this.showMessage('Chyba pri načítaní profilu', true);
      }
    });
  }

  loadSubscriptionStatus(): void {
    if (!this.userId) return;

    this.paymentService.getPaymentStatus(this.userId).subscribe({
      next: (response) => {
        this.subscription = response.subscription;
      },
      error: (err) => {
        console.error('Error loading subscription:', err);
      }
    });
  }

  saveProfile(): void {
    if (!this.userId) return;

    this.isSaving = true;

    this.userFitnessService.updateProfile(this.userId, this.profile).subscribe({
      next: () => {
        this.isSaving = false;
        this.showMessage('Profil bol úspešne uložený!');
      },
      error: (err) => {
        console.error('Error saving profile:', err);
        this.isSaving = false;
        this.showMessage('Chyba pri ukladaní profilu', true);
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validácia veľkosti (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.showMessage('Obrázok je príliš veľký (max 5MB)', true);
      return;
    }

    // Validácia typu
    if (!file.type.startsWith('image/')) {
      this.showMessage('Vyberte platný obrázok', true);
      return;
    }

    this.uploadImage(file);
  }

  uploadImage(file: File): void {
    this.isUploadingImage = true;

    // Konverzia na base64 a uloženie do Firebase
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;

      // Komprimácia obrázka cez canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        this.profileImageUrl = compressedBase64;

        // Ulož do Firebase
        if (this.userId) {
          this.userFitnessService.updateProfile(this.userId, {
            profileImageUrl: compressedBase64
          } as any).subscribe({
            next: () => {
              this.isUploadingImage = false;
              this.showMessage('Profilový obrázok bol aktualizovaný!');
            },
            error: () => {
              this.isUploadingImage = false;
              this.showMessage('Chyba pri nahrávaní obrázka', true);
            }
          });
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  }

  removeProfileImage(): void {
    if (!this.userId) return;

    this.profileImageUrl = null;
    this.userFitnessService.updateProfile(this.userId, {
      profileImageUrl: null
    } as any).subscribe({
      next: () => {
        this.showMessage('Profilový obrázok bol odstránený');
      },
      error: () => {
        this.showMessage('Chyba pri odstraňovaní obrázka', true);
      }
    });
  }

  manageSubscription(): void {
    this.paymentService.getCustomerPortalUrl().subscribe({
      next: (response) => {
        window.location.href = response.url;
      },
      error: (err) => {
        console.error('Error opening portal:', err);
        if (err.status === 404) {
          this.showMessage('Najprv si aktivujte predplatné', true);
          this.router.navigate(['/training']);
        } else {
          this.showMessage('Chyba pri otváraní správy predplatného', true);
        }
      }
    });
  }

  upgradePlan(): void {
    this.router.navigate(['/training']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Logout error:', err);
      }
    });
  }

  // Helpers
  getPlanName(): string {
    if (!this.subscription || this.subscription.status !== 'active') {
      return 'Bezplatný';
    }
    const names: Record<string, string> = {
      'free': 'Bezplatný',
      'basic': 'Štartovací plán',
      'pro': 'Progresívny Split'
    };
    return names[this.subscription.plan_type] || 'Bezplatný';
  }

  isPaidPlan(): boolean {
    return this.subscription?.status === 'active' &&
           (this.subscription?.plan_type === 'basic' || this.subscription?.plan_type === 'pro');
  }

  calculateBMI(): string {
    if (this.profile.height && this.profile.currentWeight) {
      const h = this.profile.height / 100;
      return (this.profile.currentWeight / (h * h)).toFixed(1);
    }
    return '--';
  }

  getBMICategory(): string {
    const bmi = parseFloat(this.calculateBMI());
    if (isNaN(bmi)) return '';
    if (bmi < 18.5) return 'Podváha';
    if (bmi < 25) return 'Normálna váha';
    if (bmi < 30) return 'Nadváha';
    return 'Obezita';
  }

  private showMessage(message: string, isError = false): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success']
    });
  }
}
