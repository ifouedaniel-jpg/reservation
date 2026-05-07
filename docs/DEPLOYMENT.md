# Runbook de déploiement — Salon Booking

VPS cible : Ubuntu 22.04 LTS, 1 Go RAM, Apache 2 + Node 20.  
Domaine : `votre-domaine.fr` (à adapter partout ci-dessous).

---

## 1. Prérequis sur le VPS

```bash
# Node 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Apache + mod_proxy
sudo apt-get install -y apache2
sudo a2enmod proxy proxy_http headers rewrite

# Certbot (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-apache
```

---

## 2. Premier déploiement

```bash
# Cloner le dépôt
sudo mkdir -p /var/www/salon-booking
sudo chown $USER:$USER /var/www/salon-booking
git clone https://github.com/ifouedaniel-jpg/reservation.git /var/www/salon-booking
cd /var/www/salon-booking

# Variables d'environnement
cp .env.production.example .env
nano .env          # remplir toutes les valeurs

# Dépendances + build
npm ci --omit=dev
npm run build

# Base de données — migrations + seed admin
npm run db:migrate
npm run db:seed    # crée le compte admin (SEED_ADMIN_*)
                   # changer le mot de passe admin immédiatement après

# Permissions sur le fichier SQLite
chmod 640 prod.db
```

---

## 3. Service systemd

Créer `/etc/systemd/system/salon-booking.service` :

```ini
[Unit]
Description=Salon Booking — Next.js
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/salon-booking
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/var/www/salon-booking/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable salon-booking
sudo systemctl start salon-booking
sudo systemctl status salon-booking   # vérifier que le service tourne
```

---

## 4. Vhost Apache (reverse proxy)

Créer `/etc/apache2/sites-available/salon-booking.conf` :

```apache
<VirtualHost *:80>
    ServerName votre-domaine.fr
    ServerAlias www.votre-domaine.fr

    ProxyPreserveHost On
    ProxyPass        / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Empêcher de servir les fichiers Next.js en direct
    <Location "/_next/static">
        ProxyPass http://localhost:3000/_next/static
        Header set Cache-Control "public, max-age=31536000, immutable"
    </Location>

    ErrorLog  ${APACHE_LOG_DIR}/salon-booking-error.log
    CustomLog ${APACHE_LOG_DIR}/salon-booking-access.log combined
</VirtualHost>
```

```bash
sudo a2ensite salon-booking
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## 5. HTTPS avec Let's Encrypt

```bash
# Obtenir et installer le certificat (remplace le vhost HTTP par HTTPS automatiquement)
sudo certbot --apache -d votre-domaine.fr -d www.votre-domaine.fr

# Tester le renouvellement automatique
sudo certbot renew --dry-run
```

Le renouvellement automatique est assuré par le timer systemd `certbot.timer`
installé par le paquet certbot (vérifier avec `systemctl status certbot.timer`).

---

## 6. Mises à jour

```bash
cd /var/www/salon-booking
git pull
npm ci --omit=dev
npm run build
npm run db:migrate          # si le schéma a changé
sudo systemctl restart salon-booking
```

---

## 7. Sauvegarde quotidienne de la base de données

### Script de sauvegarde

Créer `/usr/local/bin/backup-salon-db.sh` :

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_PATH="/var/www/salon-booking/prod.db"
BACKUP_DIR="/var/backups/salon"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

# Sauvegarde cohérente via l'API SQLite (supporte le mode WAL)
sqlite3 "$DB_PATH" ".backup ${BACKUP_DIR}/prod_${TIMESTAMP}.db"

# Conserver uniquement les 30 dernières sauvegardes
ls -t "${BACKUP_DIR}"/prod_*.db | tail -n +31 | xargs -r rm --

echo "Sauvegarde OK : ${BACKUP_DIR}/prod_${TIMESTAMP}.db"
```

```bash
sudo chmod +x /usr/local/bin/backup-salon-db.sh
sudo mkdir -p /var/backups/salon
```

### Cron quotidien (2h du matin)

```bash
sudo crontab -e
```

Ajouter la ligne :

```
0 2 * * * /usr/local/bin/backup-salon-db.sh >> /var/log/salon-backup.log 2>&1
```

### Test manuel

```bash
sudo /usr/local/bin/backup-salon-db.sh
ls -lh /var/backups/salon/
```

---

## 8. Logs utiles

```bash
# Logs de l'application Next.js
sudo journalctl -u salon-booking -f

# Logs Apache
sudo tail -f /var/log/apache2/salon-booking-error.log
sudo tail -f /var/log/apache2/salon-booking-access.log

# Statut général
sudo systemctl status salon-booking apache2
```

---

## 9. Checklist avant mise en production

- [ ] `.env` rempli avec toutes les valeurs (aucune valeur vide)
- [ ] `AUTH_SECRET` généré avec `openssl rand -base64 32`
- [ ] Domaine Resend vérifié et `RESEND_FROM_EMAIL` mis à jour
- [ ] Mot de passe admin changé après `db:seed`
- [ ] HTTPS actif et redirection HTTP → HTTPS en place
- [ ] Première sauvegarde manuelle testée
- [ ] `sudo systemctl status salon-booking` → `active (running)`
