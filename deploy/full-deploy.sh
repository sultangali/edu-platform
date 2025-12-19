#!/bin/bash

# =============================================
# EduPlatform FULL Deployment Script
# One-click deployment for fresh Ubuntu 25.04 VPS
# IP: 34.88.163.32
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
APP_NAME="edu-platform"
APP_DIR="/var/www/$APP_NAME"
GITHUB_REPO=""  # Set if using git clone

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     ███████╗██████╗ ██╗   ██╗██████╗ ██╗      █████╗ ████████╗║"
echo "║     ██╔════╝██╔══██╗██║   ██║██╔══██╗██║     ██╔══██╗╚══██╔══╝║"
echo "║     █████╗  ██║  ██║██║   ██║██████╔╝██║     ███████║   ██║   ║"
echo "║     ██╔══╝  ██║  ██║██║   ██║██╔═══╝ ██║     ██╔══██║   ██║   ║"
echo "║     ███████╗██████╔╝╚██████╔╝██║     ███████╗██║  ██║   ██║   ║"
echo "║     ╚══════╝╚═════╝  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ║"
echo "║                                                              ║"
echo "║              Full Deployment Script v1.0                     ║"
echo "║              Target: $SERVER_IP                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

print_step() {
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}[STEP]${NC} $1"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================
# STEP 1: System Update
# =============================================
print_step "1/10 - Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated!"

# =============================================
# STEP 2: Install Essential Packages
# =============================================
print_step "2/10 - Installing essential packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip
print_success "Essential packages installed!"

# =============================================
# STEP 3: Install Node.js 20 LTS
# =============================================
print_step "3/10 - Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo -e "  Node.js: ${BLUE}$(node -v)${NC}"
echo -e "  NPM: ${BLUE}$(npm -v)${NC}"
print_success "Node.js installed!"

# =============================================
# STEP 4: Install MongoDB 7.0
# =============================================
print_step "4/10 - Installing MongoDB 7.0..."
if ! command -v mongod &> /dev/null; then
    # Import MongoDB GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    
    # Add repository (using jammy for compatibility)
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    sudo apt update
    sudo apt install -y mongodb-org
    
    # Start and enable
    sudo systemctl start mongod
    sudo systemctl enable mongod
fi

# Wait for MongoDB to start
sleep 2
echo -e "  MongoDB status: ${BLUE}$(sudo systemctl is-active mongod)${NC}"
print_success "MongoDB installed and running!"

# =============================================
# STEP 5: Install Nginx
# =============================================
print_step "5/10 - Installing Nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx
echo -e "  Nginx status: ${BLUE}$(sudo systemctl is-active nginx)${NC}"
print_success "Nginx installed!"

# =============================================
# STEP 6: Install PM2
# =============================================
print_step "6/10 - Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
echo -e "  PM2 version: ${BLUE}$(pm2 -v)${NC}"
print_success "PM2 installed!"

# =============================================
# STEP 7: Create Directories
# =============================================
print_step "7/10 - Creating directories..."
sudo mkdir -p $APP_DIR
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER $APP_DIR
sudo chown -R $USER:$USER /var/log/pm2

# Create uploads directory with proper permissions for nginx access
print_step "7.1/10 - Setting up uploads directory permissions..."
sudo mkdir -p $APP_DIR/server/uploads
sudo mkdir -p $APP_DIR/server/uploads/{avatars,courses/{thumbnails,videos,audio,images,files},assignments,chat}

# Add user to www-data group (nginx group)
sudo usermod -a -G www-data $USER || true

# Set ownership: user owns, www-data group can read
sudo chown -R $USER:www-data $APP_DIR/server/uploads

# Set permissions: 775 for directories (rwxrwxr-x), 664 for files (rw-rw-r--)
sudo find $APP_DIR/server/uploads -type d -exec chmod 775 {} \;
sudo find $APP_DIR/server/uploads -type f -exec chmod 664 {} \;

# Set default permissions for new files/directories (setgid bit)
sudo chmod g+s $APP_DIR/server/uploads
sudo find $APP_DIR/server/uploads -type d -exec chmod g+s {} \;

print_success "Directories created with proper permissions!"

# =============================================
# STEP 8: Configure Nginx
# =============================================
print_step "8/10 - Configuring Nginx..."

sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<'NGINX_EOF'
server {
    listen 80;
    server_name 34.88.163.32;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Max upload size (50MB)
    client_max_body_size 50M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json image/svg+xml;
    gzip_disable "MSIE [1-6]\.";
    
    # API proxy to Node.js server
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Uploads - serve directly from filesystem (more efficient)
    # Files are accessible by nginx user (www-data) due to proper permissions
    location /uploads {
        alias /var/www/edu-platform/server/uploads;
        expires 7d;
        add_header Cache-Control "public, immutable";
        
        # Security: only serve specific file types
        location ~* \.(jpg|jpeg|png|gif|svg|webp|mp4|webm|ogg|mp3|wav|pdf|doc|docx)$ {
            add_header X-Content-Type-Options nosniff;
            access_log off;
        }
        
        # Deny access to hidden files
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }
    }
    
    # Alternative: Proxy uploads to Node.js (if you need access control)
    # Uncomment below and comment above if you want Node.js to handle all upload requests
    # location /uploads {
    #     proxy_pass http://127.0.0.1:5000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     proxy_set_header X-Forwarded-Proto $scheme;
    #     expires 7d;
    #     add_header Cache-Control "public, immutable";
    # }
    
    # React SPA - serve static files
    location / {
        root /var/www/edu-platform/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
        
        # Don't cache HTML
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
print_success "Nginx configured!"

# =============================================
# STEP 9: Configure Firewall
# =============================================
print_step "9/10 - Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    echo "y" | sudo ufw enable
    print_success "Firewall configured!"
else
    print_warning "ufw not found, installing..."
    sudo apt install -y ufw
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    echo "y" | sudo ufw enable
    print_success "Firewall configured!"
fi

# =============================================
# STEP 10: Setup PM2 Startup
# =============================================
print_step "10/10 - Setting up PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true
print_success "PM2 startup configured!"

# =============================================
# FINAL SUMMARY
# =============================================
echo -e "\n${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ✅ SYSTEM SETUP COMPLETE!                          ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}                     NEXT STEPS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "1. ${BLUE}Copy your project files to the server:${NC}"
echo -e "   ${CYAN}scp -r /path/to/edu-platform/* user@$SERVER_IP:$APP_DIR/${NC}"
echo ""
echo -e "2. ${BLUE}Configure environment variables:${NC}"
echo -e "   ${CYAN}nano $APP_DIR/server/.env${NC}"
echo ""
echo -e "3. ${BLUE}Run the application setup:${NC}"
echo -e "   ${CYAN}cd $APP_DIR && ./deploy/setup-app.sh${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

