import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ]
})
export class HomeComponent {
  /** Aktuálny rok pre footer */
  currentYear: number = new Date().getFullYear();

  constructor() {}

  // ⬇️ pripravené na budúce rozšírenia
  // napr. scroll animácie, A/B testy, feature flags, analytics…
}
