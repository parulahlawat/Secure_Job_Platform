# FCS Project Setup Guide

## Prerequisites

- Docker & Docker Compose
- PostgreSQL (if running locally)
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

## Quick Start with Docker

### 1. Clone and Navigate
```bash
cd /Users/parulahlawat/Desktop/FCS
```

### 2. Create Environment File
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

### 3. Generate Self-Signed SSL Certificates (Development)
```bash
mkdir -p nginx/ssl
openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes
```

### 4. Start All Services
```bash
docker-compose -f docker/docker-compose.yml up -d
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- NGINX: http://localhost:80 / https://localhost:443

### 5. Initialize Database
```bash
docker-compose -f docker/docker-compose.yml exec backend python -m app.db
```

## Local Development (Without Docker)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Database Setup (Local PostgreSQL)
```bash
# Create database
createdb fcs_db

# Set DATABASE_URL in backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/fcs_db

# Initialize tables
cd backend && python app/db/__init__.py
```

## Project Structure

```
FCS/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── modules/      # Feature modules
│   │   ├── core/         # Core utilities
│   │   ├── db/           # Database
│   │   └── main.py       # Entry point
│   └── requirements.txt
├── frontend/             # React application
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── services/     # API & crypto services
│   │   └── App.jsx
│   └── package.json
├── nginx/                # Reverse proxy config
├── docker/               # Docker files
└── docker-compose.yml    # Orchestration
```

## Features

- ✅ User Authentication (Password + OTP)
- ✅ Role-Based Access Control
- ✅ Job Posting & Applications
- ✅ E2EE Messaging (NaCl)
- ✅ Encrypted Resume Storage
- ✅ Audit Logging
- ✅ Rate Limiting
- ✅ Security Headers
- ✅ Docker Support

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login with password
- `POST /api/v1/auth/request-otp` - Request OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP

### Jobs
- `GET /api/v1/jobs` - List jobs
- `GET /api/v1/jobs/{id}` - Get job details
- `POST /api/v1/jobs` - Create job (recruiter)
- `POST /api/v1/jobs/{id}/apply` - Apply to job

### Messaging
- `GET /api/v1/messages/conversations` - List conversations
- `GET /api/v1/messages/with/{userId}` - Get messages with user
- `POST /api/v1/messages/send` - Send encrypted message

### Resume
- `GET /api/v1/resume/my-resumes` - List resumes
- `POST /api/v1/resume/upload` - Upload resume
- `DELETE /api/v1/resume/{id}` - Delete resume

## Security Best Practices

1. Change `SECRET_KEY` in production
2. Use proper SSL certificates (Let's Encrypt)
3. Enable CORS only for trusted origins
4. Use environment variables for sensitive data
5. Implement rate limiting per client
6. Monitor audit logs regularly
7. Encrypt sensitive data at rest
8. Use HTTPS in production
9. Implement CSRF protection
10. Regular security audits

## Testing

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment guide.

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process using port
lsof -i :8000
kill -9 <PID>
```

### Database Connection Error
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check database credentials

### CORS Errors
- Verify frontend URL in CORS_ORIGINS
- Check API proxy configuration

## Contributing

1. Create feature branch
2. Make changes
3. Submit pull request

## License

MIT
