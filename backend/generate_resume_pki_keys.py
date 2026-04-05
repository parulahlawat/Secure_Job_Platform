from app.core.pki import pki_service
import os

os.makedirs("certs", exist_ok=True)
priv, pub = pki_service.generate_keypair()
with open("certs/resume_signing_private.pem", "w") as f:
    f.write(priv)
with open("certs/resume_signing_public.pem", "w") as f:
    f.write(pub)
print("PKI keypair generated and saved to certs/")
