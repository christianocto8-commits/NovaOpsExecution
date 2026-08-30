#!/usr/bin/env bash
# Helper script to install & configure rclone for automated Google Drive backups on NovaOps VPS
set -euo pipefail

echo "==> NovaOps Google Drive Backup Setup"

if ! command -v rclone >/dev/null 2>&1; then
  echo "Installing rclone..."
  curl https://rclone.org/install.sh | bash
fi

echo ""
echo "rclone installed: $(rclone --version | head -n 1)"
echo ""
echo "Langkah Konfigurasi Google Drive:"
echo "1. Jalankan: rclone config"
echo "2. Pilih: 'n' (New remote)"
echo "3. Masukkan nama remote: 'gdrive'"
echo "4. Pilih Storage type: 'drive' (Google Drive)"
echo "5. Ikuti instruksi otorisasi akun Google Anda."
echo "6. Setelah selesai, tambahkan baris berikut ke /opt/NovaOpsExecution/apps/api/.env:"
echo "   NOVAOPS_GDRIVE_REMOTE=gdrive:NovaOpsBackups"
echo ""
echo "Selesai! Skrip backup harian akan otomatis mengunggah database & manifest ke Google Drive Anda."
