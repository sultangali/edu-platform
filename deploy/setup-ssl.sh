#!/bin/bash

# =============================================
# Setup HTTPS with Let's Encrypt (Certbot)
# IMPORTANT: Let's Encrypt works only with DOMAINS, not IP addresses!
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
echo "║          SSL/TLS Setup with Let's Encrypt                   ║"
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
# Check if domain is provided
# =============================================
if [ -z "$1" ]; then
    print_error "Domain name is required!"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ${CYAN}./setup-ssl.sh yourdomain.com${NC}"
    echo ""
    echo -e "${YELLOW}Important Notes:${NC}"
    echo -e "  • Let's Encrypt ${RED}does NOT work with IP addresses${NC} (like 34.88.163.32)"
    echo -e "  • You need a domain name pointing to your server"
    echo -e "  • Domain must have A record pointing to your server IP"
    echo -e "  • Ports 80 and 443 must be open in firewall"
    echo ""
    exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@$DOMAIN}"

print_warning "Let's Encrypt works ONLY with domain names, NOT IP addresses!"
print_warning "If you're using IP address (34.88.163.32), this script will NOT work."
echo ""
read -p "Do you have a domain name pointing to this server? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "You need a domain name for Let's Encrypt SSL certificates."
    echo -e "${YELLOW}Consider getting a free domain from:${NC}"
    echo -e "  • Freenom (freenom.com) - Free .tk, .ml, .ga domains"
    echo -e "  • Cloudflare Registrar"
    echo -e "  • Any domain registrar"
    exit 1
fi

# =============================================
# STEP 1: Install Certbot
# =============================================
print_step "1/6 - Installing Certbot..."

if ! command -v certbot &> /dev/null; then
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed!"
else
    echo -e "  Certbot already installed: ${BLUE}$(certbot --version)${NC}"
fi

# =============================================
# STEP 2: Check if Nginx is configured
# =============================================
print_step "2/6 - Checking Nginx configuration..."

if [ ! -f "$NGINX_SITE" ]; then
    print_error "Nginx site configuration not found!"
    echo -e "${YELLOW}Please run full-deploy.sh first to configure Nginx.${NC}"
    exit 1
fi

# Backup current nginx config
sudo cp "$NGINX_SITE" "$NGINX_SITE.backup.$(date +%Y%m%d_%H%M%S)"
print_success "Nginx config backed up"

# =============================================
# STEP 3: Update Nginx config with domain
# =============================================
print_step "3/6 - Updating Nginx configuration for domain: $DOMAIN"

# Create temporary nginx config with domain (for certbot)
sudo tee "$NGINX_SITE.tmp" > /dev/null <<NGINX_TMP
server {
    listen 80;
    server_name $DOMAIN;
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
NGINX_TMP

# Replace server_name in existing config
sudo sed -i "s/server_name .*/server_name $DOMAIN;/" "$NGINX_SITE"

# Test nginx config
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    print_success "Nginx configuration updated"
else
    print_error "Nginx configuration test failed!"
    exit 1
fi

# =============================================
# STEP 4: Obtain SSL Certificate
# =============================================
print_step "4/6 - Obtaining SSL certificate from Let's Encrypt..."

echo -e "${YELLOW}Certbot will now obtain the certificate...${NC}"
echo -e "${YELLOW}Make sure your domain $DOMAIN points to this server!${NC}"
echo ""

# Obtain certificate (certbot will automatically configure nginx)
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained and installed!"
else
    print_error "Failed to obtain SSL certificate!"
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Check that domain $DOMAIN points to this server"
    echo -e "  2. Check DNS: ${CYAN}nslookup $DOMAIN${NC}"
    echo -e "  3. Check firewall allows ports 80 and 443"
    echo -e "  4. Check nginx is running: ${CYAN}sudo systemctl status nginx${NC}"
    exit 1
fi

# =============================================
# STEP 5: Verify Certificate
# =============================================
print_step "5/6 - Verifying certificate..."

if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo -e "  Certificate location: ${BLUE}/etc/letsencrypt/live/$DOMAIN${NC}"
    echo -e "  Certificate files:"
    ls -la /etc/letsencrypt/live/$DOMAIN/ | grep -E "cert.pem|privkey.pem|chain.pem"
    print_success "Certificate verified!"
else
    print_error "Certificate directory not found!"
    exit 1
fi

# =============================================
# STEP 6: Setup Auto-renewal
# =============================================
print_step "6/6 - Setting up automatic certificate renewal..."

# Test renewal
sudo certbot renew --dry-run

if [ $? -eq 0 ]; then
    print_success "Auto-renewal test passed!"
    echo -e "${BLUE}  Certificates will auto-renew before expiration${NC}"
else
    print_warning "Auto-renewal test failed, but certificate is installed"
fi

# =============================================
# FINAL SUMMARY
# =============================================
echo -e "\n${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ✅ SSL/TLS Setup Complete!                        ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Certificate Details:${NC}"
echo -e "  Domain: ${BLUE}$DOMAIN${NC}"
echo -e "  Email: ${BLUE}$EMAIL${NC}"
echo -e "  Certificate: ${BLUE}/etc/letsencrypt/live/$DOMAIN${NC}"
echo ""
echo -e "${GREEN}Your site is now available at:${NC}"
echo -e "  ${CYAN}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  sudo certbot certificates              - List certificates"
echo -e "  sudo certbot renew                     - Renew certificates manually"
echo -e "  sudo certbot revoke -d $DOMAIN        - Revoke certificate"
echo -e "  sudo nginx -t                          - Test nginx config"
echo -e "  sudo systemctl reload nginx            - Reload nginx"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

