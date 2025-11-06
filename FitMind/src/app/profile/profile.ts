// src/app/profile/profile.ts

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Pre prácu s formulárom (ngModel)

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Dôležité pre šablónové formuláre
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {

  // Premenná, ktorá určuje, či sa zobrazuje prihlásenie (true) alebo registrácia (false)
  isLoginMode = signal(true); 

  // Dáta formulára pre prihlásenie
  loginData = {
    email: '',
    password: ''
  };

  // Dáta formulára pre registráciu
  registerData = {
    email: '',
    password: '',
    confirmPassword: ''
  };

  ngOnInit(): void {
    // Tu môžeš napr. skontrolovať, či je používateľ už prihlásený
  }

  // Prepína medzi prihlásením a registráciou
  onSwitchMode() {
    this.isLoginMode.update(current => !current);
  }

  // Spracovanie prihlásenia
  onSubmitLogin() {
    console.log('Prihlasujem používateľa:', this.loginData);
    // Tu by išla tvoja skutočná logika prihlásenia (volanie API)
  }

  // Spracovanie registrácie
  onSubmitRegister() {
    console.log('Registrujem nového používateľa:', this.registerData);
    // Tu by išla tvoja skutočná logika registrácie (volanie API)
  }
}