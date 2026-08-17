#!/usr/bin/env bash
set -euo pipefail

# Setup a GitHub Actions self-hosted runner on the NovaOps VPS.
#
# The runner runs the workflows locally on the VPS so GitHub-hosted
# Actions minutes are not consumed (no billing dependency). Workflows
# use actions/setup-node|python|java and android-actions/setup-android,
# so this script only needs to install the base OS prerequisites,
# Docker access (for service containers), and the runner itself.
#
# Usage (as root, on the VPS):
#   sudo bash scripts/setup-vps-github-runner.sh <REGISTRATION_TOKEN>
#
# Get the registration token from:
#   GitHub repo -> Settings -> Actions -> Runners -> New self-hosted runner

REPO_OWNER="${GITHUB_REPO_OWNER:-christianocto8-commits}"
REPO_NAME="${GITHUB_REPO_NAME:-NovaOpsExecution}"
TOKEN="${1:-}"

RUNNER_USER="github-runner"
RUNNER_GROUP="github-runner"
RUNNER_DIR="/opt/actions-runner"
RUNNER_NAME="${RUNNER_NAME:-novaops-vps-runner}"
RUNNER_LABELS="${RUNNER_LABELS:-self-hosted,linux,x64,vps}"

if [[ -z "$TOKEN" ]]; then
  echo "Usage: $0 <RUNNER_REGISTRATION_TOKEN>" >&2
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

echo
echo "NovaOps VPS self-hosted GitHub Actions runner"
echo "Repo:    $REPO_OWNER/$REPO_NAME"
echo "Runner:  $RUNNER_NAME ($RUNNER_LABELS)"
echo "User:    $RUNNER_USER"
echo "Install: $RUNNER_DIR"
echo

# 1. Base system packages (the workflows apt-install xmlsec/etc. themselves,
#    but the runner needs the basics available for sudo apt runs).
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \
  curl \
  ca-certificates \
  git \
  jq \
  build-essential \
  sudo \
  unzip \
  python3 \
  python3-pip

# 2. Dedicated runner user with passwordless sudo + docker group.
if id "$RUNNER_USER" &>/dev/null; then
  echo "User $RUNNER_USER already exists."
else
  useradd -m -s /bin/bash "$RUNNER_USER"
fi
echo "$RUNNER_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$RUNNER_USER"
chmod 440 "/etc/sudoers.d/$RUNNER_USER"
if getent group docker >/dev/null; then
  usermod -aG docker "$RUNNER_USER"
fi

# 3. Docker must be available for workflow service containers (postgres).
if ! command -v docker &>/dev/null; then
  echo "Docker not found. Install Docker Engine first (production already needs it)." >&2
  exit 1
fi

# 4. Download the latest actions/runner (x64).
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

RUNNER_VERSION="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
  | jq -r .tag_name | sed 's/^v//')"
if [[ -z "$RUNNER_VERSION" || "$RUNNER_VERSION" == "null" ]]; then
  RUNNER_VERSION="2.323.0"
fi
echo "Installing actions/runner v$RUNNER_VERSION..."

RUNNER_ARCHIVE="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
if [[ ! -f "$RUNNER_ARCHIVE" ]]; then
  curl -fsSLO "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_ARCHIVE}"
  # Verify checksum when present.
  if curl -fsSLO "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_ARCHIVE}.sha256"; then
    (echo "$(cat "${RUNNER_ARCHIVE}.sha256")" | sha256sum -c -) || {
      echo "Runner archive checksum failed." >&2
      exit 1
    }
    rm -f "${RUNNER_ARCHIVE}.sha256"
  fi
  tar -xzf "$RUNNER_ARCHIVE"
  rm -f "$RUNNER_ARCHIVE"
fi

# 5. Own the runner directory (the runner refuses to run as root).
chown -R "$RUNNER_USER:$RUNNER_GROUP" "$RUNNER_DIR"
chmod -R go-w "$RUNNER_DIR"

# 6. Configure (register) the runner.
su -s /bin/bash "$RUNNER_USER" -c "cd '$RUNNER_DIR' && ./config.sh \
  --url 'https://github.com/${REPO_OWNER}/${REPO_NAME}' \
  --token '${TOKEN}' \
  --name '${RUNNER_NAME}' \
  --labels '${RUNNER_LABELS}' \
  --unattended --replace" 

# 7. Install and start as a systemd service.
./svc.sh install "$RUNNER_USER"
./svc.sh start

echo
echo "Runner registered and started."
echo "Check status: sudo -u $RUNNER_USER $RUNNER_DIR/run.sh --once" 
echo "Service:     systemctl status actions.runner.${REPO_OWNER}-${REPO_NAME}.${RUNNER_NAME}.service"