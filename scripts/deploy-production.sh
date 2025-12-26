#!/bin/bash

# Production Deployment Script for AI Booking Voice Assistant
# This script ensures all services are production-ready

set -e

echo "🚀 Starting production deployment..."

# Check if production environment file exists
if [ ! -f "apps/backend/.env.production" ]; then
    echo "❌ Production environment file not found!"
    echo "Please copy apps/backend/.env.production.example to apps/backend/.env.production"
    echo "and update it with your production values."
    exit 1
fi

# Validate required environment variables
echo "🔍 Validating environment variables..."

required_vars=(
    "NODE_ENV"
    "DATABASE_URL"
    "API_KEY"
    "WIDGET_API_KEY"
    "GEMINI_API_KEY"
)

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" apps/backend/.env.production; then
        echo "❌ Required environment variable ${var} not found in .env.production"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build all applications
echo "🔨 Building applications..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Database migration (if using Prisma)
if [ -f "apps/backend/prisma/schema.prisma" ]; then
    echo "🗄️ Running database migrations..."
    cd apps/backend
    npx prisma migrate deploy
    cd ../..
fi

# Start production server
echo "🌟 Starting production server..."
NODE_ENV=production npm start

echo "✅ Production deployment completed successfully!"