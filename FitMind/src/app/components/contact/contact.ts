import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { HttpClient, HttpClientModule, HttpBackend } from '@angular/common/http'; // Pridaný HttpBackend

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class Contact {
  // Injektujeme HttpBackend, aby sme vytvorili "čistého" klienta bez interceptorov
  private httpBackend = inject(HttpBackend);
  private http: HttpClient;

  contactData = {
    name: '',
    email: '',
    message: ''
  };

  isSubmitted = false;
  isLoading = false;

  constructor() {
    // Toto vytvorí HttpClient, ktorý ignoruje tvoj authInterceptor
    this.http = new HttpClient(this.httpBackend);
  }

  onSubmitContact() {
    this.isLoading = true;
    
    // Tvoje Formspree ID som nechal v URL
    const formspreeUrl = 'https://formspree.io/f/xwvnoazj'; 

    this.http.post(formspreeUrl, this.contactData).subscribe({
      next: () => {
        this.isSubmitted = true;
        this.isLoading = false;
        // Resetujeme formulár
        this.contactData = { name: '', email: '', message: '' };
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Chyba pri odosielaní:', err);
        alert('Ups! Niečo sa nepodarilo. Skúste to znova alebo skontrolujte konzolu.');
      }
    });
  }
}