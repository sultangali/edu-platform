#!/bin/bash

# =============================================
# Copy project files to /var/www/edu-platform
# Run this from your project directory
# =============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SOURCE_DIR="${1:-$(pwd)/..}"
TARGET_DIR="/var/www/edu-platform"

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   Copy Project to /var/www/edu-platform${NC}"
echo -e "${BLUE}==============================================${NC}"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}Error: Source directory not found: $SOURCE_DIR${NC}"
    exit 1
fi

# Check if source has package.json files
if [ ! -f "$SOURCE_DIR/server/package.json" ]; then
    echo -e "${RED}Error: server/package.json not found in $SOURCE_DIR${NC}"
    echo -e "${YELLOW}Please run this script from the project root or specify the correct path${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Source:${NC} $SOURCE_DIR"
echo -e "${YELLOW}Target:${NC} $TARGET_DIR"
echo ""

# Create target directory
echo -e "${GREEN}[1/3]${NC} Creating target directory..."
sudo mkdir -p $TARGET_DIR
sudo chown -R $USER:$USER $TARGET_DIR

# Copy files excluding node_modules, .git, etc.
echo -e "\n${GREEN}[2/3]${NC} Copying project files..."
echo -e "${YELLOW}This may take a few minutes...${NC}"

rsync -av --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude 'client/dist' \
    --exclude 'server/uploads/*' \
    --exclude '.env' \
    --exclude 'client/.env' \
    --exclude 'server/.env' \
    "$SOURCE_DIR/" \
    "$TARGET_DIR/"

# Set permissions
echo -e "\n${GREEN}[3/3]${NC} Setting permissions..."
sudo chown -R $USER:$USER $TARGET_DIR
chmod +x $TARGET_DIR/deploy/*.sh 2>/dev/null || true

echo -e "\n${GREEN}✓ Files copied successfully!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. ${BLUE}cd $TARGET_DIR/deploy${NC}"
echo -e "  2. ${BLUE}./check-files.sh${NC} (verify files)"
echo -e "  3. ${BLUE}./setup-app.sh${NC} (install app)"
echo ""

