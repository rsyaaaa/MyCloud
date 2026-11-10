#!/usr/bin/env bash
set -e

# Automated Nginx Setup for MyCloud
# Run with: sudo bash nginx/setup_nginx.sh

echo "=========================================================="
echo "           MyCloud Nginx Reverse Proxy Setup             "
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "[-] Script ini harus dijalankan dengan hak akses root / sudo."
  echo "    Silakan jalankan: sudo bash nginx/setup_nginx.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_SOURCE="$SCRIPT_DIR/mycloud.conf"

if [ ! -f "$CONF_SOURCE" ]; then
  echo "[-] File konfigurasi $CONF_SOURCE tidak ditemukan!"
  exit 1
fi

echo "[1/5] Memeriksa dan menginstal paket Nginx..."
if ! command -v nginx &> /dev/null; then
  apt-get update -y
  apt-get install -y nginx
else
  echo "      Nginx sudah terpasang."
fi

echo "[2/5] Memasang konfigurasi MyCloud ke /etc/nginx/sites-available/mycloud..."
cp "$CONF_SOURCE" /etc/nginx/sites-available/mycloud

echo "[3/5] Mengaktifkan konfigurasi di sites-enabled..."
# Nonaktifkan default site jika ada agar port 80 langsung mengarah ke MyCloud
if [ -L /etc/nginx/sites-enabled/default ] || [ -f /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
fi

ln -sf /etc/nginx/sites-available/mycloud /etc/nginx/sites-enabled/mycloud

echo "[4/5] Menguji sintaks konfigurasi Nginx..."
nginx -t

echo "[5/5] Merestart dan mengaktifkan service Nginx..."
systemctl restart nginx
systemctl enable nginx

echo ""
echo "=========================================================="
echo "   Nginx Reverse Proxy Berhasil Dikonfigurasi!           "
echo "=========================================================="
echo "   Sekarang MyCloud bisa diakses langsung via port 80:    "
echo "   - Lokal LAN : http://192.168.18.78                     "
echo "   - Tailscale : http://100.72.209.120                    "
echo "   - MagicDNS  : http://autofocus-server.tail9597dc.ts.net "
echo "=========================================================="

