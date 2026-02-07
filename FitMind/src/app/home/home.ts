import { Component, OnInit, AfterViewInit, ElementRef } from '@angular/core';
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

  acceptCookies() {
    sessionStorage.setItem('cookiesAcceptedSession', 'true');
    this.areCookiesAccepted = true;
  }
}