import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';

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
    RouterModule
  ]
})
export class RegisterComponent {
  email = '';
  password = '';

  register() {
    console.log('📝 Register attempt:', this.email, this.password);
    // Sem neskôr pridáš Firebase Auth registráciu
  }
}
