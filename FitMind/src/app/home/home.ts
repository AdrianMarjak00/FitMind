import { Component, OnInit, HostListener } from '@angular/core';
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

  // Zoznam obrázkov pre galériu
  images = [
    { url: '/assets/cvicenie.jpg', alt: 'Tréning v plnom prúde' },
    { url: '/assets/strava.jpg', alt: 'Zdravá a vyvážená strava' },
    { url: '/assets/komunita.jpg', alt: 'Naša FitMind komunita' },
    { url: '/assets/vysledky.jpg', alt: 'Reálne výsledky našich členov' }
  ];

  // Sledovanie aktuálne otvoreného obrázka (null znamená zavretú galériu)
  currentIndex: number | null = null;

  constructor() {}

  ngOnInit() {
    // Kontrola, či užívateľ už v minulosti súhlasil
    const consent = localStorage.getItem('cookiesAccepted');
    this.areCookiesAccepted = consent === 'true';
  }

  // Galéria: Otvorenie
  openGallery(index: number) {
    this.currentIndex = index;
    document.body.style.overflow = 'hidden'; // Zamedzí skrolovaniu stránky
  }

  // Galéria: Zatvorenie
  closeGallery() {
    this.currentIndex = null;
    document.body.style.overflow = 'auto';
  }

  // Galéria: Nasledujúci obrázok
  nextImage(event?: Event) {
    if (event) event.stopPropagation();
    if (this.currentIndex !== null) {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
    }
  }

  // Galéria: Predchádzajúci obrázok
  prevImage(event?: Event) {
    if (event) event.stopPropagation();
    if (this.currentIndex !== null) {
      this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    }
  }

  // Ovládanie klávesnicou
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.currentIndex !== null) {
      if (event.key === 'ArrowRight') this.nextImage();
      if (event.key === 'ArrowLeft') this.prevImage();
      if (event.key === 'Escape') this.closeGallery();
    }
  }

  acceptCookies() {
    // Trvalé uloženie súhlasu v prehliadači
    localStorage.setItem('cookiesAccepted', 'true');
    this.areCookiesAccepted = true;
  }
}
