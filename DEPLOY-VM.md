# Déploiement VM Hostinger — EnergiQualif

Déploiement sur Ubuntu via **systemd** (sans PM2) + tunnel Cloudflare.

---

## Prérequis sur la VM

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Chromium (pour l'export PDF)
sudo apt-get install -y chromium-browser

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Poppler (pdftotext)
sudo apt-get install -y poppler-utils

# Git
sudo apt-get install -y git
```

---

## 1. Cloner / mettre à jour le dépôt

```bash
# Premier déploiement
cd /opt
sudo git clone https://github.com/VOTRE_ORG/energiqualif.git
sudo chown -R $USER:$USER /opt/energiqualif

# Mise à jour uniquement
cd /opt/energiqualif
git pull origin main
```

---

## 2. Variables d'environnement

```bash
sudo nano /opt/energiqualif/.env
```

Contenu du fichier `.env` :

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://energiqualif:MOT_DE_PASSE@localhost:5432/energiqualif
SESSION_SECRET=CHAINE_ALEATOIRE_LONGUE_ET_SECRETE
```

> Générer un SESSION_SECRET : `openssl rand -hex 64`

---

## 3. Base de données PostgreSQL

```bash
# Créer l'utilisateur et la base
sudo -u postgres psql <<EOF
CREATE USER energiqualif WITH PASSWORD 'MOT_DE_PASSE';
CREATE DATABASE energiqualif OWNER energiqualif;
GRANT ALL PRIVILEGES ON DATABASE energiqualif TO energiqualif;
\c energiqualif
GRANT ALL ON SCHEMA public TO energiqualif;
GRANT CREATE ON SCHEMA public TO energiqualif;
EOF

# Créer le schéma (depuis le répertoire du projet)
cd /opt/energiqualif
npm run db:push
```

---

## 4. Rétablir la PWA sur la base PostgreSQL historique

> À effectuer une seule fois pour revenir d'une version qui utilisait
> `mab-projets.db`. Cette procédure ne copie, ne supprime ni ne remplace les
> données PostgreSQL historiques.

```bash
cd /opt/energiqualif

# 1. Arrêter l'application avant toute modification
sudo systemctl stop energiqualif

# 2. Conserver le fichier SQLite comme sauvegarde, sans l'effacer
mkdir -p backups/sqlite
[ ! -f data/mab-projets.db ] || cp -a data/mab-projets.db \
  "backups/sqlite/mab-projets-$(date +%Y%m%d-%H%M%S).db"

# 3. Vérifier que l'environnement pointe vers la base historique
set -a && . ./.env && set +a
psql "$DATABASE_URL" -c "SELECT current_database(), current_user;"
psql "$DATABASE_URL" -c "SELECT id, email, username FROM users ORDER BY created_at DESC LIMIT 10;"

# 4. Corriger les droits si une installation précédente a été exécutée avec sudo
sudo chown -R energiqualif:energiqualif /opt/energiqualif
npm ci

# 5. Synchroniser uniquement les ajouts de colonnes et tables requis par la PWA.
#    Examiner la proposition Drizzle et annuler si elle suggère une suppression
#    ou une modification destructive.
npm run db:push

# 6. Compiler puis redémarrer
npm run build
sudo systemctl start energiqualif
```

Contrôles après redémarrage :

```bash
curl -fsS http://localhost:5000/api/health
curl -fsS http://localhost:5000/api/auth/me
sudo journalctl -u energiqualif -n 50 --no-pager
```

Connectez-vous ensuite avec un ancien compte et vérifiez les projets modifiés le
vendredi après 15 h. Les sessions sont désormais enregistrées dans PostgreSQL
(`session`), ce qui évite de perdre une connexion lors d'un redémarrage.

---

## 5. Build de l'application

```bash
cd /opt/energiqualif
npm install
npm run build
```

Le build produit :
- `dist/index.cjs` — serveur Express
- `dist/public/` — frontend React compilé

---

## 6. Service systemd

### Créer le fichier de service

```bash
sudo nano /etc/systemd/system/energiqualif.service
```

Contenu :

```ini
[Unit]
Description=EnergiQualif — APH SELECT
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/energiqualif
EnvironmentFile=/opt/energiqualif/.env
ExecStart=/usr/bin/node dist/index.cjs
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=energiqualif

# Sécurité
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

> Remplacer `ubuntu` par votre utilisateur réel si différent (`whoami`).

### Activer et démarrer

```bash
sudo systemctl daemon-reload
sudo systemctl enable energiqualif
sudo systemctl start energiqualif
```

---

## 7. Gestion du service

| Action | Commande |
|---|---|
| Démarrer | `sudo systemctl start energiqualif` |
| Arrêter | `sudo systemctl stop energiqualif` |
| Redémarrer | `sudo systemctl restart energiqualif` |
| Statut | `sudo systemctl status energiqualif` |
| Logs en direct | `sudo journalctl -u energiqualif -f` |
| Logs récents | `sudo journalctl -u energiqualif -n 100` |
| Désactiver démarrage auto | `sudo systemctl disable energiqualif` |

---

## 8. Tunnel Cloudflare

Le tunnel expose le port 5000 local vers `energiqualif.lab-sws.com`.

```bash
# Vérifier l'état du tunnel (s'il est déjà configuré comme service)
sudo systemctl status cloudflared

# Redémarrer le tunnel si nécessaire
sudo systemctl restart cloudflared

# Logs du tunnel
sudo journalctl -u cloudflared -f
```

Si le tunnel n'est pas encore configuré comme service :

```bash
# Installer cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Authentifier et créer le tunnel (une seule fois)
cloudflared tunnel login
cloudflared tunnel create energiqualif

# Configurer le tunnel
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: energiqualif.lab-sws.com
    service: http://localhost:5000
  - service: http_status:404
EOF

# Installer comme service systemd
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## 9. Mise à jour de l'application

```bash
cd /opt/energiqualif

# Récupérer les dernières modifications
git pull origin main

# Réinstaller les dépendances si nécessaire
npm install

# Recompiler
npm run build

# Appliquer les ajouts de schéma si nécessaire (ne jamais confirmer une
# proposition destructive de Drizzle)
npm run db:push

# Redémarrer le service
sudo systemctl restart energiqualif

# Vérifier que tout va bien
sudo systemctl status energiqualif
sudo journalctl -u energiqualif -n 30
```

---

## 10. Vérification post-déploiement

```bash
# L'app répond sur le port 5000
curl -s http://localhost:5000/api/auth/me

# Chromium disponible pour l'export PDF
which chromium-browser

# PostgreSQL en ligne
sudo systemctl status postgresql

# Logs récents
sudo journalctl -u energiqualif -n 50 --no-pager
```

---

## Dépannage

### L'app ne démarre pas

```bash
# Voir l'erreur complète
sudo journalctl -u energiqualif -n 50 --no-pager

# Vérifier les variables d'environnement
cat /opt/energiqualif/.env

# Tester manuellement
cd /opt/energiqualif && node dist/index.cjs
```

### Problème de base de données

```bash
# Vérifier la connexion
psql "$DATABASE_URL" -c "SELECT 1"

# Voir les logs PostgreSQL
sudo journalctl -u postgresql -n 30
```

### Export PDF échoue

```bash
# Vérifier que chromium-browser est accessible
which chromium-browser
chromium-browser --version

# Tester le lancement headless
chromium-browser --headless --no-sandbox --dump-dom about:blank
```
