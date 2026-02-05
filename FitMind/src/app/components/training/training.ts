import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { PaymentService, SubscriptionStatus } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './training.html',
  styleUrl: './training.scss',
})
export class Training implements OnInit, OnDestroy {
  isLoading = false;
  loadingPlan: string | null = null;
  currentSubscription: SubscriptionStatus | null = null;
  userId: string | null = null;
  isLoggedIn = false;

  private authSubscription?: Subscription;

  constructor(
    private paymentService: PaymentService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.authSubscription = this.authService.getCurrentUser().subscribe(user => {
      this.isLoggedIn = !!user;
      this.userId = user?.uid || null;

      if (this.userId) {
        this.loadSubscriptionStatus();
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  loadSubscriptionStatus(): void {
    if (!this.userId) return;

    this.paymentService.getPaymentStatus(this.userId).subscribe({
      next: (response) => {
        this.currentSubscription = response.subscription;
      },
      error: (err) => {
        console.error('Error loading subscription status:', err);
      }
    });
  }

  buyPlan(planType: string): void {
    if (!this.isLoggedIn) {
      alert('Pre výber plánu sa musíte prihlásiť.');
      this.router.navigate(['/login']);
      return;
    }

    if (planType === 'free') {
      // Free plán je predvolený, ak používateľ nemá žiadny iný
      return;
    }

    // Ak má používateľ už aktívnu subscription pre daný plán, presmeruj na customer portal
    const isSubscriptionPlan = planType === 'basic' || planType === 'pro';
    if (this.currentSubscription?.status === 'active' &&
      this.currentSubscription?.plan_type === planType &&
      isSubscriptionPlan) {
      this.openCustomerPortal();
      return;
    }

    this.isLoading = true;
    this.loadingPlan = planType;

    this.paymentService.createCheckoutSession(planType).subscribe({
      next: (response) => {
        window.location.href = response.url;
      },
      error: (err) => {
        this.isLoading = false;
        this.loadingPlan = null;
        console.error('Error creating checkout session:', err);

        if (err.status === 503) {
          alert('Systém nie je momentálne dostupný. Skúste to neskôr.');
        } else {
          alert('Nepodarilo sa spustiť proces. Skúste to znova.');
        }
      }
    });
  }

  openCustomerPortal(): void {
    this.isLoading = true;

    this.paymentService.getCustomerPortalUrl().subscribe({
      next: (response) => {
        window.location.href = response.url;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error opening customer portal:', err);
        alert('Nepodarilo sa otvoriť správu predplatného. Pravdepodobne ešte nemáte vytvorený zákaznícky profil v Stripe.');
      }
    });
  }

  hasPlan(planType: string): boolean {
    if (!this.currentSubscription) return false;

    // Ak ide o free, zobraziť ako aktívne len ak nemá iný platený plán
    if (planType === 'free') {
      const hasPaidPlan = Object.values(this.currentSubscription.active_plans || {}).some(p => p.status === 'active');
      return !hasPaidPlan;
    }

    // Skontroluj konkrétny plán v active_plans
    const plan = this.currentSubscription.active_plans?.[planType];
    return plan?.status === 'active';
  }

  getButtonText(planType: string): string {
    if (this.hasPlan(planType)) {
      if (planType === 'basic' || planType === 'pro') {
        return 'SPRAVOVAŤ PREDPLATNÉ';
      }
      return 'AKTÍVNE';
    }
    return planType === 'free' ? 'ZVOLIŤ FREE' : 'KÚPIŤ PLÁN';
  }

  isButtonDisabled(planType: string): boolean {
    if (this.isLoading && this.loadingPlan !== planType) return true;

    if (this.hasPlan(planType)) {
      if (planType === 'basic' || planType === 'pro') return false;
      return true;
    }

    return false;
  }
}
