import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { HttpClient, HttpClientModule, HttpBackend, HttpHeaders } from '@angular/common/http';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class Contact {
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
    // Vytvorenie klienta, ktorý obchádza interceptory (napr. pre auth tokeny)
    this.http = new HttpClient(this.httpBackend);
  }

  onSubmitContact() {
    this.isLoading = true;
    
    // Tvoje Formspree ID
    const formspreeUrl = 'https://formspree.io/f/xwvnoazj'; 

    const headers = new HttpHeaders({ 'Accept': 'application/json' });

    this.http.post(formspreeUrl, this.contactData, { headers }).subscribe({
      next: (response) => {
        this.isSubmitted = true;
        this.isLoading = false;
        // Reset dát
        this.contactData = { name: '', email: '', message: '' };
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Chyba pri odosielaní:', err);
        alert('Ups! Správu sa nepodarilo odoslať. Skontrolujte prosím internetové pripojenie.');
      }
    });
  }
}