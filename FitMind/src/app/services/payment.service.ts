import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Vytvorí Stripe Checkout session a vráti URL pre presmerovanie.
   *
   * @param planType Typ plánu: 'free', 'basic', alebo 'pro'
   * @returns Observable s URL pre Stripe Checkout
   */
  createCheckoutSession(planType: string): Observable<CheckoutSessionResponse> {
    const currentUrl = window.location.origin;

    return this.http.post<CheckoutSessionResponse>(`${this.baseUrl}/payment/create-checkout`, {
      plan_type: planType,
      success_url: `${currentUrl}/payment-success`,
      cancel_url: `${currentUrl}/training`
    });
  }

  /**
   * Získa stav subscription používateľa.
   */
  getPaymentStatus(userId: string): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(`${this.baseUrl}/payment/status/${userId}`);
  }

  /**
   * Vytvorí URL pre Stripe Customer Portal (správa subscription).
   */
  getCustomerPortalUrl(): Observable<CustomerPortalResponse> {
    return this.http.post<CustomerPortalResponse>(`${this.baseUrl}/payment/customer-portal`, {});
  }

  /**
   * Skontroluje či má používateľ aktívnu subscription.
   */
  isSubscriptionActive(status: SubscriptionStatus): boolean {
    return status.status === 'active';
  }

  /**
   * Skontroluje či má používateľ platený plán (basic alebo pro).
   */
  hasPaidPlan(status: SubscriptionStatus): boolean {
    return (status.plan_type === 'basic' || status.plan_type === 'pro') && status.status === 'active';
  }

  /**
   * Vráti názov plánu pre zobrazenie.
   */
  getPlanDisplayName(planType: string): string {
    const names: Record<string, string> = {
      'free': 'Bezplatný',
      'basic': 'Štartovací plán',
      'pro': 'Progresívny Split'
    };
    return names[planType] || planType;
  }
}
