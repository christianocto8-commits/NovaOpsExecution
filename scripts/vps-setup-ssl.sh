#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${NOVAOPS_DOMAIN:-nova-ops.cloud}"
EMAIL="${NOVAOPS_SSL_EMAIL:-admin@novaops.com}"
ROOT="/opt/NovaOpsExecution"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

mkdir -p /var/www/certbot

if [ ! -f "$CERT_PATH" ]; then
  echo "Issuing certificate for ${DOMAIN}..."
  cp "${ROOT}/deploy/nginx/novaops-vps-http-bootstrap.conf" /etc/nginx/sites-available/novaops
  ln -sf /etc/nginx/sites-available/novaops /etc/nginx/sites-enabled/novaops
  nginx -t
  systemctl reload nginx

  certbot certonly --webroot \
    -w /var/www/certbot \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring
fi

cp "${ROOT}/deploy/nginx/novaops-vps-ssl.conf" /etc/nginx/sites-available/novaops
ln -sf /etc/nginx/sites-available/novaops /etc/nginx/sites-enabled/novaops
nginx -t
systemctl reload nginx

echo "SSL active for https://${DOMAIN}"
