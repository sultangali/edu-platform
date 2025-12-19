#!/bin/bash

# =============================================
# Complete Production Setup Script
# Configures SSL, CORS, Environment, and deploys
# =============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_NAME="edu-platform"
APP_DIR="/var/www/$APP_NAME"
NGINX_SITE="/etc/nginx/sites-available/$APP_NAME"
SERVER_IP="34.88.163.32"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          Complete Production Setup                          ║"
echo "║          Server: $SERVER_IP                           ║"
echo "║                                                              ║"
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# =============================================
# STEP 1: Check project files
# =============================================
print_step "1/8 - Checking project files..."

if [ ! -f "$APP_DIR/server/package.json" ]; then
    print_error "Server files not found in $APP_DIR/server/"
    echo -e "${YELLOW}Please copy project files first!${NC}"
    exit 1
fi

if [ ! -f "$APP_DIR/client/package.json" ]; then
    print_error "Client files not found in $APP_DIR/client/"
    exit 1
fi

print_success "Project files found!"

# =============================================
# STEP 2: Create/Update Environment Files
# =============================================
print_step "2/8 - Creating environment files..."

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 64)

# Server .env
sudo tee "$APP_DIR/server/.env" > /dev/null <<ENV_SERVER
# Production Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://localhost:27017/edu-platform

# JWT (Auto-generated)
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Email (Configure these!)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=EduPlatform <noreply@eduplatform.com>

# Google OAuth (Configure these!)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://$SERVER_IP/api/auth/google/callback

# Gemini AI (Configure this!)
GEMINI_API_KEY=your-gemini-api-key

# Frontend URL (HTTPS)
CLIENT_URL=https://$SERVER_IP

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_PATH=uploads
ENV_SERVER

# Client .env
sudo tee "$APP_DIR/client/.env" > /dev/null <<ENV_CLIENT
# Production Client Configuration
VITE_API_URL=https://$SERVER_IP/api
VITE_SERVER_URL=https://$SERVER_IP
ENV_CLIENT

print_success "Environment files created!"
echo -e "  ${BLUE}Server .env: $APP_DIR/server/.env${NC}"
echo -e "  ${BLUE}Client .env: $APP_DIR/client/.env${NC}"
print_warning "Remember to update email and OAuth settings in server/.env!"

# =============================================
# STEP 3: Install Dependencies
# =============================================
print_step "3/8 - Installing dependencies..."

cd "$APP_DIR/server"
npm install --production --legacy-peer-deps 2>/dev/null || npm install --production

cd "$APP_DIR/client"
npm install --legacy-peer-deps 2>/dev/null || npm install

print_success "Dependencies installed!"

# =============================================
# STEP 4: Build Client
# =============================================
print_step "4/8 - Building client for production..."

cd "$APP_DIR/client"
npm run build

if [ ! -d "$APP_DIR/client/dist" ]; then
    print_error "Client build failed!"
    exit 1
fi

print_success "Client built successfully!"

# =============================================
# STEP 5: Setup SSL Certificate
# =============================================
print_step "5/8 - Setting up SSL certificate..."

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl
sudo mkdir -p /etc/nginx/snippets

# Generate self-signed certificate (valid for 1 year)
print_warning "Generating self-signed SSL certificate for IP: $SERVER_IP"
print_warning "Note: Let's Encrypt does NOT work with IP addresses."
print_warning "Browsers will show security warnings (click 'Advanced' -> 'Proceed')"

sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx-selfsigned.key \
    -out /etc/nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=KZ/ST=Kazakhstan/L=Almaty/O=EduPlatform/CN=$SERVER_IP" \
    -addext "subjectAltName=IP:$SERVER_IP" 2>/dev/null || \
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx-selfsigned.key \
    -out /etc/nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=KZ/ST=Kazakhstan/L=Almaty/O=EduPlatform/CN=$SERVER_IP"

sudo chmod 600 /etc/nginx/ssl/nginx-selfsigned.key
sudo chmod 644 /etc/nginx/ssl/nginx-selfsigned.crt

# Create SSL snippet
sudo tee /etc/nginx/snippets/self-signed.conf > /dev/null <<SSL_CONF
ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
SSL_CONF

print_success "SSL certificate created!"

# =============================================
# STEP 6: Configure Nginx with HTTPS
# =============================================
print_step "6/8 - Configuring Nginx with HTTPS..."

# Backup existing config
if [ -f "$NGINX_SITE" ]; then
    sudo cp "$NGINX_SITE" "$NGINX_SITE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create complete Nginx config with HTTPS
sudo tee "$NGINX_SITE" > /dev/null <<'NGINX_CONFIG'
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name 34.88.163.32;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name 34.88.163.32;
    
    # SSL
    include /etc/nginx/snippets/self-signed.conf;
    
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
    
    # Uploads - serve directly
    location /uploads {
        alias /var/www/edu-platform/server/uploads;
        expires 7d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "https://34.88.163.32";
        
        location ~* \.(jpg|jpeg|png|gif|svg|webp|mp4|webm|ogg|mp3|wav|pdf|doc|docx)$ {
            add_header X-Content-Type-Options nosniff;
            access_log off;
        }
        
        location ~ /\. {
            deny all;
        }
    }
    
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
    
    # Health check
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
NGINX_CONFIG

# Enable site
sudo ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t
if [ $? -ne 0 ]; then
    print_error "Nginx configuration test failed!"
    exit 1
fi

sudo systemctl reload nginx
print_success "Nginx configured with HTTPS!"

# =============================================
# STEP 7: Setup Uploads Directory
# =============================================
print_step "7/8 - Setting up uploads directory..."

cd "$APP_DIR/server"
sudo mkdir -p uploads/{avatars,courses/{thumbnails,videos,audio,images,files},assignments,chat}
sudo chown -R $USER:www-data uploads
sudo find uploads -type d -exec chmod 775 {} \;
sudo find uploads -type f -exec chmod 664 {} \;
sudo chmod g+s uploads
sudo find uploads -type d -exec chmod g+s {} \;

print_success "Uploads directory configured!"

# =============================================
# STEP 8: Start Application with PM2
# =============================================
print_step "8/8 - Starting application with PM2..."

cd "$APP_DIR"

# Stop existing if running
pm2 delete $APP_NAME 2>/dev/null || true

# Check if ecosystem config exists
if [ -f "$APP_DIR/ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
else
    # Start directly
    cd "$APP_DIR/server"
    pm2 start index.js --name $APP_NAME --env production
fi

# Save PM2 process list
pm2 save

# Show status
sleep 2
pm2 status

print_success "Application started!"

# =============================================
# FINAL SUMMARY
# =============================================
echo -e "\n${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ✅ DEPLOYMENT COMPLETE!                            ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Your application is now available at:${NC}"
echo -e "  ${CYAN}https://$SERVER_IP${NC}"
echo ""
echo -e "${YELLOW}⚠️  First time accessing:${NC}"
echo -e "  1. Browser will show security warning (self-signed certificate)"
echo -e "  2. Click 'Advanced' or 'Show Details'"
echo -e "  3. Click 'Proceed to $SERVER_IP' or 'Accept the Risk'"
echo ""
echo -e "${YELLOW}Important! Configure these in $APP_DIR/server/.env:${NC}"
echo -e "  • SMTP_USER and SMTP_PASS (for email)"
echo -e "  • GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (for OAuth)"
echo -e "  • GEMINI_API_KEY (for AI features)"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo -e "  pm2 status                    - Check app status"
echo -e "  pm2 logs edu-platform         - View logs"
echo -e "  pm2 restart edu-platform      - Restart app"
echo -e "  sudo nginx -t                 - Test nginx config"
echo -e "  sudo systemctl reload nginx   - Reload nginx"
echo ""

