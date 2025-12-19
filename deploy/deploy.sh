#!/bin/bash

# =============================================
# EduPlatform Deployment Script
# Target: Ubuntu 25.04 VPS (34.88.163.32)
# =============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="34.88.163.32"
APP_NAME="edu-platform"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="$SERVER_IP"  # Using IP instead of domain

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   EduPlatform Deployment Script${NC}"
echo -e "${BLUE}   Target: $SERVER_IP${NC}"
echo -e "${BLUE}==============================================${NC}"

# Function to print step
print_step() {
    echo -e "\n${GREEN}[STEP]${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================
# STEP 1: System Update
# =============================================
print_step "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# =============================================
# STEP 2: Install Required Packages
# =============================================
print_step "Installing required packages..."
sudo apt install -y curl wget git build-essential nginx rsync

# =============================================
# STEP 3: Install Node.js (v20 LTS)
# =============================================
print_step "Installing Node.js v20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# =============================================
# STEP 4: Install MongoDB
# =============================================
print_step "Installing MongoDB..."
if ! command -v mongod &> /dev/null; then
    # Import MongoDB public GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
       sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    
    # Add MongoDB repository
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
       sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    sudo apt update
    sudo apt install -y mongodb-org
    
    # Start and enable MongoDB
    sudo systemctl start mongod
    sudo systemctl enable mongod
fi
echo "MongoDB status: $(sudo systemctl is-active mongod)"

# =============================================
# STEP 5: Install PM2
# =============================================
print_step "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
echo "PM2 version: $(pm2 -v)"

# =============================================
# STEP 6: Create Application Directory
# =============================================
print_step "Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# =============================================
# STEP 7: Create PM2 Log Directory
# =============================================
print_step "Creating PM2 log directory..."
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# =============================================
# STEP 8: Configure Nginx
# =============================================
print_step "Configuring Nginx..."

# Create Nginx config
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_IP;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Max upload size
    client_max_body_size 50M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
    gzip_disable "MSIE [1-6]\.";
    
    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }
    
    # Uploads proxy
    location /uploads {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Cache static files
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # Static files (React build)
    location / {
        root $APP_DIR/client/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx

echo "Nginx configured successfully!"

# =============================================
# STEP 9: Configure Firewall
# =============================================
print_step "Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    echo "Firewall configured!"
else
    print_warning "ufw not found, installing..."
    sudo apt install -y ufw
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    echo "Firewall configured!"
fi

# =============================================
# STEP 10: Setup PM2 Startup
# =============================================
print_step "Setting up PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# =============================================
# DONE
# =============================================
echo -e "\n${GREEN}==============================================${NC}"
echo -e "${GREEN}   System Setup Complete!${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Copy your project files to: ${BLUE}$APP_DIR${NC}"
echo -e "2. Configure your .env file in: ${BLUE}$APP_DIR/server/.env${NC}"
echo -e "3. Run the application setup script: ${BLUE}./setup-app.sh${NC}"
echo ""

