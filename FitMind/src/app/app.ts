// src/app/app.ts
import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './Shared/header/header';
import { Footer } from "./Shared/footer/footer";
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('FitMind');
  private router = inject(Router);

  ngOnInit() {
    // Toto poistí scroll nahor pri každej úspešnej zmene URL
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd)
    ).subscribe(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // 'instant' zabezpečí okamžitý skok bez animácie
      });
    });
  }
}