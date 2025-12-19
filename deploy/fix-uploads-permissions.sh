#!/bin/bash

# =============================================
# Fix Uploads Directory Permissions Script
# Run this if you have issues with file uploads
# =============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/var/www/edu-platform"

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   Fix Uploads Directory Permissions${NC}"
echo -e "${BLUE}==============================================${NC}"

if [ ! -d "$APP_DIR/server/uploads" ]; then
    echo -e "${RED}Error: Uploads directory not found!${NC}"
    echo -e "Please run setup-app.sh first."
    exit 1
fi

echo -e "\n${YELLOW}Current user: $USER${NC}"
echo -e "${YELLOW}Current groups: $(groups $USER)${NC}"

# Add user to www-data group if not already
echo -e "\n${GREEN}[1/3]${NC} Ensuring user is in www-data group..."
sudo usermod -a -G www-data $USER 2>/dev/null || true

# Create all necessary subdirectories
echo -e "\n${GREEN}[2/3]${NC} Creating upload subdirectories..."
cd $APP_DIR/server
sudo mkdir -p uploads/avatars
sudo mkdir -p uploads/courses/thumbnails
sudo mkdir -p uploads/courses/videos
sudo mkdir -p uploads/courses/audio
sudo mkdir -p uploads/courses/images
sudo mkdir -p uploads/courses/files
sudo mkdir -p uploads/assignments
sudo mkdir -p uploads/chat

# Set ownership
echo -e "\n${GREEN}[3/3]${NC} Setting ownership and permissions..."
sudo chown -R $USER:www-data uploads

# Set directory permissions (775 = rwxrwxr-x)
sudo find uploads -type d -exec chmod 775 {} \;

# Set file permissions (664 = rw-rw-r--)
sudo find uploads -type f -exec chmod 664 {} \;

# Set setgid bit so new files inherit group ownership
sudo chmod g+s uploads
sudo find uploads -type d -exec chmod g+s {} \;

echo -e "\n${GREEN}✓ Permissions fixed!${NC}"
echo -e "\n${YELLOW}Verification:${NC}"
ls -la uploads | head -10

echo -e "\n${YELLOW}Note:${NC} You may need to log out and log back in for group changes to take effect."
echo -e "${YELLOW}Or run:${NC} newgrp www-data"

