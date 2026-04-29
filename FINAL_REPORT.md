# FCS Project Final Report

## 1. Technology Stack

**Frontend:**
- React.js (with Vite)
- TailwindCSS (for styling)
- Zustand (state management)
- Axios (API requests)

**Backend:**
- Python 3 (FastAPI framework)
- SQLAlchemy (ORM)
- PostgreSQL (production database)
- JWT (authentication)
- SMTP (email/OTP)

**DevOps/Other:**
- Docker (containerization)
- Nginx (reverse proxy, HTTPS)
- Self-signed or CA-issued SSL certificates (for HTTPS)

---

## 2. Key Features

• User profile management.
• Secure resume upload with encryption.

---

## 3. HTTPS Configuration: Self-Signed Certificates

### What is a Certificate?
A certificate is a digital file that proves the identity of a server and enables encrypted (HTTPS) communication. It contains a public key and is either signed by a trusted Certificate Authority (CA) or self-signed.

### What is Used in This Project?
- **Self-signed certificates** are used for HTTPS in local development.
- Files: `certs/server.crt` (certificate), `certs/server.key` (private key)
- These are referenced by the frontend dev server and Nginx for secure connections.

### Why Self-Signed?
- Free and easy to generate for development/testing.
- Enables HTTPS locally, so you can test secure features (like cookies, CORS, etc.).
- Browsers will show a warning, but encryption is real.

### For Production
- Use a **CA-issued certificate** (from Let's Encrypt or another CA) for public deployments.
- CA certificates are trusted by browsers and do not show warnings.

---

**Summary:**
- Local/dev: Self-signed certificates for HTTPS.
- Production: Use CA-issued certificates for trust and security.

---

*Prepared by: FCS Project Team*
*Date: 13 February 2026*