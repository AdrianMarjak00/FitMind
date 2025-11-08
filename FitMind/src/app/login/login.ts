import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    RouterModule
  ]
})
export class LoginComponent {
  email = '';
  password = '';

  login() {
    console.log('🔐 Login attempt:', this.email, this.password);
    // Sem neskôr pridáš Firebase Auth login
  }
}
