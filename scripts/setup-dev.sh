#!/bin/bash

# CounselFlow Development Setup Script
# Run this script to set up your local development environment

set -e

echo "=========================================="
echo "  CounselFlow Development Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 20+${NC}"
    exit 1
fi

# Check npm
echo "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check MySQL (optional)
echo "Checking MySQL..."
if command -v mysql &> /dev/null; then
    echo -e "${GREEN}✓ MySQL client installed${NC}"
else
    echo -e "${YELLOW}⚠ MySQL client not found. You can use Docker instead.${NC}"
fi

# Check Docker (optional)
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${YELLOW}⚠ Docker not found. Local MySQL required.${NC}"
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file from template${NC}"
    echo -e "${YELLOW}⚠ Please edit .env with your settings${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""
echo "Creating directories..."
mkdir -p uploads
mkdir -p docs
echo -e "${GREEN}✓ Directories created${NC}"

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env with your database credentials"
echo "   nano .env"
echo ""
echo "2. Start MySQL (choose one):"
echo "   a) Use Docker:  docker-compose up -d db"
echo "   b) Use local:   mysql.server start"
echo ""
echo "3. Initialize database:"
echo "   npm run db:push"
echo ""
echo "4. Start development server:"
echo "   npm run dev"
echo ""
echo "5. Open in browser:"
echo "   http://localhost:5173"
echo ""
echo "=========================================="
