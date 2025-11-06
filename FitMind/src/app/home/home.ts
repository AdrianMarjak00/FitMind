// src/app/home/home.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card'; 
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.html', // <-- OPRAVENÉ: Cesta k home.html je správna
  styleUrls: ['./home.scss'], // <-- OPRAVENÉ: Zmenené z './home.css' na './home.scss'
  standalone: true, 
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule, 
    MatIconModule, 
    RouterModule,
    RouterLink,
  ]
})
export class home implements OnInit {
  ngOnInit(): void {
    // throw new Error('Method not implemented.'); // <-- Odporúčam odstrániť toto vyvolanie chyby, ak tam nemá byť!
  } 
}