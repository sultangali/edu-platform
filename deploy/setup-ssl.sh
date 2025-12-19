#!/bin/bash

# =============================================
# Complete SSL/TLS Setup Script
# Supports both Let's Encrypt (with domain) and Self-Signed (with IP)
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

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          Complete SSL/TLS Setup with Auto-Configuration     ║"
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

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root. Run as a regular user with sudo privileges."
    exit 1
fi

# =============================================
# Detect server IP
# =============================================
detect_ip() {
    # Try to get public IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "")
    
    if [ -z "$SERVER_IP" ]; then
        # Fallback to hostname -I
        SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "34.88.163.32")
    fi
    
    echo "$SERVER_IP"
}

SERVER_IP=$(detect_ip)

# =============================================
# Interactive Setup
# =============================================
echo -e "${BLUE}Detected server IP: ${CYAN}$SERVER_IP${NC}\n"

echo -e "${YELLOW}SSL Setup Options:${NC}"
echo -e "  1. ${GREEN}Let's Encrypt${NC} (requires domain name, FREE, recommended)"
echo -e "  2. ${YELLOW}Self-Signed${NC} (works with IP, browsers will show warnings)"
echo ""

read -p "Choose option (1 or 2): " ssl_option

if [ "$ssl_option" != "1" ] && [ "$ssl_option" != "2" ]; then
    print_error "Invalid option. Please choose 1 or 2."
    exit 1
fi

if [ "$ssl_option" = "1" ]; then
    # Let's Encrypt setup
    echo ""
    read -p "Enter your domain name (e.g., example.com): " DOMAIN
    
    # Check if input is an IP address
    if [[ $DOMAIN =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        print_error "Let's Encrypt does NOT work with IP addresses!"
        echo ""
        print_warning "Detected IP address: $DOMAIN"
        echo -e "${YELLOW}Let's Encrypt only works with domain names (like example.com)${NC}"
        echo ""
        read -p "Would you like to use Self-Signed certificate instead? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_selfsigned
            exit 0
        else
            echo "Aborted. Please get a domain name for Let's Encrypt."
            exit 1
        fi
    fi
    
    read -p "Enter your email for Let's Encrypt notifications: " EMAIL
    
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        print_error "Domain and email are required for Let's Encrypt!"
        exit 1
    fi
    
    print_warning "Let's Encrypt requires:"
    echo -e "  • Domain ${BLUE}$DOMAIN${NC} must point to ${BLUE}$SERVER_IP${NC}"
    echo -e "  • Ports 80 and 443 must be open"
    echo -e "  • DNS A record must be configured"
    echo ""
    read -p "Is your domain configured? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please configure your domain DNS first!"
        echo ""
        echo -e "${YELLOW}You can:${NC}"
        echo -e "  1. Configure DNS A record for $DOMAIN → $SERVER_IP"
        echo -e "  2. Wait for DNS propagation (can take up to 24 hours)"
        echo -e "  3. Or use Self-Signed certificate for now (option 2)"
        exit 1
    fi
    
    setup_letsencrypt
else
    # Self-signed setup
    echo ""
    print_warning "Self-signed certificates will show browser warnings!"
    read -p "Continue with self-signed certificate? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    setup_selfsigned
fi

# =============================================
# Function: Setup Let's Encrypt
# =============================================
setup_letsencrypt() {
    print_step "Setting up Let's Encrypt SSL for domain: $DOMAIN"
    
    # Install Certbot
    if ! command -v certbot &> /dev/null; then
        print_step "Installing Certbot..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
        print_success "Certbot installed"
    else
        echo -e "  Certbot already installed: ${BLUE}$(certbot --version)${NC}"
    fi
    
    # Check Nginx config
    if [ ! -f "$NGINX_SITE" ]; then
        print_error "Nginx configuration not found!"
        echo -e "${YELLOW}Please run full-deploy.sh first.${NC}"
        exit 1
    fi
    
    # Backup nginx config
    BACKUP_FILE="$NGINX_SITE.backup.$(date +%Y%m%d_%H%M%S)"
    sudo cp "$NGINX_SITE" "$BACKUP_FILE"
    print_success "Nginx config backed up to $BACKUP_FILE"
    
    # Update server_name in nginx config
    sudo sed -i "s/server_name .*/server_name $DOMAIN;/" "$NGINX_SITE"
    
    # Test nginx config
    sudo nginx -t
    if [ $? -ne 0 ]; then
        print_error "Nginx configuration test failed!"
        sudo cp "$BACKUP_FILE" "$NGINX_SITE"
        exit 1
    fi
    sudo systemctl reload nginx
    
    # Obtain certificate
    print_step "Obtaining SSL certificate from Let's Encrypt..."
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificate obtained and installed!"
        
        # Test renewal
        print_step "Testing certificate auto-renewal..."
        sudo certbot renew --dry-run
        print_success "Auto-renewal configured"
        
        show_success_message "$DOMAIN" "$EMAIL" "letsencrypt"
    else
        print_error "Failed to obtain SSL certificate!"
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo -e "  1. Check DNS: ${CYAN}nslookup $DOMAIN${NC}"
        echo -e "  2. Verify domain points to: ${CYAN}$SERVER_IP${NC}"
        echo -e "  3. Check firewall allows ports 80 and 443"
        sudo cp "$BACKUP_FILE" "$NGINX_SITE"
        sudo systemctl reload nginx
        exit 1
    fi
}

# =============================================
# Function: Setup Self-Signed
# =============================================
setup_selfsigned() {
    print_step "Setting up Self-Signed SSL for IP: $SERVER_IP"
    
    # Install OpenSSL
    if ! command -v openssl &> /dev/null; then
        sudo apt update
        sudo apt install -y openssl
    fi
    
    # Create SSL directory
    sudo mkdir -p /etc/nginx/ssl
    
    # Generate certificate
    print_step "Generating self-signed certificate..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/nginx-selfsigned.key \
        -out /etc/nginx/ssl/nginx-selfsigned.crt \
        -subj "/C=KZ/ST=Kazakhstan/L=Almaty/O=EduPlatform/CN=$SERVER_IP" \
        -addext "subjectAltName=IP:$SERVER_IP"
    
    sudo chmod 600 /etc/nginx/ssl/nginx-selfsigned.key
    sudo chmod 644 /etc/nginx/ssl/nginx-selfsigned.crt
    print_success "Self-signed certificate generated"
    
    # Create SSL configuration snippet
    sudo tee /etc/nginx/snippets/self-signed.conf > /dev/null <<SSL_CONF
ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;

add_header Strict-Transport-Security "max-age=31536000" always;
SSL_CONF
    
    # Backup and update nginx config
    BACKUP_FILE="$NGINX_SITE.backup.ssl.$(date +%Y%m%d_%H%M%S)"
    sudo cp "$NGINX_SITE" "$BACKUP_FILE"
    
    # Update nginx config with HTTPS
    print_step "Updating Nginx configuration for HTTPS..."
    
    # Check if HTTPS already configured
    if grep -q "listen 443" "$NGINX_SITE"; then
        print_warning "HTTPS already configured in nginx!"
    else
        # Create full HTTPS config
        sudo tee "$NGINX_SITE" > /dev/null <<NGINX_HTTPS
# HTTP redirect to HTTPS
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
    gzip_disable "MSIE [1-6]\\.";
    
    # API proxy to Node.js server
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
        proxy_send_timeout 300;
    }
    
    # Uploads - serve directly from filesystem
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
    
    # React SPA - serve static files
    location / {
        root /var/www/edu-platform/client/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
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
NGINX_HTTPS
        print_success "Nginx configuration updated with HTTPS"
    fi
    
    # Test and reload nginx
    sudo nginx -t
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        print_success "Nginx configured for HTTPS"
    else
        print_error "Nginx configuration test failed!"
        sudo cp "$BACKUP_FILE" "$NGINX_SITE"
        exit 1
    fi
    
    show_success_message "$SERVER_IP" "" "selfsigned"
}

# =============================================
# Function: Show success message
# =============================================
show_success_message() {
    local host="$1"
    local email="$2"
    local cert_type="$3"
    
    echo -e "\n${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║          ✅ SSL/TLS Setup Complete!                         ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${GREEN}Your site is now available at:${NC}"
    if [ "$cert_type" = "letsencrypt" ]; then
        echo -e "  ${CYAN}https://$host${NC}"
        echo -e "  ${CYAN}http://$host${NC} (redirects to HTTPS)"
        echo ""
        echo -e "${GREEN}Certificate:${NC}"
        echo -e "  Type: ${BLUE}Let's Encrypt${NC}"
        echo -e "  Location: ${BLUE}/etc/letsencrypt/live/$host${NC}"
        echo -e "  Email: ${BLUE}$email${NC}"
        echo -e "  Auto-renewal: ${GREEN}Enabled${NC}"
    else
        echo -e "  ${CYAN}https://$host${NC}"
        echo -e "  ${CYAN}http://$host${NC} (redirects to HTTPS)"
        echo ""
        echo -e "${YELLOW}⚠️  Self-Signed Certificate:${NC}"
        echo -e "  • Browsers will show security warnings"
        echo -e "  • Users must manually accept the certificate"
        echo -e "  • Not recommended for production"
        echo -e "  • Certificate: ${BLUE}/etc/nginx/ssl/nginx-selfsigned.crt${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    if [ "$cert_type" = "letsencrypt" ]; then
        echo -e "  sudo certbot certificates              - List certificates"
        echo -e "  sudo certbot renew                     - Renew manually"
        echo -e "  sudo certbot revoke -d $host          - Revoke certificate"
    fi
    echo -e "  sudo nginx -t                          - Test nginx config"
    echo -e "  sudo systemctl reload nginx            - Reload nginx"
    echo ""
}
