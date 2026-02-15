import { Component, OnInit, AfterViewInit, ElementRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule]
})
export class HomeComponent implements OnInit, AfterViewInit {
  areCookiesAccepted: boolean = false;
  currentIndex: number | null = null;
  images = [
    { url: '/assets/cvicenie.jpg', alt: 'Tréning v plnom prúde' },
    { url: '/assets/strava.jpg', alt: 'Zdravá a vyvážená strava' },
    { url: '/assets/komunita.jpg', alt: 'Naša FitMind komunita' },
    { url: '/assets/vysledky.jpg', alt: 'Reálne výsledky našich členov' }
  ];

  constructor(
    private el: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // RESET SCROLLU pri načítaní (ochrana proti zaseknutiu z galérie)
      document.body.style.overflow = 'auto';
      
      const consent = sessionStorage.getItem('cookiesAcceptedSession');
      this.areCookiesAccepted = (consent === 'true');
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
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
  }

  openGallery(index: number) {
    this.currentIndex = index;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden'; // Zamkne scroll len počas otvorenej galérie
    }
  }

  closeGallery() {
    this.currentIndex = null;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'auto'; // Vráti scroll späť
    }
  }

  nextImage(event?: Event) {
    if (event) event.stopPropagation();
    if (this.currentIndex !== null) {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
    }
  }

  prevImage(event?: Event) {
    if (event) event.stopPropagation();
    if (this.currentIndex !== null) {
      this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    }
  }

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