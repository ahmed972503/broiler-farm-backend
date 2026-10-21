# Broiler Farm Management System - Deployment & Operations Guide

## 1. System Requirements
- **Host OS**: Ubuntu 22.04 LTS / Debian 12 (or Windows Server 2022)
- **CPU**: 2 vCPUs minimum (4 vCPUs recommended for multi-shed reporting)
- **RAM**: 4 GB minimum (8 GB recommended with embedded MongoDB)
- **Storage**: 40 GB SSD minimum
- **Runtime**: Node.js v20+ LTS or Docker 24.0+ & Docker Compose v2.20+

---

## 2. Dockerized Production Deployment

The fastest and most reliable way to run the entire backend infrastructure (Node.js API, MongoDB 7.0 with replica set or standalone volume, and automated backup sidecar) is via Docker Compose.

### Step 2.1: Clone & Configure Environment
```bash
git clone <repository-url> /opt/broiler-farm
cd /opt/broiler-farm

# Copy production environment template
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your secure secrets:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://mongo:27017/broiler_farm_prod
JWT_SECRET=replace_with_a_64_character_cryptographically_secure_random_string
JWT_REFRESH_SECRET=replace_with_another_64_character_cryptographically_secure_random_string
CORS_ORIGIN=*
RATE_LIMIT_MAX=500
```

### Step 2.2: Launch with Docker Compose
```bash
docker compose up -d --build
```

Verify services are running:
```bash
docker compose ps
docker compose logs -f api
```

The API will now be listening on port `5000` (e.g., `http://your-server-ip:5000/api/health`).

---

## 3. Database Backup & Disaster Recovery

### Step 3.1: Automated Daily Backup Script
A dedicated cron job runs every night at 2:00 AM Pakistan Standard Time (PKT) to take an encrypted, compressed dump of MongoDB and prune backups older than 30 days.

Save this script as `/opt/broiler-farm/scripts/backup-mongodb.sh`:
```bash
#!/usr/bin/env bash
set -eo pipefail

BACKUP_DIR="/opt/broiler-farm/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="broiler-mongo"
DB_NAME="broiler_farm_prod"
TARGET_FILE="${BACKUP_DIR}/broiler_farm_${TIMESTAMP}.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting MongoDB automated backup..."
docker exec "${CONTAINER_NAME}" mongodump --db="${DB_NAME}" --archive --gzip > "${TARGET_FILE}"

echo "[$(date)] Backup completed successfully: ${TARGET_FILE} ($(du -h "${TARGET_FILE}" | cut -f1))"

# Retention policy: Delete backups older than 30 days
find "${BACKUP_DIR}" -type f -name "broiler_farm_*.gz" -mtime +30 -delete
echo "[$(date)] Old backups pruned."
```

Make executable and add to crontab:
```bash
chmod +x /opt/broiler-farm/scripts/backup-mongodb.sh
crontab -e
# Add line:
# 0 2 * * * /opt/broiler-farm/scripts/backup-mongodb.sh >> /var/log/broiler_backup.log 2>&1
```

### Step 3.2: Database Restore Procedure
In the event of hardware failure or accidental data deletion:
```bash
# 1. Identify backup archive to restore
BACKUP_FILE="/opt/broiler-farm/backups/broiler_farm_20261021_020000.gz"

# 2. Stream restore archive into container
docker exec -i broiler-mongo mongorestore --db="broiler_farm_prod" --archive --gzip --drop < "${BACKUP_FILE}"

echo "Database restored successfully."
```

---

## 4. Mobile App Release & EAS Build (Android APK / AAB)

The mobile and web app is built using Expo Application Services (EAS) to generate production-ready Android APKs for farm tablets and phones, plus responsive web bundles for admin laptops.

### Step 4.1: Install EAS CLI & Login
```bash
npm install -g eas-cli
eas login
```

### Step 4.2: Build Standalone Android APK for Direct Install
Workers in Pakistani sheds can install the APK directly via WhatsApp or USB without needing the Google Play Store:
```bash
cd apps/mobile
eas build --platform android --profile preview
```
This produces a standalone `apk` file downloadable directly to Android devices.

### Step 4.3: Build Production Android AAB for Google Play Store
```bash
eas build --platform android --profile production
```

### Step 4.4: Deploy Admin Web View (Expo Web)
The admin web dashboard can be hosted on any static web server (Nginx, Netlify, Cloudflare Pages, or AWS S3):
```bash
cd apps/mobile
npm run web:export
# Serves dist folder:
npx serve dist -l 3000
```

---

## 5. Reverse Proxy & SSL (Nginx & Certbot)

For commercial production deployment with free Let's Encrypt HTTPS certificates:

```nginx
# /etc/nginx/sites-available/farm.yourdomain.com
server {
    server_name farm.yourdomain.com;

    # Admin Web Dashboard
    location / {
        root /opt/broiler-farm/apps/mobile/dist;
        try_files $uri $uri/ /index.html;
    }

    # REST & Offline Sync API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL:
```bash
sudo certbot --nginx -d farm.yourdomain.com
```
