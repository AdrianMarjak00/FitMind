import { Component, OnInit } from '@angular/core';
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
export class HomeComponent implements OnInit {
  currentYear: number = new Date().getFullYear();
  // Predvolene skryté, kým neoveríme stav v ngOnInit
  areCookiesAccepted: boolean = true; 

  constructor() {}

  ngOnInit() {
    // Kontrola, či užívateľ už v minulosti súhlasil
    const consent = localStorage.getItem('cookiesAccepted');
    this.areCookiesAccepted = consent === 'true';
  }

  acceptCookies() {
    // Trvalé uloženie súhlasu v prehliadači
    localStorage.setItem('cookiesAccepted', 'true');
    this.areCookiesAccepted = true;
  }
}