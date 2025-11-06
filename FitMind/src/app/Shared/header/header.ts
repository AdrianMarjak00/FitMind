// src/app/Shared/header/header.ts

import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button'; // Predpokladám, že je potrebné pre mat-button
import { MatIconModule } from '@angular/material/icon'; // <--- TOTO JE NOVÝ A KĽÚČOVÝ IMPORT!
import { RouterModule } from '@angular/router'; // Predpokladám, že je potrebné pre routerLink

@Component({
  selector: 'app-header',
  standalone: true, 
  imports: [
        MatToolbarModule,
        MatButtonModule, // Pridané pre tlačidlá v hlavičke
        MatIconModule,   // <--- OPRAVA PRE CHYBU 'mat-icon'
        RouterModule     // Pridané pre routerLink
    ], 
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {

}