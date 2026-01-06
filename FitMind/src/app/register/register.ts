import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserFitnessService } from '../services/user-fitness.service';
import { UserProfile } from '../models/user-profile.interface';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    RouterModule,
  ]
})
export class RegisterComponent {
  email = '';
  password = '';
  errorMsg = '';
  isLoading = false;
  currentStep = 1;

  // Fitness profil
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
  dietaryRestrictionsText = '';

  constructor(
    private auth: AuthService,
    private userFitnessService: UserFitnessService,
    private router: Router
  ) {}

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  calculateBMI(): string {
    if (this.profile.height && this.profile.currentWeight) {
      const heightInMeters = this.profile.height / 100;
      const bmi = this.profile.currentWeight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return '--';
  }

  register() {
    this.errorMsg = '';
    this.isLoading = true;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/23feebc4-0a35-455f-b624-bdaddd553ad3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register.ts:83',message:'Register started',data:{email:this.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3'})}).catch(()=>{});
    // #endregion

    // Vytvorenie Firebase auth účtu
    this.auth.register(this.email, this.password).subscribe({
      next: user => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/23feebc4-0a35-455f-b624-bdaddd553ad3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register.ts:87',message:'Auth user created',data:{uid:user.uid,email:user.email,emailVerified:user.emailVerified},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
        // #endregion

        // Príprava profilu
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
            ? this.medicalConditionsText.split(',').map(s => s.trim())
            : [],
          dietaryRestrictions: this.dietaryRestrictionsText
            ? this.dietaryRestrictionsText.split(',').map(s => s.trim())
            : [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/23feebc4-0a35-455f-b624-bdaddd553ad3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register.ts:111',message:'Profile prepared - before save',data:{userId:userProfile.userId,email:userProfile.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H4'})}).catch(()=>{});
        // #endregion

        // Uloženie profilu do Firestore
        this.userFitnessService.createUserProfile(userProfile).subscribe({
          next: () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/23feebc4-0a35-455f-b624-bdaddd553ad3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register.ts:118',message:'Profile saved successfully',data:{userId:userProfile.userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'ALL'})}).catch(()=>{});
            // #endregion
            this.isLoading = false;
            alert('✅ Účet bol úspešne vytvorený! Vitaj v FitMind.');
            this.router.navigate(['/dashboard']);
          },
          error: err => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/23feebc4-0a35-455f-b624-bdaddd553ad3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register.ts:126',message:'Profile save FAILED',data:{errorCode:err.code,errorMessage:err.message,userId:userProfile.userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3,H4'})}).catch(()=>{});
            // #endregion
            this.isLoading = false;
            this.errorMsg = 'Chyba pri ukladaní profilu.';
            console.error('Profile save error:', err);
          }
        });
      },
      error: err => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/23feebc4-0a35-455f-b624-bdaddd553ad3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register.ts:137',message:'Auth registration FAILED',data:{errorCode:err.code,errorMessage:err.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        this.isLoading = false;
        if (err.code === 'auth/email-already-in-use') {
          this.errorMsg = 'Tento e-mail už je registrovaný.';
        } else if (err.code === 'auth/weak-password') {
          this.errorMsg = 'Heslo musí mať aspoň 6 znakov.';
        } else {
          this.errorMsg = 'Chyba pri registrácii. Skontrolujte údaje.';
        }
      }
    });
  }
}
