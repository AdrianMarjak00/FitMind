import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { HttpClient, HttpClientModule } from '@angular/common/http';

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
  private http = inject(HttpClient);

  contactData = {
    name: '',
    email: '',
    message: ''
  };

  isSubmitted = false;
  isLoading = false;

  onSubmitContact() {
    this.isLoading = true;
    // SEM VLOŽ SVOJE FORMSPREE ID
    const formspreeUrl = 'https://formspree.io/f/xwvnoazj'; 

    this.http.post(formspreeUrl, this.contactData).subscribe({
      next: () => {
        this.isSubmitted = true;
        this.isLoading = false;
        this.contactData = { name: '', email: '', message: '' };
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Chyba pri odosielaní:', err);
        alert('Ups! Niečo sa nepodarilo. Skontrolujte pripojenie alebo Formspree ID.');
      }
    });
  }
}