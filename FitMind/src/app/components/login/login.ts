import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { User } from '@angular/fire/auth';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class LoginComponent {
  email = '';
  password = '';
  errorMsg = '';
  successMsg = '';
  isLoading = false;
  isResetMode = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  toggleResetMode(status: boolean): void {
    this.isResetMode = status;
    this.errorMsg = '';
    this.successMsg = '';
  }

  login(): void {
    this.errorMsg = '';
    this.isLoading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isLoading = false;
        this.errorMsg = 'Nesprávny e-mail alebo heslo.';
      }
    });
  }

  resetPassword(): void {
    if (!this.email) {
      this.errorMsg = 'Zadajte e-mailovú adresu.';
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.auth.sendPasswordResetEmail(this.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMsg = 'E-mail na resetovanie hesla bol odoslaný.';
      },
      error: () => {
        this.isLoading = false;
        this.errorMsg = 'Chyba pri odosielaní. Skontrolujte e-mailovú adresu.';
      }
    });
  }

  loginWithGoogle(): void {
    this.errorMsg = '';
    this.isLoading = true;

    this.auth.loginWithGoogle().subscribe({
      next: (user) => this.handleSocialLogin(user),
      error: (err) => {
        this.isLoading = false;
        if (err.code === 'auth/popup-closed-by-user') {
          this.errorMsg = 'Prihlásenie bolo zrušené.';
        } else {
          this.errorMsg = 'Prihlásenie cez Google zlyhalo.';
        }
      }
    });
  }

  private handleSocialLogin(user: User): void {
    this.auth.checkUserHasProfile(user.uid).subscribe({
      next: (hasProfile) => {
        this.isLoading = false;
        if (hasProfile) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/complete-profile']);
        }
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/complete-profile']);
      }
    });
  }
}