import { Component, OnInit, AfterViewInit, ElementRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule]
})
export class HomeComponent implements OnInit, AfterViewInit {

  areCookiesAccepted: boolean = false;
  showCookieDetails: boolean = false;
  currentIndex: number | null = null;
  isLoggedIn: boolean = false;

  images = [
    { url: '/assets/cvicenie.jpg', alt: 'Tréning v plnom prúde' },
    { url: '/assets/strava.jpg', alt: 'Zdravá a vyvážená strava' },
    { url: '/assets/komunita.jpg', alt: 'Naša FitMind komunita' },
    { url: '/assets/vysledky.jpg', alt: 'Reálne výsledky našich členov' }
  ];

  constructor(
    private el: ElementRef,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(user => {
      this.isLoggedIn = !!user;
    });

    if (isPlatformBrowser(this.platformId)) {

      document.body.style.overflow = 'auto';

      // Kontrola, či už banner bol počas tejto návštevy zobrazený
      const bannerShown = sessionStorage.getItem('cookieBannerShown');

      if (!bannerShown) {
        // Prvá návšteva po otvorení webu
        this.areCookiesAccepted = false;
        sessionStorage.setItem('cookieBannerShown', 'true');
      } else {
        // Už bol zobrazený
        this.areCookiesAccepted = true;
      }
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

  toggleCookieDetails(): void {
    this.showCookieDetails = !this.showCookieDetails;
  }

  acceptCookies(): void {
    this.areCookiesAccepted = true;
  }

  rejectCookies(): void {
    this.areCookiesAccepted = true;
  }

  openGallery(index: number) {
    this.currentIndex = index;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeGallery() {
    this.currentIndex = null;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'auto';
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
}
