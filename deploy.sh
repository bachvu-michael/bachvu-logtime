#!/bin/bash
set -e

echo "=== LogTime Deploy ==="

# Node.js check
if ! command -v node &> /dev/null; then
  echo "Node.js not found. Install it first:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 20 ]; then
  echo "Node.js 20+ required (found $NODE_VER). Please upgrade."
  exit 1
fi

# PM2 check
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  sudo npm install -g pm2
fi

# .env setup
if [ ! -f .env ]; then
  echo ""
  read -sp "Set app password (leave blank to disable auth): " APP_PASS
  echo ""
  read -p "Port [3001]: " APP_PORT
  APP_PORT="${APP_PORT:-3001}"

  {
    [ -n "$APP_PASS" ] && echo "APP_PASSWORD=$APP_PASS"
    echo "PORT=$APP_PORT"
  } > .env
  echo ".env created"
else
  echo ".env already exists — skipping"
fi

# Install & build
echo ""
echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

# Start with PM2
echo ""
pm2 delete logtime 2>/dev/null || true
pm2 start --name logtime npm -- run start
pm2 save

echo ""
echo "=== Done ==="
PORT_VAL=$(grep '^PORT=' .env 2>/dev/null | cut -d= -f2 || echo 3001)
echo "App running at http://localhost:${PORT_VAL:-3001}"
echo ""
echo "To enable auto-start on reboot, run:"
echo "  pm2 startup   (then run the printed command)"
