#!/bin/bash

# =============================================
# EduPlatform Application Setup Script
# Run this after deploy.sh and copying files
# =============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="edu-platform"
APP_DIR="/var/www/$APP_NAME"

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   EduPlatform Application Setup${NC}"
echo -e "${BLUE}==============================================${NC}"

print_step() {
    echo -e "\n${GREEN}[STEP]${NC} $1"
}

cd $APP_DIR

# =============================================
# STEP 0: Check if project files exist
# =============================================
if [ ! -f "$APP_DIR/server/package.json" ]; then
    echo -e "${RED}Error: Project files not found!${NC}"
    echo -e "${YELLOW}Please copy your project files to $APP_DIR first.${NC}"
    echo -e "${YELLOW}You can use the upload-to-server.sh script or git clone.${NC}"
    exit 1
fi

# =============================================
# STEP 1: Install Server Dependencies
# =============================================
print_step "Installing server dependencies..."
cd $APP_DIR/server
npm install --production

# =============================================
# STEP 2: Install Client Dependencies & Build
# =============================================
print_step "Installing client dependencies..."
cd $APP_DIR/client
npm install

print_step "Building client for production..."
npm run build

# =============================================
# STEP 3: Create Upload Directories with Proper Permissions
# =============================================
print_step "Creating upload directories with proper permissions..."
cd $APP_DIR/server

# Create all upload subdirectories
sudo mkdir -p uploads/avatars
sudo mkdir -p uploads/courses/thumbnails
sudo mkdir -p uploads/courses/videos
sudo mkdir -p uploads/courses/audio
sudo mkdir -p uploads/courses/images
sudo mkdir -p uploads/courses/files
sudo mkdir -p uploads/assignments
sudo mkdir -p uploads/chat

# Ensure user is in www-data group
sudo usermod -a -G www-data $USER 2>/dev/null || true

# Set ownership: current user owns, www-data group can access
sudo chown -R $USER:www-data uploads

# Set permissions: 775 for directories (rwxrwxr-x), 664 for files (rw-rw-r--)
sudo find uploads -type d -exec chmod 775 {} \;
sudo find uploads -type f -exec chmod 664 {} \;

# Set setgid bit so new files inherit group ownership
sudo chmod g+s uploads
sudo find uploads -type d -exec chmod g+s {} \;

echo -e "${BLUE}  ✓ Uploads directory configured with proper permissions${NC}"
echo -e "${BLUE}  ✓ User $USER has write access${NC}"
echo -e "${BLUE}  ✓ Nginx (www-data) has read access${NC}"

# =============================================
# STEP 4: Start Application with PM2
# =============================================
print_step "Starting application with PM2..."
cd $APP_DIR

# Stop existing if running
pm2 delete $APP_NAME 2>/dev/null || true

# Start with ecosystem config
pm2 start ecosystem.config.cjs --env production

# Save PM2 process list
pm2 save

# =============================================
# STEP 5: Verify
# =============================================
print_step "Verifying deployment..."
sleep 3
pm2 status

echo -e "\n${GREEN}==============================================${NC}"
echo -e "${GREEN}   Application Setup Complete!${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "\n${YELLOW}Your application is now running at:${NC}"
echo -e "${BLUE}http://34.88.163.32${NC}"
echo -e "\n${YELLOW}Useful commands:${NC}"
echo -e "  pm2 status           - Check app status"
echo -e "  pm2 logs $APP_NAME   - View logs"
echo -e "  pm2 restart $APP_NAME - Restart app"
echo -e "  pm2 monit            - Monitor app"
echo ""

