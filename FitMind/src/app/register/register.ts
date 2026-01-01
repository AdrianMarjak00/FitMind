import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

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
    RouterModule,
  ]
})
export class RegisterComponent {
  email = '';
  password = '';
  weight: number | null = null;
  goal = '';
  frequency = '';
  errorMsg = '';

  constructor(private auth: AuthService, private router: Router) {}

  register() {
    this.errorMsg = '';

    const userData = {
      weight: this.weight,
      goal: this.goal,
      frequency: this.frequency,
    };

    this.auth.register(this.email, this.password).subscribe({
      next: (user: any) => {
        // After successful Firebase Auth registration, save extra data
        if (user && user.uid) {
          this.auth.saveUserProfileData(user.uid, userData).subscribe({
            next: () => {
              this.router.navigate(['/login']);
            },
            error: (dbErr: any) => {
              this.errorMsg = 'Registration successful, but failed to save profile data.';
            }
          });
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (authErr: any) => {
        this.errorMsg = 'Registration failed. Please check your details.';
      }
    });
  }
}