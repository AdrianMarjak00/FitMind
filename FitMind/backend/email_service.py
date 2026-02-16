import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional


class EmailService:
    """
    Služba pre odosielanie emailov cez SMTP.
    Konfiguruje sa cez environment premenné:
    - SMTP_SERVER, SMTP_PORT
    - SMTP_USER, SMTP_PASS
    """
    _instance = None

    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASS", "")

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def is_configured(self) -> bool:
        """Skontroluje, či sú zadané prihlasovacie údaje pre SMTP."""
        return bool(self.smtp_user and self.smtp_pass)

    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Interná metóda na fyzické odoslanie emailu."""
        if not self.is_configured():
            print(f"[EMAIL] Not configured! To: {to_email}, Subject: {subject}")
            return False

        try:
            msg = MIMEMultipart()
            # Meno odosielateľa
            msg['From'] = f"FitMind <{self.smtp_user}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(html_content, 'html'))

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
            
            print(f"[EMAIL] Sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send email: {e}")
            return False

    def send_welcome_email(self, to_email: str, first_name: str) -> bool:
        """Odošle uvítací email novému používateľovi."""
        subject = f"Vitaj vo FitMind, {first_name}! 🚀"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #3ddc84;">Ahoj {first_name}!</h2>
            <p>Tešíme sa, že si sa pridal k <strong>FitMind</strong>. Tvoj osobný AI coach je pripravený ti pomôcť prekonať tvoje limity.</p>
            <p><strong>Čo môžeš robiť ako prvé?</strong></p>
            <ul>
                <li>Dokonči si nastavenia profilu v Dashboarde.</li>
                <li>Napíš svojmu AI trénerovi a požiadaj ho o analýzu tvojho dňa.</li>
                <li>Zapisuj si stravu a cvičenie jednoducho písaním správ.</li>
            </ul>
            <p>Tento email bol odoslaný automaticky pri registrácii do Fit-Mind.sk.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.8rem; color: #888;">Tím FitMind AI</p>
        </div>
        """
        if not self.is_configured():
             print(f"[EMAIL] Mock Welcome email -> {to_email} (User: {first_name})")
             return True
             
        return self._send_email(to_email, subject, html)

    def send_payment_success_email(self, to_email: str, first_name: str, plan_type: str, amount: float) -> bool:
        """Logovanie úspešnej platby (Stripe posiela potvrdenie automaticky)"""
        print(f"[EMAIL] Payment success -> {to_email} (plan: {plan_type}, amount: {amount}€)")
        return True

    def send_subscription_canceled_email(self, to_email: str, first_name: str, plan_type: str, end_date: str) -> bool:
        """Logovanie zrušenia (Stripe posiela info automaticky)"""
        print(f"[EMAIL] Subscription canceled -> {to_email} (plan: {plan_type}, ends: {end_date})")
        return True
