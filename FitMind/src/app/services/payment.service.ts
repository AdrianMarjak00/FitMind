import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubscriptionStatus {
  plan_type: 'free' | 'basic' | 'pro';
  status: 'none' | 'active' | 'canceled' | 'past_due';
  stripe_customer_id?: string;
  subscription_id?: string;
  current_period_end?: Date;
  purchased_at?: Date;
  active_plans?: Record<string, {
    status: string;
    subscription_id?: string;
    current_period_end?: any;
    purchased_at?: any;
  }>;
}

export interface CheckoutSessionResponse {
  session_id: string;
  url: string;
}

export interface PaymentStatusResponse {
  user_id: string;
  subscription: SubscriptionStatus;
}

export interface CustomerPortalResponse {
  url: string;
}

/**
 * Platby cez Stripe. Momentálne sú vypnuté (environment.paymentsEnabled = false):
 * AI beží v zariadení používateľa a nič nestojí, takže všetko je odomknuté.
 * Kód ostáva pripravený – po zapnutí volá serverless API na paymentsApiUrl.
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  readonly enabled = environment.paymentsEnabled;
  private baseUrl = environment.paymentsApiUrl;

  constructor(private http: HttpClient) { }

  createCheckoutSession(planType: string): Observable<CheckoutSessionResponse> {
    if (!this.enabled) return throwError(() => new Error('Platby sú vypnuté'));
    const currentUrl = window.location.origin;
    return this.http.post<CheckoutSessionResponse>(`${this.baseUrl}/payment/create-checkout`, {
      plan_type: planType,
      success_url: `${currentUrl}/payment-success`,
      cancel_url: `${currentUrl}/training`
    });
  }

  getPaymentStatus(userId: string): Observable<PaymentStatusResponse> {
    if (!this.enabled) {
      return of({ user_id: userId, subscription: { plan_type: 'free', status: 'none' } });
    }
    return this.http.get<PaymentStatusResponse>(`${this.baseUrl}/payment/status/${userId}`);
  }

  getCustomerPortalUrl(): Observable<CustomerPortalResponse> {
    if (!this.enabled) return throwError(() => new Error('Platby sú vypnuté'));
    return this.http.post<CustomerPortalResponse>(`${this.baseUrl}/payment/customer-portal`, {});
  }

  isSubscriptionActive(status: SubscriptionStatus): boolean {
    return status.status === 'active';
  }

  /** Má používateľ prístup k plným funkciám? Pri vypnutých platbách vždy áno. */
  hasPaidPlan(status: SubscriptionStatus): boolean {
    if (!this.enabled) return true;
    return (status.plan_type === 'basic' || status.plan_type === 'pro') && status.status === 'active';
  }

  getPlanDisplayName(planType: string): string {
    const names: Record<string, string> = {
      'free': 'Bezplatný',
      'basic': 'Štartovací plán',
      'pro': 'Progresívny Split'
    };
    return names[planType] || planType;
  }
}
