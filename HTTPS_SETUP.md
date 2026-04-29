# HTTPS Configuration Guide for FCS

## Overview

This guide explains how to configure HTTPS (SSL/TLS) for the FCS Secure Job Portal application. We've set up both **self-signed certificates for development** and instructions for **CA-issued certificates for production**.

---

## 🔐 Self-Signed Certificates (Development)

### Certificates Already Generated ✅

The following files have been created in the `certs/` directory:

- **`certs/server.crt`** - Self-signed certificate (valid for 365 days)
- **`certs/server.key`** - Private key (2048-bit RSA)

**Certificate Details:**
- Issuer: FCS (Self-signed)
- CN: localhost
- Valid: Feb 8, 2026 - Feb 8, 2027
- Usage: Development and testing only

---

## 🚀 Starting with HTTPS

### Quick Start (Recommended)

```bash
cd /Users/parulahlawat/Desktop/FCS
bash start-https.sh
```

This script will:
1. ✅ Check if certificates exist (auto-generate if missing)
2. ✅ Start Backend server on `https://localhost:8000` with HTTPS
3. ✅ Start Frontend dev server on `https://127.0.0.1:3000` with HTTPS
4. ✅ Print helpful URLs and warnings

---

### Manual Start (Without Script)

#### Backend HTTPS
```bash
cd /Users/parulahlawat/Desktop/FCS
source .venv/bin/activate
cd backend

uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --ssl-keyfile=../certs/server.key \
  --ssl-certfile=../certs/server.crt \
  --reload
```

#### Frontend HTTPS
```bash
cd /Users/parulahlawat/Desktop/FCS/frontend
npm run dev
```

The Vite config automatically detects the certificates and enables HTTPS.

---

## 🖥️ Accessing the Application

### URLs
- **Frontend Dashboard:** https://127.0.0.1:3000
- **Backend API:** https://localhost:8000
- **API Documentation:** https://localhost:8000/docs
- **Health Check:** https://localhost:8000/health

### Browser Security Warning

When accessing HTTPS with self-signed certificates, your browser will show:

```
⚠️ Your connection is not private
```

This is **normal and expected** for self-signed certificates. To proceed:

1. **Chrome/Edge:** Click "Advanced" → "Proceed to localhost (unsafe)"
2. **Firefox:** Click "Advanced" → "Accept the Risk and Continue"
3. **Safari:** Click "Show Details" → "Visit this website"

---

## 📋 Certificate Information

### View Certificate Details

```bash
# Display certificate information
openssl x509 -in certs/server.crt -text -noout

# Check certificate validity period
openssl x509 -in certs/server.crt -noout -dates

# Verify certificate and key match
openssl x509 -noout -modulus -in certs/server.crt | md5sum
openssl rsa -noout -modulus -in certs/server.key | md5sum
```

### Regenerate Certificates

If you need to regenerate the certificates:

```bash
bash generate-certs.sh
```

---

## 🏢 Production Setup (CA-Issued Certificates)

For production, you should use certificates issued by a trusted Certificate Authority (CA).

### Option 1: Let's Encrypt (Recommended - Free)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx \
  -d yourdomain.com \
  -d www.yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/yourdomain.com/
```

### Option 2: Commercial CA

1. Generate a Certificate Signing Request (CSR):
```bash
openssl req -new -newkey rsa:2048 -nodes \
  -keyout private.key \
  -out request.csr \
  -subj "/C=IN/ST=Delhi/O=CompanyName/CN=yourdomain.com"
```

2. Submit CSR to your CA provider (DigiCert, GoDaddy, AWS ACM, etc.)
3. Download the issued certificate
4. Update your server configuration with the certificate

### Option 3: AWS Certificate Manager

```bash
# Use AWS CLI to request a certificate
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names www.yourdomain.com \
  --region us-east-1
```

---

## ⚙️ Production Configuration

Update `backend/app/core/config.py` for production:

```python
# Allow your production domain
CORS_ORIGINS: List[str] = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]

ALLOWED_HOSTS: List[str] = [
    "yourdomain.com",
    "www.yourdomain.com"
]
```

### Nginx SSL Configuration

```nginx
# /etc/nginx/sites-available/fcs

upstream backend {
    server localhost:8000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Certificate from Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to backend
    location /api/ {
        proxy_pass https://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend static files
    location / {
        root /var/www/fcs-frontend/dist;
        try_files $uri /index.html;
    }
}
```

---

## 🔒 Security Best Practices

### 1. HTTPS Only
- ✅ Always use HTTPS in production
- ✅ Redirect HTTP to HTTPS
- ✅ Use HSTS header

### 2. Certificate Management
- ✅ Auto-renew Let's Encrypt certificates (renewal 30 days before expiry)
- ✅ Monitor certificate expiration dates
- ✅ Keep private keys secure and never commit to version control

### 3. TLS Configuration
- ✅ Use TLS 1.2 or higher
- ✅ Disable weak ciphers
- ✅ Enable Perfect Forward Secrecy (PFS)

### 4. API Security
- ✅ Enforce bearer token authentication
- ✅ Validate CORS origins
- ✅ Rate limit API endpoints
- ✅ Use secure HTTP headers

---

## 🛠️ Troubleshooting

### Certificate Not Found Error

```bash
# Check if certificates exist
ls -la certs/

# If missing, regenerate
bash generate-certs.sh
```

### Mixed Content Warning

Browser shows: "Mixed Content: The page was loaded over HTTPS, but requested an insecure resource"

**Solution:** Update API URLs in `frontend/src/services/api.js` to use HTTPS:
```javascript
const API_BASE = 'https://localhost:8000/api/v1'
```

### SSL Certificate Verification Failed

If using HTTPS frontend with self-signed backend certificate:

**Frontend Vite config** already has:
```javascript
rejectUnauthorized: false // Allow self-signed certificates in development
```

This is configured automatically.

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

---

## 📚 References

- **Let's Encrypt:** https://letsencrypt.org/
- **OWASP HTTPS:** https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html
- **Mozilla SSL Configuration:** https://ssl-config.mozilla.org/
- **Uvicorn SSL Guide:** https://www.uvicorn.org/deployment/

---

## 📝 Checklist

#### Development (Self-Signed Certificates)
- [x] Generate self-signed certificates
- [x] Configure backend for HTTPS
- [x] Configure frontend for HTTPS
- [x] Test HTTPS connectivity
- [x] Document browser security warnings

#### Production (CA-Issued Certificates)
- [ ] Obtain CA-issued certificate
- [ ] Update Nginx configuration
- [ ] Configure auto-renewal
- [ ] Set security headers
- [ ] Test SSL/TLS configuration
- [ ] Monitor certificate expiration

---

**Last Updated:** February 8, 2026
**Status:** ✅ Development HTTPS Ready | ⏳ Production Instructions Included
