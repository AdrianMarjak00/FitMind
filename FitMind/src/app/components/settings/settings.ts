import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material importy
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
    MatIconModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class SettingsComponent {
  
  // Objekt používateľa s predvolenými hodnotami
  user = {
    displayName: '',
    weight: null,
    height: null,
    goal: 'balance'
  };

  constructor() {
    // Pri načítaní skúsime získať dáta z pamäte prehliadača
    const savedUser = localStorage.getItem('userSettings');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
    }
  }

  saveSettings() {
    // Uloženie do LocalStorage (pretrvá aj po refreshe)
    localStorage.setItem('userSettings', JSON.stringify(this.user));
    alert('Tvoje nastavenia boli úspešne uložené!');
  }
}