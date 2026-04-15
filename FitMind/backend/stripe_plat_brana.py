"""
Stripe Payment Service pre FitMind
"""

import stripe
import os
from typing import Optional, Dict, Any


class StripeService:
    """
    Singleton service pre Stripe API operácie.
    """

    # Mapovanie plánov na Stripe Price IDs
    PRICE_IDS = {
        "basic": os.getenv("STRIPE_PRICE_BASIC", ""),
    }

    # Platené plány (subscriptions)
    SUBSCRIPTION_PLANS = ["basic"]

    def __init__(self):
        """Inicializuje Stripe s API kľúčom z environment variables."""
        self._api_key = os.getenv("STRIPE_SECRET_KEY")
        self._webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

        if self._api_key:
            stripe.api_key = self._api_key
        else:
            print("[STRIPE] WARNING: STRIPE_SECRET_KEY not set!")

    def is_configured(self) -> bool:
        """Skontroluje či je Stripe správne nakonfigurovaný."""
        return bool(self._api_key)

    def create_checkout_session(
        self,
        user_id: str,
        user_email: str,
        plan_type: str,
        success_url: str,
        cancel_url: str
    ) -> Optional[Dict[str, Any]]:
        """
        Vytvorí Stripe Checkout Session pre platbu.
        """
        if not self.is_configured():
            print("[STRIPE] Error: Service not configured")
            return None

        if plan_type == "free":
            print("[STRIPE] Free plan requested, skipping Stripe")
            return None

        # Dynamické načítanie ID z env (aby sme nemuseli reštartovať server)
        price_id = os.getenv(f"STRIPE_PRICE_{plan_type.upper()}", "")

        try:
            if not price_id or "_placeholder" in price_id:
                print(f"[STRIPE] Error: Valid Price ID missing for plan {plan_type}")
                return None

            # Získaj detaily o cene zo Stripe, aby sme vedeli či je to subscription
            price_details = stripe.Price.retrieve(price_id)
            is_recurring = price_details.get("type") == "recurring"

            session_params = {
                "payment_method_types": ["card"],
                "line_items": [{
                    "price": price_id,
                    "quantity": 1
                }],
                "mode": "subscription" if is_recurring else "payment",
                "success_url": success_url + "?session_id={CHECKOUT_SESSION_ID}",
                "cancel_url": cancel_url,
                "customer_email": user_email,
                "metadata": {
                    "user_id": user_id,
                    "plan_type": plan_type
                },
                "allow_promotion_codes": True,
                "payment_method_options": {
                    "card": {
                        "request_three_d_secure": "automatic"
                    }
                }
            }

            if is_recurring:
                session_params["subscription_data"] = {
                    "metadata": {
                        "user_id": user_id,
                        "plan_type": plan_type
                    }
                }

            session = stripe.checkout.Session.create(**session_params)
            print(f"[STRIPE] Checkout session created: {session.id}")

            return {
                "session_id": session.id,
                "url": session.url
            }

        except stripe.error.StripeError as e:
            print(f"[STRIPE] Stripe error: {str(e)}")
            return None
        except Exception as e:
            print(f"[STRIPE] Unexpected error: {str(e)}")
            return None

    def verify_webhook_signature(self, payload: bytes, sig_header: str) -> Optional[Dict[str, Any]]:
        if not self._webhook_secret:
            return None
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, self._webhook_secret)
            return event
        except Exception as e:
            print(f"[STRIPE] Webhook error: {e}")
            return None

    def get_plan_details(self, plan_type: str) -> Optional[Dict[str, Any]]:
        """Vráti detaily o pláne priamo v kóde."""
        plans = {
            "free": {
                "name": "Zdarma",
                "price": 0,
                "currency": "EUR",
                "interval": None,
                "description": "Základný prístup k chatu"
            },
            "basic": {
                "name": "Štartovací plán",
                "price": 2.99,
                "currency": "EUR",
                "interval": "month",
                "description": "Pravidelný coaching za nízku cenu"
            },
        }
        return plans.get(plan_type)

    def create_customer_portal_session(self, customer_id: str, return_url: str = "https://fit-mind.sk/training") -> Optional[Dict[str, Any]]:
        """
        Vytvorí Stripe Customer Portal session pre správu subscription.

        Args:
            customer_id: Stripe customer ID
            return_url: URL kam sa presmeruje po opustení portálu

        Returns:
            Dict s URL pre portal alebo None pri chybe
        """
        if not self.is_configured():
            return None

        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )
            return {"url": session.url}
        except stripe.error.StripeError as e:
            print(f"[STRIPE] Portal session error: {str(e)}")
            return None
        except Exception as e:
            print(f"[STRIPE] Unexpected portal error: {str(e)}")
            return None
    def cancel_subscription(self, subscription_id: str) -> bool:
        """
        Zruší aktívne predplatné v Stripe.
        """
        if not self.is_configured() or not subscription_id:
            return False

        try:
            # Okamžité zrušenie
            stripe.Subscription.delete(subscription_id)
            print(f"[STRIPE] Subscription {subscription_id} canceled.")
            return True
        except stripe.error.StripeError as e:
            print(f"[STRIPE] Error canceling subscription: {str(e)}")
            return False
        except Exception as e:
            print(f"[STRIPE] Unexpected error: {str(e)}")
            return False
