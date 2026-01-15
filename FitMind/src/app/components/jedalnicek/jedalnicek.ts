import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importy pre Angular Material, ktoré opravia tvoje chyby v HTML
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-jedalnicek',
  standalone: true, // Predpokladám, že používaš moderný standalone komponent
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatButtonModule
  ],
  templateUrl: './jedalnicek.html',
  styleUrl: './jedalnicek.scss'
})
export class JedalnicekComponent {
  
  // Príklad signálu pre používateľa (ak by si ho potreboval v HTML)
  currentUser = signal<any>(null);

  constructor() {
    // Tu môžeš v budúcnosti načítavať dáta z backendu
  }

  // Príklad funkcie pre tlačidlo, ak by si ho neskôr pridal
  orderPlan(planName: string) {
    console.log(`Používateľ si vybral: ${planName}`);
  }
}