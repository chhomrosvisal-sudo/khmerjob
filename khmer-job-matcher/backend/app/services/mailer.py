import smtplib
import ssl
from email.message import EmailMessage
from app.core.config import get_settings


def configured():
    settings = get_settings()
    return bool(settings.smtp_host and settings.smtp_from)


def send_recovery(email, code):
    settings = get_settings()
    message = EmailMessage()
    message['From'] = settings.smtp_from
    message['To'] = email
    message['Subject'] = 'Your KhmerJob password recovery code'
    message.set_content(f'Your recovery code is {code}. It expires in 10 minutes and can be used once.\n'
                        'If you did not request this, ignore this email. Never share the code.')
    transport = smtplib.SMTP_SSL if settings.smtp_ssl else smtplib.SMTP
    kwargs = {'context': ssl.create_default_context()} if settings.smtp_ssl else {}
    with transport(settings.smtp_host, settings.smtp_port, timeout=5, **kwargs) as smtp:
        if settings.smtp_starttls and not settings.smtp_ssl:
            smtp.starttls(context=ssl.create_default_context())
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password.get_secret_value())
        smtp.send_message(message)
