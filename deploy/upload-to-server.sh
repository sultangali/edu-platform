#!/bin/bash

# =============================================
# Upload Project to VPS Script
# Run this from your LOCAL machine
# =============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - CHANGE THESE
SERVER_IP="34.88.163.32"
SERVER_USER="your_username"  # Change to your VPS username
LOCAL_PROJECT_PATH="/home/sultangali/Documents/edu-platform"
REMOTE_PATH="/var/www/edu-platform"

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   Upload EduPlatform to VPS${NC}"
echo -e "${BLUE}   Server: $SERVER_IP${NC}"
echo -e "${BLUE}==============================================${NC}"

# Check if user changed the username
if [ "$SERVER_USER" = "your_username" ]; then
    echo -e "${YELLOW}Please edit this script and set SERVER_USER to your VPS username${NC}"
    read -p "Enter your VPS username: " SERVER_USER
fi

echo -e "\n${GREEN}[1/4]${NC} Creating remote directory..."
ssh $SERVER_USER@$SERVER_IP "sudo mkdir -p $REMOTE_PATH && sudo chown -R \$USER:\$USER $REMOTE_PATH"

echo -e "\n${GREEN}[2/4]${NC} Uploading project files..."
echo -e "${YELLOW}This may take a few minutes...${NC}"

# Upload everything except node_modules
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude 'client/dist' \
    --exclude 'server/uploads/*' \
    "$LOCAL_PROJECT_PATH/" \
    "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"

echo -e "\n${GREEN}[3/4]${NC} Setting permissions..."
ssh $SERVER_USER@$SERVER_IP "chmod +x $REMOTE_PATH/deploy/*.sh"

echo -e "\n${GREEN}[4/4]${NC} Upload complete!"

echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}                     NEXT STEPS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "1. ${BLUE}Connect to your server:${NC}"
echo -e "   ${GREEN}ssh $SERVER_USER@$SERVER_IP${NC}"
echo ""
echo -e "2. ${BLUE}Run the deployment script:${NC}"
echo -e "   ${GREEN}cd $REMOTE_PATH/deploy${NC}"
echo -e "   ${GREEN}./full-deploy.sh${NC}"
echo ""
echo -e "3. ${BLUE}Configure environment:${NC}"
echo -e "   ${GREEN}cp $REMOTE_PATH/deploy/server.env.example $REMOTE_PATH/server/.env${NC}"
echo -e "   ${GREEN}nano $REMOTE_PATH/server/.env${NC}"
echo ""
echo -e "4. ${BLUE}Setup the application:${NC}"
echo -e "   ${GREEN}./setup-app.sh${NC}"
echo ""

