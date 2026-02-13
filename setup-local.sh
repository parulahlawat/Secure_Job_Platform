#!/bin/bash
# Local development setup (without Docker)

set -e

echo "🚀 Setting up FCS for local development"

# Backend setup
echo "📦 Setting up backend..."
cd backend
python -m venv venv

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

pip install -r requirements.txt

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please update backend/.env with your database credentials"
fi

cd ..

# Frontend setup
echo "📦 Setting up frontend..."
cd frontend
npm install
cd ..

echo "✅ Setup complete!"
echo ""
echo "📋 To start development:"
echo "1. Terminal 1 - Backend:"
echo "   cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "2. Terminal 2 - Frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Terminal 3 - PostgreSQL:"
echo "   postgres -D /usr/local/var/postgres  (or your PostgreSQL path)"
