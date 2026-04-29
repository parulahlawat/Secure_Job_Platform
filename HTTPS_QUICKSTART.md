# 🔐 FCS HTTPS Quick Start Guide

## ✅ What's Been Set Up

Your FCS Secure Job Portal is now configured for **HTTPS (SSL/TLS)** with self-signed certificates!

### Generated Certificates
```
✅ certs/server.crt (Certificate) - 1.2K
✅ certs/server.key (Private Key) - 1.7K
✅ Valid for 365 days (Feb 8, 2026 - Feb 8, 2027)
```

---

## 🚀 Start HTTPS Servers

### Option 1: Automated (Recommended)
```bash
cd /Users/parulahlawat/Desktop/FCS
chmod +x start-https.sh
bash start-https.sh
```

This script will:
- ✅ Start Backend on https://localhost:8000
- ✅ Start Frontend on https://127.0.0.1:3000
- ✅ Show helpful HTTPS warnings
- ✅ Auto-regenerate certificates if missing

### Option 2: Manual - Backend Only (HTTPS)
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

### Option 3: Manual - Frontend Only
```bash
cd /Users/parulahlawat/Desktop/FCS/frontend
npm run dev
```

Vite automatically detects certificates and enables HTTPS.

---

## 🌐 Access Your Application

### HTTPS URLs
| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://127.0.0.1:3000 | 🟢 HTTPS |
| **Backend API** | https://localhost:8000 | 🟢 HTTPS |
| **API Docs** | https://localhost:8000/docs | 🟢 HTTPS |
| **Health Check** | https://localhost:8000/health | 🟢 HTTPS |

---

## ⚠️ Browser Security Warning

Your browser will show this warning (this is NORMAL for self-signed certificates):

```
⚠️ Your connection is not private
    Attackers might be trying to steal your information...
```

### How to Proceed:

#### Chrome:
1. Click **"Advanced"**
2. Click **"Proceed to localhost (unsafe)"**

#### Firefox:
1. Click **"Advanced..."**
2. Click **"Accept the Risk and Continue"**

#### Safari:
1. Click **"Show Details"**
2. Click **"Visit this website"**

---

## 📋 HTTPS Features Configured

✅ **Backend (Uvicorn)**
- Runs on HTTPS with self-signed certificate
- SSL/TLS 1.2+ enabled
- Self-signed cert: localhost, valid 1 year
- Reload enabled for development

✅ **Frontend (Vite)**
- HTTPS dev server enabled
- Auto-detects certificates
- Proxy correctly configured for HTTPS backend
- Self-signed cert handling enabled
- CORS properly configured

---

## 🔒 Security Features

Your FCS application has:
- ✅ End-to-End Encryption (E2EE)
- ✅ JWT Bearer Token Authentication
- ✅ OTP-based Login
- ✅ Virtual Keyboard (Keylogging Protection)
- ✅ HTTPS/TLS Transport Security
- ✅ CORS Protection
- ✅ Rate Limiting
- ✅ Secure Headers (HSTS, X-Frame-Options, etc.)

---

## 🛠️ Troubleshooting

### "Cannot GET /health"
**Problem:** Backend not HTTPS
```bash
# Check if backend is running with HTTPS
curl -k https://localhost:8000/health
```

### "Mixed Content" Warning
**Problem:** Frontend HTTPS but API is HTTP
**Solution:** Frontend already configured - just use Vite proxy: `/api/`

### Certificates Not Found
```bash
cd /Users/parulahlawat/Desktop/FCS
bash generate-certs.sh
```

### Port Already in Use
```bash
# Find process on port 8000
lsof -i :8000

# Kill it
kill -9 <PID>

# Or use different port:
uvicorn app.main:app --port 8001 --ssl-keyfile ../certs/server.key --ssl-certfile ../certs/server.crt
```

---

## 📚 More Information

For detailed HTTPS setup, production configuration, and CA-issued certificates:
👉 **Read:** [HTTPS_SETUP.md](HTTPS_SETUP.md)

**Topics covered:**
- Self-signed vs CA-issued certificates
- Let's Encrypt free SSL
- Nginx reverse proxy setup
- Auto-certificate renewal
- Production SSL/TLS best practices
- Certificate management
- Troubleshooting advanced scenarios

---

## ✨ Testing Checklist

Run through these to verify HTTPS is working:

- [ ] Start servers with `bash start-https.sh`
- [ ] Access https://127.0.0.1:3000 (accept security warning)
- [ ] See Dashboard after login
- [ ] Check browser shows 🔒 lock icon
- [ ] DevTools Network tab shows HTTPS protocol
- [ ] API calls work (check Network tab)
- [ ] OTP login works
- [ ] Logout works
- [ ] Back buttons navigate correctly
- [ ] No "Mixed Content" warnings

---

## 🎯 Next Steps

### For Development
1. ✅ Use `bash start-https.sh` to run with HTTPS
2. Test all features (login, OTP, navigation)
3. Build frontend: `npm run build`
4. Test production build with Nginx

### For Production
1. Read [HTTPS_SETUP.md](HTTPS_SETUP.md) - Production section
2. Get CA-issued certificate (Let's Encrypt recommended)
3. Configure Nginx reverse proxy
4. Set up auto-renewal
5. Update CORS/ALLOWED_HOSTS
6. Deploy!

---

**Status:** ✅ HTTPS Setup Complete
**Date:** February 8, 2026
