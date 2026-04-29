# FCS Security Architecture & Design Document

## Executive Summary

FCS (Future Career Solutions) is a **security-first job portal** that demonstrates enterprise-grade security practices. Every component is designed with defense-in-depth principles where security is a first-class citizen, not an afterthought.

---

## 1. Threat Model & Attack Vectors

### 1.1 Assets Under Protection
- **User Identity Data**: Name, email, location
- **Professional Data**: Resume, work history, skills
- **Sensitive Communication**: Recruiter-candidate messages
- **Business Data**: Job postings, application decisions
- **Audit Data**: Activity logs, tamper-proof records

### 1.2 Threat Actors
- **External Attackers**: Network penetration, data breach
- **Malicious Insiders**: Rogue employees accessing unauthorized data
- **Compromised Servers**: Attackers with server access
- **Man-in-the-Middle**: Network interception
- **Social Engineering**: Phishing, pretexting

### 1.3 Attack Vectors Addressed

| Attack Vector | Threat Level | Mitigation |
|---|---|---|
| SQL Injection | High | SQLAlchemy ORM + Parameterized queries |
| XSS Attacks | High | React auto-escaping + CSP headers |
| CSRF Attacks | Medium | CSRF tokens on state-changing requests |
| Brute Force Login | High | Rate limiting + OTP verification |
| Session Hijacking | High | Secure JWT + HttpOnly cookies |
| Man-in-the-Middle | High | HTTPS/TLS enforced everywhere |
| Data Breach | Critical | End-to-End Encryption + PKI |
| Insider Threat | Critical | Audit logs + Hash chaining |
| API Abuse | Medium | Rate limiting per IP |
| File Upload Attacks | Medium | Type validation + Scanning |

---

## 2. Security Architecture

### 2.1 Layered Defense

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Network Security                           │
│ • HTTPS/TLS 1.3                                    │
│ • Secure Headers (HSTS, CSP, X-Frame-Options)     │
│ • DDoS Protection (Nginx rate limiting)             │
│ • Firewall rules                                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ Layer 2: Authentication & Access Control            │
│ • Email OTP verification                           │
│ • JWT tokens with expiration                       │
│ • Role-Based Access Control (RBAC)                 │
│ • Virtual keyboard for OTP (anti-keylogging)       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ Layer 3: Application Security                       │
│ • Input validation (Pydantic)                      │
│ • Parameterized queries (SQLAlchemy ORM)           │
│ • XSS prevention (React escaping)                  │
│ • CSRF tokens on state changes                     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ Layer 4: Data Security                              │
│ • AES-256 Encryption at rest                       │
│ • E2EE messaging (NaCl)                            │
│ • Resume PKI signatures                            │
│ • Hash-chained audit logs                          │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ Layer 5: Accountability                             │
│ • Comprehensive audit logs                         │
│ • Tamper detection (hash chain)                    │
│ • Non-repudiation (digital signatures)             │
│ • Access tracking (resume downloads)               │
└─────────────────────────────────────────────────────┘
```

---

## 3. Detailed Security Mechanisms

### 3.1 Authentication

#### OTP-Based Verification

**Why OTP instead of passwords alone?**
- Passwords can be weak or compromised
- OTP adds second factor of authentication
- Time-bound (10 minutes default)
- Cryptographically generated
- Never stored in plaintext

**OTP Flow:**
```
User → Email OTP Request → Generate OTP → Hash OTP → Store Hash
       ↓
       Receive OTP in Email (plaintext)
       ↓
Virtual Keyboard Input (no keyboard logging) → Verify against hash
       ↓
Success → Issue JWT Tokens → User authenticated
```

**Implementation Security:**
- OTP generated with `secrets.token_digits(6)` (cryptographically strong)
- Hashed before storage: `PBKDF2(SHA256, iterations=100000)`
- Saltbincluded in hash
- Max 3 attempts per OTP
- Automatic expiry after 10 minutes
- Old OTPs deleted on new request

#### JWT Tokens

**Token Structure:**
```
Header: {
  "alg": "HS256",
  "typ": "JWT"
}

Payload: {
  "sub": "user_id",
  "email": "user@example.com",
  "type": "access",
  "exp": 1702000000,
  "iat": 1701998800
}

Signature: HMAC-SHA256(header.payload, SECRET_KEY)
```

**Token Management:**
- Access tokens: 30 minutes expiration
- Refresh tokens: 7 days expiration
- Stored in httpOnly cookie (CSRF safe)
- Always transmitted over HTTPS
- Validated on every request

### 3.2 Encryption

#### End-to-End Encryption (E2EE) for Messaging

**Why client-side encryption?**
- Server never sees plaintext
- Even server breach doesn't expose messages
- Only recipient can decrypt

**Implementation (NaCl/libsodium):**
```
Plaintext Message
       ↓
Generate random nonce (24 bytes)
       ↓
Encrypt with Recipient's Public Key
Client Secret Key + Nonce + AES (box)
       ↓
Ciphertext + Nonce (base64)
       ↓
Server stores ciphertext ONLY
       ↓
Recipient downloads ciphertext
       ↓
Decrypt with Recipient's Secret Key
Server nonce + Ciphertext (box_open)
       ↓
Plaintext visible only to recipient
```

**Key Details:**
- Algorithm: NaCl secret box (Curve25519 + Salsa20 + Poly1305)
- Nonce: Random 24 bytes, prevents replay attacks
- Encryption: Authenticated encryption (integrity verified)
- Keys: Generated on first login, stored locally in browser

#### Resume Encryption (AES-256)

**Why encrypt resumes?**
- Resumes contain sensitive career information
- Can be misused if exposed
- Restricted access needed

**Process:**
```
Resume Upload
       ↓
Generate encryption key
       ↓
AES-256-GCM encrypt file
       ↓
Compute SHA-256 hash
       ↓
Sign with RSA (PKI)
       ↓
Store encrypted file + metadata + signature
       ↓
Access restricted to owner + authorized recruiters
       ↓
Log every access attempt
```

**Security Properties:**
- Algorithm: AES-256-GCM (authenticated encryption)
- Keys: Generated per file, never stored plaintext
- Integrity: HMAC verification on decryption
- Signatures: RSA-2048 for resume verification
- Access: Logged and auditable

### 3.3 Public Key Infrastructure (PKI)

#### Resume Signing & Verification

**Why sign resumes?**
- Prove resumeintegrity (not tampered)
- Prove authenticity (actually from candidate)
- Non-repudiation (candidate can't deny)

**Process:**
```
Upload Resume
       ↓
User generates RSA-2048 keypair (private + public)
       ↓
Compute SHA-256(resume content)
       ↓
Sign with Private Key:
PKCS1-PSS padding + SHA-256
       ↓
Store:
- Public Key (in profile)
- Signature (with resume)
- Certificate (self-signed)
       ↓
Verify (by recruiter):
1. Get candidate's public key
2. Hash resume
3. Verify signature with public key
4. Success → Resume is authentic & unmodified
```

**Security Guarantees:**
- **Authenticity**: Only owner can create signature (private key required)
- **Integrity**: Any modification breaks signature verification
- **Non-repudiation**: Owner can't deny creating signature
- **Certificate chain**: Self-signed cert stored for long-term verification

### 3.4 Audit Logging with Hash Chaining

**Why hash chaining?**
- Prevent tampering with audit logs
- Detect if any log entry is modified
- Maintain accountability trail

**Hash Chain Structure:**
```
Log 1: action="login" → Hash1
       ↓
Log 2: action="download_resume" + previous_hash=Hash1 → Hash2
       ↓
Log 3: action="apply_job" + previous_hash=Hash2 → Hash3
       ↓
Log 4: action="logout" + previous_hash=Hash3 → Hash4
```

**Chain Verification:**
```
1. Replay from beginning
2. Compute hash for each log
3. Verify hash matches stored hash
4. Verify previous_hash chain is unbroken
5. If ANY log is modified:
   - Hash won't match
   - Chain breaks
   - Tampering detected!
```

**Implementation:**
```python
# Each log entry contains:
{
  "log_hash": SHA256(current_log + previous_hash),
  "previous_hash": SHA256(previous_log + previous_previous_hash),
  "action": "...",
  "timestamp": "...",
  "ip_address": "...",
  "user_agent": "..."
}

# Verification:
for each log in logs:
  computed_hash = SHA256(log.data + log.previous_hash)
  if computed_hash != log.log_hash:
    TAMPER DETECTED!
```

**Guarantees:**
- **Integrity**: Any modification breaks hash chain
- **Immutability**: Can't modify without breaking subsequent logs
- **Detection**: Tampering is immediately detectable
- **Accountability**: Every action is logged with user, time, IP

---

## 4. Privacy Controls

### 4.1 Fine-Grained Privacy Model

Each profile field has 3 privacy levels:

```
┌─ Field Value ─┐
│    Bio        │
└───────────────┘
       │
       ├─ Public (🌍)       → Visible to all users
       ├─ Connections (👥)  → Visible to connections only
       └─ Private (🔒)      → Only me can see
```

**Implementation:**
```sql
profiles table:
- bio TEXT
- bio_privacy VARCHAR(20)  -- 'public' | 'connections' | 'private'
- location TEXT
- location_privacy VARCHAR(20)
- skills TEXT
- skills_privacy VARCHAR(20)
... per field
```

**Access Control:**
```python
# When displaying profile:
def get_viewable_fields(profile, viewer):
  visible = {}
  
  if profile.owner == viewer:
    return all_fields  # User sees everything
  
  if profile.bio_privacy == 'public':
    visible['bio'] = profile.bio
  elif profile.bio_privacy == 'connections' and is_connected(profile.owner, viewer):
    visible['bio'] = profile.bio
  elif profile.bio_privacy == 'private':
    pass  # Don't include bio
  
  return visible
```

### 4.2 Data Minimization

- Collect only necessary data
- Don't retain data longer than needed
- Provide data deletion options
- Allow users to control visibility

---

## 5. Network Security

### 5.1 HTTPS/TLS Configuration

**Minimum Requirements:**
- TLS 1.2 or higher (1.3 preferred)
- Strong cipher suites
- Certificate from trusted CA
- HSTS enabled

**Secure Headers:**

| Header | Purpose |
|---|---|
| `Strict-Transport-Security` | Force HTTPS for 1 year |
| `X-Frame-Options: DENY` | Prevent clickjacking |
| `X-Content-Type-Options: nosniff` | Prevent MIME sniffing |
| `Content-Security-Policy` | Prevent XSS attacks |
| `X-XSS-Protection` | Browser XSS filters |
| `Referrer-Policy` | Control referrer leaking |
| `Permissions-Policy` | Disable unnecessary APIs |

### 5.2 Rate Limiting

**Strategy:**
- Limit by IP address
- Stricter limits on auth endpoints
- Progressive backoff
- Fail2ban integration

**Limits:**
```
General API: 100 requests/minute
Auth endpoints: 5 requests/minute
File uploads: 10 requests/minute
```

### 5.3 CORS Policy

**Trusted Origins Only:**
```
Allow: https://yourdomain.com
Allow: https://www.yourdomain.com
Deny: All others
```

---

## 6. Database Security

### 6.1 SQL Injection Prevention

**Using SQLAlchemy ORM:**
```python
# ✓ SAFE: ORM automatically parameterizes
user = db.query(User).filter(User.email == email).first()

# ✗ NEVER: String concatenation
user = db.query(f"SELECT * FROM users WHERE email = '{email}'")
```

### 6.2 Sensitive Data Handling

**Never store:**
- Plaintext passwords (use PBKDF2)
- Encryption keys (use key management)
- OTP codes (hash before storing)

**Always:**
- Hash passwords with salt
- Use strong KDF (Key Derivation Function)
- Rotate encryption keys regularly
- Separate keys by function

### 6.3 Access Control

```sql
-- Only owner can access resume
SELECT * FROM resumes 
WHERE user_id = current_user_id

-- Only recruiter or owner can see application notes
SELECT recruiter_notes FROM job_applications
WHERE job.recruiter_id = current_user_id OR user_id = current_user_id

-- Only admin can view full audit logs
SELECT * FROM audit_logs
WHERE user_role = 'admin'
```

---

## 7. Input Validation & Output Encoding

### 7.1 Input Validation

**Using Pydantic:**
```python
class UserCreate(BaseModel):
  email: EmailStr  # Validates email format
  full_name: str = Field(..., min_length=1, max_length=255)
  password: str = Field(..., min_length=8, max_length=100)

# Automatically validates on request:
# ✓ Valid: {"email": "user@example.com", "password": "securePass123"}
# ✗ Invalid: {"email": "invalid", "password": "short"}
```

### 7.2 Output Encoding

**React Auto-Escaping:**
```jsx
// ✓ SAFE: React escapes HTML
<div>{user_input}</div>  // Escapes: <script> → &lt;script&gt;

// ✗ UNSAFE: Never use dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{__html: user_input}} />
```

---

## 8. Secret Management

### 8.1 Secrets Hierarchy

```
Environment Variables (.env)
├─ SECRET_KEY (JWT signing)
├─ DATABASE_URL (DB connection)
├─ ENCRYPTION_KEY (AES-256)
├─ SMTP_PASSWORD (Email)
└─ CORS_ORIGINS (Allowed domains)
```

**Never:**
- Commit `.env` to Git
- Log secrets
- Display secrets in UI
- Share secrets via insecure channels

**Always:**
- Use environment-specific .env files
- Rotate secrets regularly
- Limit secret access (principle of least privilege)
- Use secrets manager in production

---

## 9. Security Testing

### 9.1 Manual Testing Checklist

- [ ] Try SQL injection in all inputs
- [ ] Test XSS with `<script>alert('XSS')</script>`
- [ ] Attempt CSRF with modified tokens
- [ ] Brute force OTP (should fail after 3 attempts)
- [ ] Try accessing others' resumes
- [ ] Modify JWT and verify it fails
- [ ] Check all secure headers present
- [ ] Verify SSL certificate is valid
- [ ] Test rate limiting (>100 requests/min should fail)
- [ ] Verify audit logs are not tamperable

### 9.2 Automated Testing

```bash
# Run backend tests
cd backend && pytest

# Test specific security features
pytest app/tests/test_auth.py
pytest app/tests/test_otp.py
pytest app/tests/test_encryption.py
pytest app/tests/test_audit.py
```

---

## 10. Incident Response Plan

### 10.1 Breach Detection

**Signs of breach:**
- Unusual database queries in logs
- Failed authentication spikes
- Unexpected file access
- Hash chain breaks in audit logs
- Unauthorized downloads

**Immediate Actions:**
```bash
1. Isolate affected systems
2. Take screenshots of logs
3. Preserve evidence
4. Review audit trail (hash chain)
5. Identify compromised accounts
6. Force password reset for affected users
7. Rotate encryption keys
8. Notify users (within 72 hours legally)
9. Review security logs
10. Implement fixes
```

### 10.2 Response Team

- Security Officer
- Database Administrator
- Backend Engineer
- Frontend Engineer
- Legal (if applicable)

---

## 11. Compliance & Standards

### 11.1 Standards Followed

- **OWASP Top 10**: All protections implemented
- **NIST Cybersecurity Framework**: Defense in depth
- **GDPR**: Privacy controls, data deletion
- **CCPA**: User data control
- **CWE-25**: Secure coding practices

### 11.2 Audit Trail

All data access is logged:
```
User ID | Action | Resource | Timestamp | IP Address | Status
--------|--------|----------|-----------|------------|-------
42      | login  | auth     | 2026-02-06| 192.168.1.1| success
42      | view   | resume:5 | 2026-02-06| 192.168.1.1| success
43      | access | resume:5 | 2026-02-06| 203.0.113.4| denied (not authorized)
```

---

## 12. Security Recommendations for Production

### Immediate (Do Before Going Live)

- [ ] Generate strong random SECRET_KEY
- [ ] Use real SSL certificates (Let's Encrypt)
- [ ] Enable firewall (UFW on Ubuntu)
- [ ] Configure fail2ban for brute-force protection
- [ ] Set up log rotation
- [ ] Enable database backups
- [ ] Configure email for OTP delivery
- [ ] Test all security features
- [ ] Review audit logs

### Short-term (First Month)

- [ ] Set up security monitoring/alerting
- [ ] Implement intrusion detection (Snort/Suricata)
- [ ] Configure WAF (ModSecurity)
- [ ] Set up centralized logging
- [ ] Establish incident response procedures
- [ ] Train team on security practices
- [ ] Perform security assessment

### Long-term (Ongoing)

- [ ] Regular penetration testing (quarterly)
- [ ] Code security scanning (SAST)
- [ ] Dependency vulnerability scanning (SBOM)
- [ ] Keep software updated
- [ ] Rotate secrets regularly
- [ ] Review audit logs weekly
- [ ] Quarterly security training

---

## 13. Security Contacts

- **Security Issue Reporting**: security@yourdomain.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX
- **Legal**: legal@yourdomain.com

---

## 14. References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [GDPR Compliance](https://gdpr-info.eu/)
- [libsodium/NaCl](https://doc.libsodium.org/)

---

**Last Updated**: 2026-02-06
**Version**: 1.0
**Author**: FCS Security Team
