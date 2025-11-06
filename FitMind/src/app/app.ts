// src/app/app.ts
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './Shared/header/header'; // <-- PRIDANÝ IMPORT

@Component({
  selector: 'app-root',
  standalone: true, // <-- Ak je standalone komponent, mal by to mať
  imports: [RouterOutlet, Header], // <-- PRIDANÝ IMPORT KOMPONENTU Header
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('FitMind');
}