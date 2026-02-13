#!/bin/bash
# Setup script for FCS Project

set -e

echo "🚀 Setting up FCS - Secure Job Portal"

# Create necessary directories
mkdir -p uploads
mkdir -p nginx/ssl
mkdir -p logs

# Generate SSL certificates for development
if [ ! -f nginx/ssl/cert.pem ]; then
    echo "🔐 Generating self-signed SSL certificates..."
    openssl req -x509 -newkey rsa:4096 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=FCS/CN=localhost"
fi

# Copy environment file if not exists
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env..."
    cp backend/.env.example backend/.env
fi

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker/docker-compose.yml build

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your configuration"
echo "2. Run: docker-compose -f docker/docker-compose.yml up -d"
echo "3. Initialize database: docker-compose -f docker/docker-compose.yml exec backend python -m app.db"
echo "4. Visit http://localhost:3000"
