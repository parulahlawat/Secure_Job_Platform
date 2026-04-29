# Ubuntu VM Deployment Guide

Complete step-by-step guide to deploy FCS on an Ubuntu Linux VM.

## Prerequisites

- Ubuntu 20.04 LTS or later
- SSH access to VM
- Sudo privileges
- Domain name (optional, for production)

## Phase 1: System Setup (Run as root or with sudo)

### 1. Update System
```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git nano htop
```

### 2. Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker
docker --version
docker run hello-world

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 3. Install PostgreSQL Client (for admin access)
```bash
sudo apt install -y postgresql-client
```

### 4. Install Certbot (for SSL certificates)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5. Create Application Directory
```bash
sudo mkdir -p /opt/fcs
sudo chown $USER:$USER /opt/fcs
cd /opt/fcs
```

## Phase 2: Deploy FCS Application

### 1. Clone or Copy Project
```bash
cd /opt/fcs
# Clone from Git (if available)
# git clone <your-repo-url> .

# OR copy from local machine
# scp -r /path/to/FCS/* username@vm-ip:/opt/fcs/

# For this setup, we'll assume files are in /opt/fcs
```

### 2. Create Environment File
```bash
cd /opt/fcs
cp backend/.env.example backend/.env
```

Edit the environment file:
```bash
nano backend/.env
```

Set these values:
```
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://fcs_user:secure_password@postgres:5432/fcs_db
SECRET_KEY=<generate-32-char-random-key>
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
CORS_ORIGINS=["https://yourdomain.com"]
```

Generate random SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Create SSL Certificates Directory
```bash
mkdir -p /opt/fcs/nginx/ssl
```

For self-signed (development):
```bash
cd /opt/fcs/nginx/ssl
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=FCS/CN=yourdomain.com"
```

For Let's Encrypt (production):
```bash
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/fcs/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/fcs/nginx/ssl/key.pem
sudo chown $USER:$USER /opt/fcs/nginx/ssl/*
```

### 4. Update NGINX Configuration
```bash
nano /opt/fcs/nginx/nginx.conf
```

Update these lines:
- Change `server_name localhost` to your domain
- Update SSL certificate paths if using Let's Encrypt

### 5. Create uploads directory
```bash
mkdir -p /opt/fcs/uploads/resumes
chmod 755 /opt/fcs/uploads
```

## Phase 3: Start Docker Services

### 1. Build Images
```bash
cd /opt/fcs
docker-compose -f docker/docker-compose.yml build
```

### 2. Start Services
```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 3. Verify Services
```bash
docker-compose -f docker/docker-compose.yml ps
```

Output should show:
- `fcs_postgres` - running on port 5432
- `fcs_backend` - running on port 8000
- `fcs_frontend` - running on port 3000
- `fcs_nginx` - running on ports 80, 443
- `fcs_redis` - running on port 6379

### 4. Initialize Database
```bash
docker-compose -f docker/docker-compose.yml exec backend python -m app.db
```

Expected output:
```
✅ Database tables created successfully
```

## Phase 4: Configure Nginx as Reverse Proxy

### 1. Stop Docker Nginx
```bash
docker-compose -f docker/docker-compose.yml down
```

### 2. Install Nginx on Host (Optional - if not using Docker Nginx)
```bash
sudo apt install -y nginx
```

### 3. Configure Host Nginx
```bash
sudo nano /etc/nginx/sites-available/fcs
```

Paste:
```nginx
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /opt/fcs/nginx/ssl/cert.pem;
    ssl_certificate_key /opt/fcs/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    client_max_body_size 10M;
    
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location /api/v1/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        error_page 404 =200 /index.html;
    }
}
```

### 4. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/fcs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Start Docker Services (without nginx)
```bash
docker-compose -f docker/docker-compose.yml up -d
```

## Phase 5: Monitoring & Maintenance

### View Logs
```bash
# All services
docker-compose -f docker/docker-compose.yml logs -f

# Specific service
docker-compose -f docker/docker-compose.yml logs -f backend
docker-compose -f docker/docker-compose.yml logs -f frontend

# Nginx (if using host Nginx)
sudo tail -f /var/log/nginx/error.log
```

### Database Backup
```bash
docker-compose -f docker/docker-compose.yml exec postgres pg_dump -U fcs_user fcs_db > backup_$(date +%Y%m%d).sql
```

### Database Restore
```bash
cat backup_20260206.sql | docker-compose -f docker/docker-compose.yml exec -T postgres psql -U fcs_user fcs_db
```

### Restart Services
```bash
# All services
docker-compose -f docker/docker-compose.yml restart

# Specific service
docker-compose -f docker/docker-compose.yml restart backend
```

### Stop Services
```bash
docker-compose -f docker/docker-compose.yml down
```

### Remove All Data (CAUTION!)
```bash
docker-compose -f docker/docker-compose.yml down -v
```

## Phase 6: SSL Certificate Auto-Renewal

### Create Renewal Script
```bash
sudo nano /usr/local/bin/fcs-renew-ssl.sh
```

```bash
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/fcs/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/fcs/nginx/ssl/key.pem
sudo systemctl reload nginx
```

```bash
sudo chmod +x /usr/local/bin/fcs-renew-ssl.sh
```

### Add Cron Job
```bash
sudo crontab -e
```

Add line:
```
0 2 * * * /usr/local/bin/fcs-renew-ssl.sh
```

## Phase 7: Security Hardening

### 1. Firewall Setup
```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp  # Only if external DB access needed
sudo ufw status
```

### 2. Fail2Ban (Intrusion Prevention)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Configure Fail2Ban
```bash
sudo nano /etc/fail2ban/jail.local
```

```
[sshd]
enabled = true
maxretry = 5
findtime = 3600
bantime = 3600

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true
```

```bash
sudo systemctl restart fail2ban
```

### 4. SSH Key Authentication
```bash
# Generate key on local machine
ssh-keygen -t ed25519 -N "" -f ~/.ssh/fcs_vm

# Copy to VM
ssh-copy-id -i ~/.ssh/fcs_vm.pub username@vm-ip

# Disable password auth
sudo nano /etc/ssh/sshd_config
```

Find and change:
```
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
sudo systemctl restart ssh
```

## Phase 8: Monitoring

### 1. System Resource Monitoring
```bash
# CPU, Memory, Disk
top
htop
df -h
du -sh /opt/fcs

# Network
netstat -tulpn
ss -tulpn
```

### 2. Docker Monitoring
```bash
docker stats
docker-compose -f docker/docker-compose.yml ps
```

### 3. Database Monitoring
```bash
docker-compose -f docker/docker-compose.yml exec postgres psql -U fcs_user -d fcs_db -c "\dt"
```

## Troubleshooting

### Port Already in Use
```bash
lsof -i :8000
lsof -i :3000
kill -9 <PID>
```

### Database Connection Error
```bash
# Test connection
docker-compose -f docker/docker-compose.yml exec postgres psql -U fcs_user -d fcs_db
```

### CORS Errors
Update `CORS_ORIGINS` in `backend/.env`:
```
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]
```

Then restart:
```bash
docker-compose -f docker/docker-compose.yml restart backend
```

### Check Backend Health
```bash
curl -k https://localhost:8000/health
```

### Check Frontend Access
```bash
curl -k https://localhost/
```

## Production Checklist

- [ ] Changed SECRET_KEY to random value
- [ ] Set ENVIRONMENT=production
- [ ] Set DEBUG=false
- [ ] Generated SSL certificates (Let's Encrypt or other)
- [ ] Updated CORS_ORIGINS with real domain
- [ ] Configured email SMTP credentials
- [ ] Set up database backups
- [ ] Enabled firewall and fail2ban
- [ ] Configured fail2ban for brute-force protection
- [ ] Set up log rotation
- [ ] Enabled SSL auto-renewal
- [ ] Set up monitoring/alerting
- [ ] Tested database backup/restore
- [ ] Documented admin procedures
- [ ] Set up audit log monitoring

## Performance Optimization

### 1. Database Optimization
```bash
# Connect to DB
docker-compose exec postgres psql -U fcs_user -d fcs_db

# Check index usage
SELECT schemaname, tablename, indexname FROM pg_indexes;

# Vacuum DB
VACUUM ANALYZE;
```

### 2. Cache Configuration
Redis is running for session/cache management.

### 3. Rate Limiting
Adjust in `backend/.env`:
```
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60
```

## Next Steps

1. Test the application at https://yourdomain.com
2. Create admin account
3. Monitor logs for errors
4. Set up regular backups
5. Plan maintenance windows
6. Document runbooks for your team

---

For issues, check logs with:
```bash
docker-compose -f docker/docker-compose.yml logs backend
```
