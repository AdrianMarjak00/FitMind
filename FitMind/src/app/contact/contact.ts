// src/app/contact/contact.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

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
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class Contact {
  contactData = {
    name: '',
    email: '',
    message: ''
  };

  onSubmitContact() {
    alert('Vaša správa bola odoslaná. Ďakujeme!');
    this.contactData = { name: '', email: '', message: '' };
  }
}