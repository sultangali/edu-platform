#!/bin/bash

# =============================================
# Setup Self-Signed SSL Certificate for IP Address
# Use this if you don't have a domain name
# Note: Browsers will show security warnings
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
APP_DIR="/var/www/edu-platform"
NGINX_SITE="/etc/nginx/sites-available/$APP_NAME"
SERVER_IP="${1:-34.88.163.32}"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          Self-Signed SSL Setup for IP Address               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

print_step() {
    echo -e "\n${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning "This will create a self-signed certificate."
print_warning "Browsers will show security warnings for self-signed certificates!"
print_warning "For production, consider getting a domain name and using Let's Encrypt."
echo ""
read -p "Continue with self-signed certificate? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# =============================================
# STEP 1: Install OpenSSL
# =============================================
print_step "1/4 - Installing OpenSSL..."
if ! command -v openssl &> /dev/null; then
    sudo apt update
    sudo apt install -y openssl
fi
print_success "OpenSSL ready"

# =============================================
# STEP 2: Create SSL Directory
# =============================================
print_step "2/4 - Creating SSL certificate directory..."
sudo mkdir -p /etc/nginx/ssl
print_success "SSL directory created"

# =============================================
# STEP 3: Generate Self-Signed Certificate
# =============================================
print_step "3/4 - Generating self-signed certificate..."

sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx-selfsigned.key \
    -out /etc/nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=KZ/ST=Kazakhstan/L=Almaty/O=EduPlatform/CN=$SERVER_IP" \
    -addext "subjectAltName=IP:$SERVER_IP"

sudo chmod 600 /etc/nginx/ssl/nginx-selfsigned.key
sudo chmod 644 /etc/nginx/ssl/nginx-selfsigned.crt

print_success "Self-signed certificate generated"
echo -e "  Key: ${BLUE}/etc/nginx/ssl/nginx-selfsigned.key${NC}"
echo -e "  Cert: ${BLUE}/etc/nginx/ssl/nginx-selfsigned.crt${NC}"

# =============================================
# STEP 4: Update Nginx Configuration
# =============================================
print_step "4/4 - Updating Nginx configuration for HTTPS..."

# Backup current config
sudo cp "$NGINX_SITE" "$NGINX_SITE.backup.ssl.$(date +%Y%m%d_%H%M%S)"

# Create SSL configuration
sudo tee /etc/nginx/snippets/self-signed.conf > /dev/null <<SSL_CONF
ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;

# SSL Security Settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:AES:CAMELLIA:DES-CBC3-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!aECDH:!EDH-DSS-DES-CBC3-SHA:!EDH-RSA-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_stapling off;
ssl_stapling_verify off;

# Add security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
SSL_CONF

# Update nginx site config to include HTTPS
sudo tee -a "$NGINX_SITE" > /dev/null <<NGINX_HTTPS

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $SERVER_IP;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $SERVER_IP;
    
    include /etc/nginx/snippets/self-signed.conf;
    
    # Rest of your existing configuration...
    # (The HTTP server block above will be replaced)
}
NGINX_HTTPS

print_warning "Nginx config needs manual update!"
echo -e "${YELLOW}You need to manually update $NGINX_SITE${NC}"
echo -e "${YELLOW}Move the location blocks from HTTP server to HTTPS server block${NC}"

# Test nginx config
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    print_success "Nginx configuration updated"
else
    print_warning "Nginx config test failed - manual configuration required"
fi

echo -e "\n${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ⚠️  Self-Signed Certificate Created                ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}⚠️  IMPORTANT WARNINGS:${NC}"
echo -e "  • Browsers will show security warnings"
echo -e "  • Users need to manually accept the certificate"
echo -e "  • Not recommended for production"
echo ""
echo -e "${YELLOW}For production, use a domain name with Let's Encrypt:${NC}"
echo -e "  ${CYAN}./setup-ssl.sh yourdomain.com${NC}"
echo ""
echo -e "${GREEN}Certificate location:${NC}"
echo -e "  Key: ${BLUE}/etc/nginx/ssl/nginx-selfsigned.key${NC}"
echo -e "  Cert: ${BLUE}/etc/nginx/ssl/nginx-selfsigned.crt${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

