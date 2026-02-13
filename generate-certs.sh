#!/bin/bash
# Generate self-signed TLS certificates for local development
# Run this after cloning — certificates are NOT in the repo

mkdir -p certs
openssl req -x509 -newkey rsa:2048 \
  -keyout certs/server.key \
  -out certs/server.crt \
  -days 365 -nodes \
  -subj "/CN=localhost"

mkdir -p backend/certs
openssl genpkey -algorithm RSA -out backend/certs/resume_signing_private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in backend/certs/resume_signing_private.pem -out backend/certs/resume_signing_public.pem

echo "✅ Certificates generated in certs/ and backend/certs/"
echo "⚠️  These files are in .gitignore — do NOT commit them"
