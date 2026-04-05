import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "parul24128@iiitd.ac.in"
SMTP_PASSWORD = "wsvk bghd vgxp aihh"  # Use your Gmail App Password
SENDER_EMAIL = "parul24128@iiitd.ac.in"
RECIPIENT_EMAIL = "parulahlawat192@gmail.com"  # Change to your test email

subject = "SMTP Test Email from FCS"
body = "This is a test email sent from a Python script to verify SMTP connectivity."

msg = MIMEMultipart()
msg["From"] = SENDER_EMAIL
msg["To"] = RECIPIENT_EMAIL
msg["Subject"] = subject
msg.attach(MIMEText(body, "plain"))

try:
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=20) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SENDER_EMAIL, RECIPIENT_EMAIL, msg.as_string())
    print("✅ Test email sent successfully!")
except Exception as e:
    print(f"❌ Failed to send test email: {e}")
