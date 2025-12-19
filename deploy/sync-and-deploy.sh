#!/bin/bash

# =============================================
# Sync files and deploy to server
# Run this from your LOCAL machine
# =============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SERVER_IP="34.88.163.32"
SERVER_USER="${1:-gab1m1ll3r}"  # Default user, can be passed as argument
LOCAL_PROJECT_PATH="$(dirname "$(dirname "$(readlink -f "$0")")")"
REMOTE_PATH="/var/www/edu-platform"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          Sync and Deploy to Production                      ║"
echo "║          Server: $SERVER_IP                           ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}Local path:${NC} $LOCAL_PROJECT_PATH"
echo -e "${BLUE}Remote:${NC} $SERVER_USER@$SERVER_IP:$REMOTE_PATH"
echo ""

read -p "Continue with sync? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# =============================================
# STEP 1: Sync files to server
# =============================================
echo -e "\n${GREEN}[1/3]${NC} Syncing files to server..."

# Check if rsync is available
if command -v rsync &> /dev/null; then
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '*.log' \
        --exclude 'client/dist' \
        --exclude 'server/uploads/*' \
        --exclude '.env' \
        --exclude 'client/.env' \
        --exclude 'server/.env' \
        "$LOCAL_PROJECT_PATH/" \
        "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"
else
    echo -e "${YELLOW}rsync not found, using scp...${NC}"
    scp -r "$LOCAL_PROJECT_PATH"/* "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"
fi

echo -e "${GREEN}✓ Files synced!${NC}"

# =============================================
# STEP 2: Set permissions
# =============================================
echo -e "\n${GREEN}[2/3]${NC} Setting permissions..."
ssh "$SERVER_USER@$SERVER_IP" "chmod +x $REMOTE_PATH/deploy/*.sh"
echo -e "${GREEN}✓ Permissions set!${NC}"

# =============================================
# STEP 3: Run complete setup
# =============================================
echo -e "\n${GREEN}[3/3]${NC} Running complete setup on server..."
ssh -t "$SERVER_USER@$SERVER_IP" "cd $REMOTE_PATH/deploy && ./complete-setup.sh"

echo -e "\n${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ✅ Deployment Complete!                            ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Your site is available at:${NC}"
echo -e "  ${CYAN}https://$SERVER_IP${NC}"
echo ""

