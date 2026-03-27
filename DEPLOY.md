# Linux Server Deployment

## Prerequisites

- Ubuntu 22.04+ (or similar Debian-based distro)
- Node.js 20+ — install via [NodeSource](https://github.com/nodesource/distributions):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- PM2 (process manager):
  ```bash
  sudo npm install -g pm2
  ```

## One-time Setup

Run the deploy script from the project root:

```bash
chmod +x deploy.sh
./deploy.sh
```

This will:
1. Install dependencies
2. Build the React frontend
3. Create a `.env` file (prompts for password)
4. Start the app with PM2 on the configured port
5. Save PM2 process list to survive reboots

## Manual Steps

```bash
# 1. Install dependencies
npm install

# 2. Build React frontend
npm run build

# 3. Create .env (set password and port)
cat > .env <<EOF
APP_PASSWORD=your_password_here
PORT=3001
EOF

# 4. Start production server
pm2 start --name logtime npm -- run start
pm2 save

# 5. Auto-start on system reboot
pm2 startup   # follow the printed command (requires sudo)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PASSWORD` | _(unset)_ | Password for the web UI. If not set, auth is disabled. |
| `PORT` | `3001` | Port the server listens on |
| `NODE_ENV` | — | Set to `production` to serve the built frontend |

## Managing the App

```bash
pm2 status                  # check if running
pm2 logs logtime            # view logs
pm2 restart logtime         # restart
pm2 stop logtime            # stop

# Update to latest code
git pull
npm install
npm run build
pm2 restart logtime
```

## Nginx Reverse Proxy (optional)

To expose on port 80/443, install Nginx and create `/etc/nginx/sites-available/logtime`:

```nginx
server {
    listen 80;
    server_name your-domain-or-ip;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/logtime /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

For HTTPS, use [Certbot](https://certbot.eff.org/):
```bash
sudo certbot --nginx -d your-domain
```
