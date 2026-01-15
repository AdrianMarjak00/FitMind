import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatButtonModule
  ],
  templateUrl: './training.html',
  styleUrl: './training.scss',
})
export class Training {

  buyPlan(planType: string) {
    console.log(`Inicializujem nákup pre plán: ${planType}`);
    // Tu môžeš pridať navigáciu na platobnú bránu alebo Stripe
    // Príklad: window.location.href = 'https://checkout.stripe.com/...';
    alert(`Vybral si si ${planType.toUpperCase()} plán. Systém ťa teraz presmeruje na platobnú bránu.`);
  }
}