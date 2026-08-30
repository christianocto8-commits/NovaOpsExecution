#!/usr/bin/env bash
set -euo pipefail

echo "=== Before Cleanup ==="
df -h /

# Retain only the 3 newest backups in /var/backups/novaops/
if [[ -d /var/backups/novaops ]]; then
  echo "Cleaning old snapshot backups in /var/backups/novaops/..."
  ls -dt /var/backups/novaops/vps-* | tail -n +4 | xargs rm -rf 2>/dev/null || true
fi

# Vacuum systemd logs older than 3 days
echo "Vacuuming journalctl logs..."
journalctl --vacuum-time=3d 2>/dev/null || true

# Vacuum apt cache
echo "Cleaning apt cache..."
apt-get clean 2>/dev/null || true

echo
echo "=== After Cleanup ==="
df -h /
