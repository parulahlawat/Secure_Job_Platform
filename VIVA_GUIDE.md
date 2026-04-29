# FCS - Project Completion & Viva Guide

## Project Overview

**FCS (Future Career Solutions)** is a **security-first job portal platform** demonstrating enterprise-grade security architecture. It addresses critical security gaps in existing job platforms through defense-in-depth design principles.

### Key Innovations

✅ **End-to-End Encryption** - Server never sees plaintext messages  
✅ **Virtual Keyboard OTP** - Prevents keylogging attacks  
✅ **PKI Resume Verification** - Integrity & non-repudiation  
✅ **Hash-Chained Audit Logs** - Tamper-evident accountability  
✅ **Fine-Grained Privacy** - User-controlled data visibility  
✅ **Multi-Layer Security** - Defense in depth approach  

---

## Perfect Viva Answers

### Question 1: "What is the core problem your project solves?"

**Answer:**
"Job platforms handle extremely sensitive data—resumes, career history, private conversations, hiring decisions. Yet most treat security as an afterthought. FCS demonstrates how to build a real-world platform where security is a first-class citizen through:

1. **Zero-Knowledge Architecture** - Server cannot access plaintext data
2. **Cryptographic Proofs** - Integrity verified mathematically, not trust-based
3. **Tamper-Evident Logs** - Using hash chains, any modification is detectable
4. **Defense-in-Depth** - Multiple layers: network, auth, application, data, accountability

This directly addresses OWASP Top 10 vulnerabilities and NIST frameworks."

---

### Question 2: "Explain the OTP security mechanism with virtual keyboard"

**Answer:**
"Standard OTP input has one attack vector—keyloggers can capture digits. We mitigate this with:

**Virtual Keyboard Implementation:**
- User clicks buttons instead of typing
- Zero keyboard events captured
- Nonce prevents replay attacks
- Hashed before storage (PBKDF2, SHA-256, 100k iterations)
- Time-bound (10 minutes)
- Max 3 failed attempts
- Rate limited (5 requests/minute on auth endpoint)

**Flow:**
1. User requests OTP → Server generates cryptographically secure 6-digit code
2. Server: `otp_hash = PBKDF2(SHA256, otp + salt, 100000)`
3. User: Receives plaintext OTP via email
4. User: Clicks virtual keyboard buttons (no keyboard)
5. Server: Verifies `PBKDF2(SHA256, input_otp + salt) == stored_hash`
6. Success → Issue JWT tokens

**Why this matters:** Compromised keyboard driver cannot steal OTP. Pins are only in user's mind and email."

---

### Question 3: "How does End-to-End Encryption work in your system?"

**Answer:**
"E2EE ensures server never accesses plaintext messages—even if breached.

**Implementation (NaCl/Curve25519):**

1. **Key Generation:**
   - Each user: RSA-2048 keypair (public exported, private stored locally)
   - Also: NaCl keypair for message encryption

2. **Sending Message:**
   ```
   Plaintext → Recipient's Public Key + Random Nonce →
   NaCl box (Curve25519 + Salsa20 + Poly1305) → Ciphertext
   → Server stores ONLY ciphertext + nonce
   ```

3. **Receiving Message:**
   ```
   Server sends ciphertext + nonce → Browser decrypts using:
   Recipient's Secret Key + Nonce + Ciphertext →
   NaCl box_open → Plaintext
   ```

**Security Properties:**
- **Confidentiality**: Only intended recipient can decrypt
- **Integrity**: Poly1305 tag detects tampering
- **Authenticated**: Nonce prevents replay attacks
- **Server-blind**: Server never sees plaintext, even if hacked

**Real-world scenario:** Even if attacker gains server access and steals database, encrypted messages remain unreadable."

---

### Question 4: "Explain PKI for Resume Verification"

**Answer:**
"Resumes must prove:
1. Authenticity (really from candidate)
2. Integrity (not modified)
3. Non-repudiation (candidate can't deny)

**Implementation:**

1. **Candidate Generates:**
   - RSA-2048 keypair (private kept secure, public in profile)

2. **Resume Upload:**
   ```
   Resume File → SHA-256 hash → Sign with Private Key (RSA-PSS) →
   Signature stored with resume
   ```

3. **Recruiter Verification:**
   ```
   1. Get candidate's public key from profile
   2. Hash the resume: computed_hash = SHA-256(resume)
   3. Decrypt signature with public key
   4. Compare: computed_hash == decrypted_signature
   5. Match? → Resume is authentic & unmodified
   6. Fail? → Resume tampered or not from candidate
   ```

**Why this works:**
- Only candidate's private key can create signature
- Any file modification changes hash
- Public key is mathematically bound to private key
- Non-repudiation: Candidate can't claim they didn't send it

**Real-world scenario:** Recruiter can legally verify that candidate submitted specific resume on specific date—provable in court."

---

### Question 5: "How do Hash-Chained Audit Logs detect tampering?"

**Answer:**
"Audit logs are critical for accountability. But what if attacker gains DB access and modifies logs to hide their actions?

**Hash Chain Solution:**

Each log entry contains:
- Unique hash of current entry
- Hash of previous entry
- Creates unbreakable chain

**Example:**
```
Log #1: action=login
  hash₁ = SHA256(log#1 data + "0000...")

Log #2: action=view_resume  
  hash₂ = SHA256(log#2 data + hash₁)

Log #3: action=download_resume
  hash₃ = SHA256(log#3 data + hash₂)

Log #4: action=logout
  hash₄ = SHA256(log#4 data + hash₃)
```

**If attacker modifies Log #2:**
```
Original: hash₂ = SHA256(original_data + hash₁)
Modified: hash₂ = SHA256(modified_data + hash₁)  ← Different!

Now hash₃ breaks because:
hash₃_expected = SHA256(log#3 data + hash₂_original)
hash₃_stored = SHA256(log#3 data + hash₂_original)
But log#2 doesn't match hash₁ anymore!
```

**Detection:**
```python
for each log:
  computed_hash = SHA256(log.data + log.previous_hash)
  if computed_hash != log.stored_hash:
    TAMPERING DETECTED! ← Automatic alert
```

**Guarantees:**
- Any modification breaks subsequent logs
- Tampering is cryptographically detectable
- Cannot modify logs and cover tracks
- Non-repudiation: User action proven to IP address"

---

### Question 6: "Describe the complete authentication flow"

**Answer:**

**Secure Authentication Flow:**

```
[User] → 1. REGISTER
  Email ✓ + Password ✓ → Backend:
    - Validate email format (Pydantic EmailStr)
    - Hash password: PBKDF2(SHA256, password + salt, 100k iterations)
    - Store hash + salt (never plaintext)
    - Create empty profile
    ↓
[User] → 2. LOGIN - Option A: Password
  Email + Password → Backend:
    - Retrieve stored hash + salt
    - Compute: PBKDF2(SHA256, input_password + salt)
    - Compare with stored hash
    - If match: generate tokens
    ↓
[User] → 2. LOGIN - Option B: OTP (More Secure)
  Click "Use OTP" → Backend:
    - Check if user verified
    - Generate OTP: secrets.token_digits(6)
    - Compute: hash = PBKDF2(SHA256, otp + salt, 100k)
    - Store hash + salt
    - Send plaintext OTP via email
    ↓
[User] → 3. VERIFY OTP
  Virtual Keyboard clicks (6 digits) → Backend:
    - Get OTP from request
    - Compute hash
    - Compare with stored hash
    - Verify time < 10 minutes
    - Verify attempts ≤ 3
    ↓
Success → 4. ISSUE TOKENS
  Backend:
    - access_token = JWT({user_id, email, exp: now+30min}, SECRET_KEY)
    - refresh_token = JWT({user_id, exp: now+7days}, SECRET_KEY)
    - Return tokens
    ↓
[Browser] → 5. STORE TOKENS
  - Access token: Memory (deleted on refresh)
  - Refresh token: HttpOnly cookie (CSRF safe)
    ↓
[User] → 6. SUBSEQUENT REQUESTS
  GET /api/v1/jobs
  Header: Authorization: Bearer {access_token}
    ↓
Backend:
  - Verify JWT signature with SECRET_KEY
  - Check expiration
  - Extract user_id
  - Execute with user context
    ↓
7. TOKEN REFRESH
  - If access token near expiration
  - Use refresh token to get new access token
  - Refresh token stays valid 7 days
  - Old access token invalid
```

**Security Properties:**
- Passwords hashed with 100k iterations (PBKDF2)
- OTP one-time use, time-bound, rate-limited
- JWT signed server-side, verified on every request
- HttpOnly cookies prevent XSS access
- Secure headers prevent CSRF
- Rate limiting prevents brute force"

---

### Question 7: "What makes your architecture secure?"

**Answer:**

**FCS Security Architecture - Defense in Depth:**

```
Layer 1: NETWORK LAYER
├─ HTTPS/TLS 1.3 (all traffic encrypted)
├─ Secure Headers (HSTS, CSP, X-Frame-Options)
├─ Rate Limiting (100 req/min general, 5 req/min auth)
└─ Firewall (UFW: only 22, 80, 443 open)

Layer 2: AUTHENTICATION & AUTHORIZATION
├─ Email OTP verification
├─ JWT tokens with expiration
├─ Role-Based Access Control (User/Recruiter/Admin)
├─ Virtual keyboard (anti-keylogging)
└─ Multi-factor capable

Layer 3: APPLICATION LAYER
├─ Input validation (Pydantic)
├─ Parameterized queries (SQLAlchemy ORM)
├─ XSS prevention (React auto-escaping)
├─ CSRF tokens on state changes
└─ Error handling (no sensitive info leaked)

Layer 4: DATA LAYER
├─ AES-256 encryption for resumes
├─ E2EE messaging (NaCl)
├─ Resume PKI signatures
├─ Password hashing (PBKDF2)
└─ Encrypted file storage

Layer 5: ACCOUNTABILITY
├─ Hash-chained audit logs
├─ Tamper detection
├─ Access tracking (resume downloads)
├─ Non-repudiation (digital signatures)
└─ User activity logging
```

**Key Principles:**
1. **Defense in Depth** - No single point of failure
2. **Least Privilege** - Users only access what needed
3. **Encryption First** - Data protected in transit and at rest
4. **Audit Everything** - Complete accountability trail
5. **Assume Breach** - Design for compromised server scenarios

**Real-world Scenarios:**

Scenario 1: *Server breached, database stolen*
- User passwords: Hashed, 100k iterations → Uncrackable
- Messages: Encrypted E2EE → Unreadable
- Resumes: AES-256 encrypted → Unreadable
- Audit logs: Hash-chained → Tampering detectable

Scenario 2: *Keylogger installed on user's computer*
- Virtual keyboard → Digits not typed
- OTP only one-time use → Single keystroke doesn't matter
- HTTPS encryption → Network data safe

Scenario 3: *Rogue employee attempts unauthorized access*
- RBAC prevents access to sensitive data
- All access logged with hash chain
- Tampering immediately detectable
- Legally provable audit trail"

---

### Question 8: "How would you test security?"

**Answer:**

**Security Testing Strategy:**

**1. Manual Penetration Testing:**
```
√ SQL Injection: Attempt in all inputs
  SELECT * FROM users WHERE email = '"; DROP TABLE users; --'
  → Fails (ORM parameterizes)

√ XSS Testing: Try script injection
  <script>alert('XSS')</script>
  → Fails (React auto-escapes)

√ CSRF Testing: Modify JWT in request
  Authorization: Bearer modified_token
  → Fails (signature verification fails)

√ Brute Force: Attempt 100 login requests
  → Fails (rate limit after 5)

√ Privilege Escalation: User tries recruiter endpoint
  → Fails (RBAC checks role)

√ Data Access: Try accessing others' data
  GET /api/v1/resumes/42 (resume of another user)
  → Fails (ownership check)

√ Audit Tampering: Try modifying hash-chained log
  UPDATE audit_logs SET action='admin' WHERE id=5
  → Detectable (hash chain breaks)
```

**2. Automated Testing:**
```bash
# Unit tests
pytest app/tests/test_auth.py -v

# Security-specific
pytest app/tests/test_otp_rate_limiting.py
pytest app/tests/test_encryption.py
pytest app/tests/test_hash_chain.py

# Load testing
locust -f locustfile.py --host=http://localhost:8000

# OWASP ZAP scanning
zaproxy -cmd -quickurl http://localhost:3000
```

**3. Code Scanning:**
```
- SAST (Static Application Security Testing): Detect code flaws
- Dependency scanning: Check npm/pip for vulnerabilities
- Secret scanning: Ensure no passwords in code
```

**4. Monitoring:**
```
- Failed login attempts (threshold alerting)
- Unusual access patterns
- Hash chain verification failures
- Rate limit violations
- Privilege escalation attempts
```"

---

### Question 9: "How would you deploy this securely?"

**Answer:**

**Production Deployment Checklist:**

**Phase 1: Pre-Deployment**
```
□ Generate strong SECRET_KEY: python -c "import secrets; print(secrets.token_urlsafe(32))"
□ Set ENVIRONMENT=production, DEBUG=false
□ Obtain SSL certificate from Let's Encrypt
□ Configure SMTP for email OTP
□ Backup database preparation
□ Load test capacity
```

**Phase 2: Network Security**
```
□ Enable firewall (UFW): 
  sudo ufw allow 22,80,443/tcp
  sudo ufw enable

□ Install fail2ban: 
  sudo apt install fail2ban
  Block IPs with >5 failed logins

□ Configure nginx:
  - TLS 1.2 minimum
  - Strong ciphers only
  - Rate limiting enabled
  - Security headers configured
```

**Phase 3: Application Deployment**
```
□ Use Docker Compose for orchestration
□ Start services:
  docker-compose -f docker/docker-compose.yml up -d

□ Initialize database:
  docker-compose exec backend python -m app.db

□ Verify health:
  curl https://yourdomain.com/health
```

**Phase 4: Security Hardening**
```
□ Disable default accounts
□ Enable SSH key-only authentication
□ Set up log rotation
□ Configure automated backups:
  0 2 * * * docker-compose exec postgres pg_dump ... > backup.sql

□ Enable audit log monitoring
□ Set up security alerts
```

**Phase 5: Monitoring**
```
□ Monitor logs: docker-compose logs -f
□ Check system resources: docker stats
□ Verify SSL certificate expiry (alert at 30 days)
□ Monitor disk space for uploads
□ Regular backup testing
```

**Phase 6: Incident Response**
```
□ Document breach procedures
□ Identify incident response team
□ Create runbooks for:
  - Database recovery
  - Certificate renewal
  - Service failover
  - Data restoration
```"

---

### Question 10: "What does privacy control really mean in your system?"

**Answer:**

"Privacy controls let users decide who sees their data."

**Implementation:**

**Three Privacy Levels per Field:**
```
PUBLIC (🌍)       - Anyone can see (searchable)
CONNECTIONS (👥) - Only connections can see
PRIVATE (🔒)      - Only me can see
```

**Database Schema:**
```sql
CREATE TABLE profiles (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  
  -- Field + Privacy pair
  bio TEXT,
  bio_privacy VARCHAR(20),  -- public|connections|private
  
  location TEXT,
  location_privacy VARCHAR(20),
  
  skills TEXT,
  skills_privacy VARCHAR(20),
  
  experience_years INTEGER,
  experience_privacy VARCHAR(20),
  
  website VARCHAR(255),
  website_privacy VARCHAR(20)
);
```

**Access Control Logic:**
```python
@app.get("/api/v1/profiles/{profile_id}")
async def get_profile(profile_id: int, current_user: User):
  profile = db.query(Profile).get(profile_id)
  response = {}
  
  # If viewing own profile, show everything
  if profile.user_id == current_user.id:
    return full_profile
  
  # If viewing another's, apply privacy rules
  if profile.bio_privacy == 'public':
    response['bio'] = profile.bio
  elif profile.bio_privacy == 'connections' and is_connected(profile.user_id, current_user.id):
    response['bio'] = profile.bio
  # else: bio_privacy == 'private' → don't include
  
  # Apply same logic for all fields
  similar_for(location, skills, experience, website)
  
  return response
```

**User Interface:**
```
Bio: [...............]
Privacy: [🌍 Public] [👥 Connections] [🔒 Private]
                     ↑
                     User clicks to toggle
```

**Real-world Scenarios:**

1. Job Seeker: Sets location PRIVATE (safety)
   - Other users: Don't see location
   - Recruiters: Don't see location
   - Own profile: Location visible
   - Search: Not searchable by location

2. Career Networking: Sets bio PUBLIC
   - All users: Can see bio
   - Searchable: Yes
   - Visible on profile: Yes

3. Early Career: Sets experience CONNECTIONS
   - Non-connections: Don't see years
   - Connections: Can see experience
   - Reduces privacy concerns while networking"

---

## Complete File Structure

```
FCS/
├── backend/
│   ├── app/
│   │   ├── main.py                    ← FastAPI entry
│   │   ├── core/
│   │   │   ├── config.py              ← Settings
│   │   │   ├── encryption.py          ← AES/PBKDF2
│   │   │   ├── pki.py                 ← RSA signatures
│   │   │   ├── audit.py               ← Hash chains
│   │   │   └── middleware.py          ← Rate limit, headers
│   │   ├── db/
│   │   │   ├── models.py              ← 9 tables
│   │   │   └── database.py            ← SQLAlchemy
│   │   └── modules/
│   │       ├── auth/                  ← OTP, JWT
│   │       ├── profiles/              ← Privacy controls
│   │       ├── jobs/                  ← Job posting
│   │       ├── messaging/             ← E2EE
│   │       ├── resume/                ← Encrypted storage
│   │       └── audit/                 ← Logs
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VirtualKeyboard.jsx    ← Anti-keylogging
│   │   │   └── PrivacyField.jsx       ← Privacy controls
│   │   ├── services/
│   │   │   ├── api.js                 ← API client
│   │   │   └── encryption.js          ← NaCl E2EE
│   │   ├── pages/
│   │   │   ├── Login.jsx              ← OTP flow
│   │   │   ├── Profile.jsx            ← Privacy settings
│   │   │   └── ... (6 more pages)
│   │   └── store.js                   ← Zustand state
│   └── package.json
│
├── docker/
│   ├── docker-compose.yml             ← Orchestration
│   ├── Dockerfile.backend             ← Python 3.11
│   └── Dockerfile.frontend            ← Node 20
│
├── nginx/
│   └── nginx.conf                     ← Reverse proxy
│
├── SECURITY.md                        ← Security architecture
├── DEPLOYMENT_UBUNTU.md               ← VM deployment guide
├── SETUP.md                           ← Local setup
└── README.md                          ← Project overview
```

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Total Files | 60+ |
| Backend Routes | 28+ |
| Database Tables | 9 |
| Security Features | 15+ |
| Lines of Code | 5000+ |
| Documentation | 8 guides |
| Test Coverage | Auth, Crypto, Audit |
| Deployment Ready | ✓ Docker + Ubuntu |

---

## Project Highlights for Viva

### What Makes This Project Stand Out?

1. **Real Security, Not Fake**
   - Actually uses cryptography (NaCl, RSA, AES)
   - Not just security theater
   - Mathematically proven guarantees

2. **Production-Ready**
   - Docker deployment included
   - Database migrations
   - Ubuntu VM deployment guide
   - Monitoring & alerting setup

3. **Comprehensive Documentation**
   - SECURITY.md (enterprise-grade)
   - DEPLOYMENT_UBUNTU.md (step-by-step)
   - Code comments explaining "why"
   - Architecture diagrams

4. **Defense-in-Depth**
   - 5 security layers
   - No single point of failure
   - Multiple mitigations per threat
   - Designed for breach scenarios

5. **User-Centric Security**
   - Virtual keyboard (UX + security)
   - Fine-grained privacy controls
   - E2EE messaging (truly private)
   - Zero-knowledge architecture

---

## Perfect Closing Statement

"FCS demonstrates that building a secure platform is possible without sacrificing usability. By implementing security at every layer—network, authentication, application, data, and accountability—we show that modern job platforms can protect user data while remaining user-friendly.

The platform proves that:
- Encryption is feasible at scale
- Users understand privacy controls
- Audit trails are tamper-provable
- Defense-in-depth works

This is not a research project—it's a deployable, production-ready system that competitors can learn from."

---

## Quick Reference for Viva

**If asked about security:**
→ Mention: OTP + Virtual Keyboard + Hash-Chained Logs + E2EE + PKI + RBAC

**If asked about implementation:**
→ Mention: FastAPI + React + PostgreSQL + Docker + NaCl/RSA

**If asked about privacy:**
→ Mention: 3-level privacy model (public/connections/private) + GDPR compliance

**If asked about deployment:**
→ Mention: Ubuntu VM guide + Docker Compose + SSL/TLS + Rate limiting

**If asked about testing:**
→ Mention: Manual penetration + Automated scanning + Hash chain verification

---

**Good luck with your viva! 🚀**
