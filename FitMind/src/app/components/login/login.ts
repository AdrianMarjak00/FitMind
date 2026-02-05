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
  isLoading = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

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

  loginWithApple(): void {
    this.errorMsg = '';
    this.isLoading = true;

    this.auth.loginWithApple().subscribe({
      next: (user) => this.handleSocialLogin(user),
      error: (err) => {
        this.isLoading = false;
        if (err.code === 'auth/popup-closed-by-user') {
          this.errorMsg = 'Prihlásenie bolo zrušené.';
        } else {
          this.errorMsg = 'Prihlásenie cez Apple zlyhalo.';
        }
      }
    });
  }

  private handleSocialLogin(user: User): void {
    // Skontroluj či používateľ má profil
    this.auth.checkUserHasProfile(user.uid).subscribe({
      next: (hasProfile) => {
        this.isLoading = false;
        if (hasProfile) {
          this.router.navigate(['/dashboard']);
        } else {
          // Nový social login používateľ - presmeruj na dokončenie profilu
          this.router.navigate(['/complete-profile']);
        }
      },
      error: () => {
        this.isLoading = false;
        // V prípade chyby predpokladaj že nemá profil
        this.router.navigate(['/complete-profile']);
      }
    });
  }
}
