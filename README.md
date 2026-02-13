<<<<<<< HEAD
# FCS - Future Career Solutions
## Secure Job Portal Platform

A privacy-first job portal with end-to-end encryption, zero-knowledge architecture, and enterprise security.

### Architecture

```
User Browser (React Frontend - HTTPS)
    ↓ HTTPS (TLS)
NGINX (Reverse Proxy, Rate Limiting, Secure Headers)
    ↓
FastAPI Backend (Python)
    ├── Auth & Security (Login, OTP, RBAC)
    ├── Profile & Job Management
    ├── E2EE Messaging
    ├── Resume Security (Encrypted Storage)
    └── Audit & Logging
    ↓
    ├── PostgreSQL Database
    └── Encrypted File Store
```

### Key Features

- **Zero-Knowledge Architecture**: Server can never access user data
- **End-to-End Encryption**: Messages encrypted on client, decrypted on client
- **Email-based OTP**: Secure authentication without passwords
- **Role-Based Access Control**: User / Recruiter / Admin roles
- **Encrypted Resume Storage**: Resumes encrypted with AES-256
- **Hash-Chained Audit Logs**: Tamper-evident event logging
- **Rate Limiting**: NGINX protection against abuse

### Tech Stack

- **Frontend**: React, TailwindCSS, Socket.io, NaCl (encryption)
- **Backend**: FastAPI (Python), SQLAlchemy, Pydantic
- **Database**: PostgreSQL
- **Cache**: Redis (optional)
- **File Storage**: Encrypted local storage or S3
- **Reverse Proxy**: NGINX with TLS
- **Containerization**: Docker & Docker Compose

### Getting Started

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

#### Database Setup
```bash
# PostgreSQL must be running
createdb fcs_db
python backend/app/db/init_db.py
```

### Project Structure

```
FCS/
├── backend/
│   ├── app/
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication & Security
│   │   │   ├── profiles/      # User & Company Profiles
│   │   │   ├── jobs/          # Job Postings & Applications
│   │   │   ├── messaging/     # E2EE Messaging
│   │   │   ├── resume/        # Encrypted Resume Storage
│   │   │   └── audit/         # Audit Logging
│   │   ├── core/              # Shared utilities & config
│   │   ├── db/                # Database models & migrations
│   │   └── main.py            # FastAPI app entry
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── public/
│   └── package.json
├── nginx/
│   └── nginx.conf             # Reverse proxy config
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
└── README.md
```

### Security Considerations

- All data encrypted at rest and in transit
- HTTPS/TLS enforced
- CORS restricted to frontend domain
- CSRF tokens on state-changing requests
- Rate limiting on all endpoints
- SQL injection prevention via ORM
- XSS protection via React
- HSTS enabled
- Secure headers configured

### Development

```bash
# Start all services
docker-compose up

# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

### License

MIT
=======
# Secure-Job-Platform
>>>>>>> 05f9724bfe99daf7f35a1b77c1c021223adc6b27
