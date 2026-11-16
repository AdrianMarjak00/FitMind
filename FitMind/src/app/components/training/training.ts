import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { PaymentService, SubscriptionStatus } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { AiService } from '../../services/ai.service';
import { CoachContext, EMPTY_ENTRIES } from '../../ai/context';
import { WorkoutPlan, buildWorkoutPlan } from '../../ai/planner';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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

  /** Pri vypnutých platbách stránka ukazuje osobný tréningový plán. */
  readonly paymentsEnabled: boolean;
  plan: WorkoutPlan | null = null;
  planDays = 0;
  readonly dayOptions = [3, 4, 5];
  private context: CoachContext = { profile: null, entries: { ...EMPTY_ENTRIES }, now: new Date() };

  private authSubscription?: Subscription;

  constructor(
    private paymentService: PaymentService,
    private authService: AuthService,
    private aiService: AiService,
    private router: Router
  ) {
    this.paymentsEnabled = this.paymentService.enabled;
  }

  ngOnInit(): void {
    this.rebuildPlan();
    this.authSubscription = this.authService.getCurrentUser().subscribe(user => {
      this.isLoggedIn = !!user;
      this.userId = user?.uid || null;

      if (this.userId) {
        this.loadSubscriptionStatus();
        this.aiService.getCoachContext(this.userId).subscribe({
          next: ctx => { this.context = ctx; this.rebuildPlan(); },
          error: () => { /* ostane všeobecný plán */ }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  // === TRÉNINGOVÝ PLÁN ===

  rebuildPlan(days?: number): void {
    this.plan = buildWorkoutPlan(this.context, days);
    this.planDays = this.plan.daysPerWeek;
  }

  // === PLATBY (aktívne len pri paymentsEnabled) ===

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
      return;
    }

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
        alert('Nepodarilo sa spustiť proces. Skúste to znova.');
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
        alert('Nepodarilo sa otvoriť správu predplatného.');
      }
    });
  }

  hasPlan(planType: string): boolean {
    if (!this.currentSubscription) return false;

    if (planType === 'free') {
      const hasPaidPlan = Object.values(this.currentSubscription.active_plans || {}).some(p => p.status === 'active');
      return !hasPaidPlan;
    }

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
