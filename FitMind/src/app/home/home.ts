import { Component, OnInit, AfterViewInit, ElementRef, HostListener } from '@angular/core';
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
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatIconModule]
})
export class HomeComponent implements OnInit, AfterViewInit {
  currentYear: number = new Date().getFullYear();
  areCookiesAccepted: boolean = false;

  // Zoznam obrázkov pre galériu
  images = [
    { url: '/assets/cvicenie.jpg', alt: 'Tréning v plnom prúde' },
    { url: '/assets/strava.jpg', alt: 'Zdravá a vyvážená strava' },
    { url: '/assets/komunita.jpg', alt: 'Naša FitMind komunita' },
    { url: '/assets/vysledky.jpg', alt: 'Reálne výsledky našich členov' }
  ];

  // Sledovanie aktuálne otvoreného obrázka (null znamená zavretú galériu)
  currentIndex: number | null = null;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    const consent = sessionStorage.getItem('cookiesAcceptedSession');
    this.areCookiesAccepted = (consent === 'true');
  }

  ngAfterViewInit() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    const elements = this.el.nativeElement.querySelectorAll('.scroll-reveal');
    elements.forEach((el: HTMLElement) => observer.observe(el));
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
    sessionStorage.setItem('cookiesAcceptedSession', 'true');
    this.areCookiesAccepted = true;
  }
}