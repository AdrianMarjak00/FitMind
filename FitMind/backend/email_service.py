import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional


class EmailService:
    """Singleton service pre odosielanie emailov cez SMTP."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port   = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user   = os.getenv("SMTP_USER", "")
        self.smtp_pass   = os.getenv("SMTP_PASS", "")

    def is_configured(self) -> bool:
        return bool(self.smtp_user and self.smtp_pass)

    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        if not self.is_configured():
            print(f"[EMAIL] Not configured! To: {to_email}, Subject: {subject}")
            return False

        try:
            msg = MIMEMultipart()
            msg['From']    = f"FitMind <{self.smtp_user}>"
            msg['To']      = to_email
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
        if not self.is_configured():
            print(f"[EMAIL] Mock Welcome email -> {to_email} (User: {first_name})")
            return True

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
        return self._send_email(to_email, subject, html)

    def send_payment_success_email(self, to_email: str, first_name: str, plan_type: str, amount: float) -> bool:
        subject = f"Platba prijatá - Vitaj v {plan_type.upper()} pláne! 💎"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #1a1a1a; border-radius: 10px; background-color: #0b0b0b; color: #fff;">
            <h2 style="color: #3ddc84; text-align: center;">Platba úspešná!</h2>
            <p>Ahoj {first_name},</p>
            <p>Tvoja platba vo výške <strong>{amount:.2f}€</strong> bola úspešne spracovaná. Tvoj účet bol aktualizovaný na plán <strong>{plan_type.upper()}</strong>.</p>
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Detaily predplatného:</strong></p>
                <p style="margin: 5px 0;">Plán: {plan_type.capitalize()}</p>
                <p style="margin: 5px 0;">Stav: Aktívny</p>
            </div>
            <p>Teraz máš odomknuté všetky prémiové funkcie vrátane neobmedzeného AI trénera a exportu dát.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://fit-mind.sk/dashboard" style="background-color: #3ddc84; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">VSTÚPIŤ DO DASHBOARDU</a>
            </div>
            <p style="font-size: 0.8rem; color: #888;">Tento email potvrdzuje aktiváciu tvojho predplatného vo FitMind AI.</p>
        </div>
        """
        return self._send_email(to_email, subject, html)

    def send_subscription_renewed_email(self, to_email: str, first_name: str, plan_type: str, amount: float, next_date: str) -> bool:
        subject = "Tvoje predplatné FitMind bolo obnovené 🔄"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #3ddc84;">Ahoj {first_name},</h2>
            <p>Tvoje predplatné v pláne <strong>{plan_type.upper()}</strong> bolo úspešne obnovené na ďalšie obdobie.</p>
            <p>Suma <strong>{amount:.2f}€</strong> bola zaplatená. Nasledujúce obnovenie prebehne: <strong>{next_date}</strong>.</p>
            <p>Ďakujeme, že s nami pokračuješ v budovaní svojej lepšej verzie!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.8rem; color: #888;">Tím FitMind AI</p>
        </div>
        """
        return self._send_email(to_email, subject, html)

    def send_subscription_canceled_email(self, to_email: str, first_name: str, plan_type: str, end_date: str) -> bool:
        subject = "Tvoje predplatné FitMind bolo zrušené ☹️"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #666;">Ahoj {first_name},</h2>
            <p>Tvoje predplatné <strong>{plan_type.upper()}</strong> bolo zrušené a nebude ďalej obnovované.</p>
            <p>Tvoje prémiové funkcie zostanú aktívne do konca tvojho predplateného obdobia, čo je: <strong>{end_date}</strong>.</p>
            <p>Mrzí nás, že odchádzaš. Ak by si si to rozmyslel, kedykoľvek sa môžeš vrátiť.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.8rem; color: #888;">Tím FitMind AI</p>
        </div>
        """
        return self._send_email(to_email, subject, html)
