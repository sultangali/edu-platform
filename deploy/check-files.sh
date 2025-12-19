#!/bin/bash

# =============================================
# Check if project files are present
# =============================================

APP_DIR="/var/www/edu-platform"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Checking project files...${NC}"

ERRORS=0

# Check server files
if [ ! -f "$APP_DIR/server/package.json" ]; then
    echo -e "${RED}✗ server/package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ server/package.json found${NC}"
fi

# Check client files
if [ ! -f "$APP_DIR/client/package.json" ]; then
    echo -e "${RED}✗ client/package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ client/package.json found${NC}"
fi

# Check ecosystem config
if [ ! -f "$APP_DIR/ecosystem.config.cjs" ]; then
    echo -e "${YELLOW}⚠ ecosystem.config.cjs not found (will be created)${NC}"
else
    echo -e "${GREEN}✓ ecosystem.config.cjs found${NC}"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All required files are present!${NC}"
    echo -e "${GREEN}You can now run: ./setup-app.sh${NC}"
    exit 0
else
    echo -e "${RED}Missing required files!${NC}"
    echo -e "${YELLOW}Please copy your project files to $APP_DIR first.${NC}"
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  1. Use git clone: git clone <repo-url> $APP_DIR"
    echo -e "  2. Use rsync/scp to copy files from your local machine"
    exit 1
fi

