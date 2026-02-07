# Email Service - Logovanie emailových udalostí
# Firebase sa stará o verifikačné emaily, Stripe o platobné emaily
# Tento súbor len loguje udalosti pre debugging

from typing import Optional


class EmailService:
    """
    Jednoduchá služba pre logovanie emailových udalostí.

    Skutočné emaily posielajú:
    - Firebase Auth: verifikačný email pri registrácii (sendEmailVerification)
    - Stripe: emaily o platbách (treba zapnúť v Stripe dashboard > Settings > Emails)
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            print("[INFO] Email service inicializovaný (Firebase + Stripe mode)")
        return cls._instance

    def is_configured(self) -> bool:
        """Vždy vráti True - emaily riešia Firebase a Stripe"""
        return True

    # === WELCOME EMAIL ===

    def send_welcome_email(self, to_email: str, first_name: str) -> bool:
        """Zaloguje welcome email (skutočný email posiela Firebase)"""
        print(f"[EMAIL] Welcome email -> {to_email} (user: {first_name})")
        return True

    # === PLATOBNÉ EMAILY (Stripe ich posiela automaticky) ===

    def send_payment_success_email(self, to_email: str, first_name: str, plan_type: str, amount: float) -> bool:
        """Zaloguje payment success (Stripe posiela email automaticky)"""
        print(f"[EMAIL] Payment success -> {to_email} (plan: {plan_type}, amount: {amount}€)")
        return True

    def send_subscription_canceled_email(self, to_email: str, first_name: str, plan_type: str, end_date: str) -> bool:
        """Zaloguje subscription canceled (Stripe posiela email automaticky)"""
        print(f"[EMAIL] Subscription canceled -> {to_email} (plan: {plan_type}, ends: {end_date})")
        return True

    def send_subscription_renewed_email(self, to_email: str, first_name: str, plan_type: str, amount: float, next_billing_date: str) -> bool:
        """Zaloguje subscription renewed (Stripe posiela email automaticky)"""
        print(f"[EMAIL] Subscription renewed -> {to_email} (plan: {plan_type}, next: {next_billing_date})")
        return True
