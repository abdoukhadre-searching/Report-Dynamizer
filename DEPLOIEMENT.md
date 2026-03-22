# Guide de déploiement — EnergiQualif sur VM Hostinger + Cloudflare Tunnel

> **Domaine cible :** `energiqualif.lab-sws.com`  
> **Stack :** Node.js 20 + Express + PostgreSQL + React (Vite)  
> **Port interne :** `5000`

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Configuration de la VM Hostinger](#2-configuration-de-la-vm-hostinger)
3. [Installation des dépendances système](#3-installation-des-dépendances-système)
4. [Déploiement de l'application](#4-déploiement-de-lapplication)
5. [Configuration de la base de données PostgreSQL](#5-configuration-de-la-base-de-données-postgresql)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Build et démarrage de l'application](#7-build-et-démarrage-de-lapplication)
8. [Gestion du processus avec PM2](#8-gestion-du-processus-avec-pm2)
9. [Configuration du tunnel Cloudflare](#9-configuration-du-tunnel-cloudflare)
10. [Configuration DNS sur lab-sws.com](#10-configuration-dns-sur-lab-swscom)
11. [Vérification finale](#11-vérification-finale)
12. [Maintenance et mises à jour](#12-maintenance-et-mises-à-jour)
13. [Dépannage](#13-dépannage)

---

## 1. Prérequis

### Côté Hostinger
- VM KVM (Ubuntu 22.04 LTS recommandé) — au moins **2 vCPU / 4 Go RAM / 40 Go SSD**
- Accès SSH root ou utilisateur `sudo`
- IP publique fournie par Hostinger

### Côté Cloudflare
- Compte Cloudflare actif (gratuit suffit)
- Domaine `lab-sws.com` **ajouté dans Cloudflare** (nameservers Cloudflare actifs)
- Token API Cloudflare ou connexion via CLI

### En local (poste du développeur)
- Accès au code source (Git ou archive ZIP)
- Clé SSH configurée pour la VM

---

## 2. Configuration de la VM Hostinger

### 2.1 Connexion SSH initiale

```bash
ssh root@<IP_VM_HOSTINGER>
```

### 2.2 Création d'un utilisateur non-root (bonne pratique)

```bash
adduser energiqualif
usermod -aG sudo energiqualif

# Copier les clés SSH vers le nouvel utilisateur
rsync --archive --chown=energiqualif:energiqualif ~/.ssh /home/energiqualif

# Se connecter désormais avec cet utilisateur
su - energiqualif
```

### 2.3 Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip software-properties-common
```

---

## 3. Installation des dépendances système

### 3.1 Node.js 20 (via NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérification
node -v   # doit afficher v20.x.x
npm -v    # doit afficher 10.x.x
```

### 3.2 PostgreSQL 15

```bash
sudo apt install -y postgresql postgresql-contrib

# Démarrage automatique
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Vérification
sudo systemctl status postgresql
```

### 3.3 Poppler Utils (extraction PDF HOT2000)

```bash
sudo apt install -y poppler-utils

# Vérification
pdftotext -v
```

### 3.4 PM2 (gestionnaire de processus Node.js)

```bash
sudo npm install -g pm2
```

### 3.5 Chromium pour l'export PDF (Puppeteer)

```bash
sudo apt install -y chromium-browser

# Indiquer à Puppeteer d'utiliser le Chromium système
echo 'export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true' >> ~/.bashrc
echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser' >> ~/.bashrc
source ~/.bashrc
```

---

## 4. Déploiement de l'application

### 4.1 Cloner le dépôt (méthode Git)

```bash
cd /home/energiqualif
git clone <URL_DU_DEPOT_GIT> energiqualif
cd energiqualif
```

**OU** — Transfert par SCP depuis le poste local :

```bash
# Depuis votre poste local
scp -r /chemin/local/energiqualif energiqualif@<IP_VM>:/home/energiqualif/
```

### 4.2 Installation des dépendances Node.js

```bash
cd /home/energiqualif/energiqualif
npm install
```

---

## 5. Configuration de la base de données PostgreSQL

### 5.1 Créer la base et l'utilisateur

```bash
sudo -u postgres psql
```

Dans le shell psql :

```sql
CREATE USER energiqualif_user WITH PASSWORD 'VotreMotDePasseSecurise123!';
CREATE DATABASE energiqualif_db OWNER energiqualif_user;
GRANT ALL PRIVILEGES ON DATABASE energiqualif_db TO energiqualif_user;
\q
```

### 5.2 Tester la connexion

```bash
psql -U energiqualif_user -d energiqualif_db -h localhost -W
# Saisir le mot de passe — si connexion OK, quitter avec \q
```

### 5.3 Construire l'URL de connexion

```
DATABASE_URL=postgresql://energiqualif_user:VotreMotDePasseSecurise123!@localhost:5432/energiqualif_db
```

---

## 6. Variables d'environnement

### 6.1 Créer le fichier `.env`

```bash
cd /home/energiqualif/energiqualif
nano .env
```

Contenu du fichier `.env` :

```env
# Environnement
NODE_ENV=production

# Base de données
DATABASE_URL=postgresql://energiqualif_user:VotreMotDePasseSecurise123!@localhost:5432/energiqualif_db

# Session (générer une clé aléatoire forte)
SESSION_SECRET=remplacer_par_une_chaine_aleatoire_de_64_caracteres_minimum

# Puppeteer (chemin Chromium système)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Port (optionnel, 5000 par défaut)
PORT=5000
```

> **Générer SESSION_SECRET :**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 6.2 Sécuriser le fichier

```bash
chmod 600 .env
```

---

## 7. Build et démarrage de l'application

### 7.1 Build de production

```bash
cd /home/energiqualif/energiqualif
npm run build
```

> Cette commande compile le frontend React (Vite) et le serveur Express dans `dist/`.

### 7.2 Initialiser le schéma de la base de données

```bash
npm run db:push
```

### 7.3 Test manuel de démarrage

```bash
npm run start
```

Vérifier que l'app répond sur le port 5000 :

```bash
curl http://localhost:5000
# Doit retourner le HTML de l'application
```

Arrêter avec `Ctrl+C` une fois le test validé.

---

## 8. Gestion du processus avec PM2

### 8.1 Démarrer l'application avec PM2

```bash
cd /home/energiqualif/energiqualif
pm2 start npm --name "energiqualif" -- run start
```

### 8.2 Sauvegarder la configuration PM2 (redémarrage auto)

```bash
pm2 save
pm2 startup
# Copier-coller la commande sudo affichée par PM2
```

### 8.3 Commandes PM2 utiles

```bash
pm2 status                         # État des processus
pm2 logs energiqualif              # Logs en temps réel
pm2 logs energiqualif --lines 100  # 100 dernières lignes
pm2 restart energiqualif           # Redémarrage
pm2 stop energiqualif              # Arrêt
pm2 delete energiqualif            # Suppression
```

---

## 9. Configuration du tunnel Cloudflare

Le tunnel Cloudflare (`cloudflared`) permet d'exposer l'application sur `energiqualif.lab-sws.com` **sans ouvrir de port entrant sur le firewall de la VM**.

### 9.1 Installer `cloudflared`

```bash
# Télécharger le paquet .deb officiel
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Vérification
cloudflared --version
```

### 9.2 Authentification Cloudflare

```bash
cloudflared tunnel login
```

> Un lien s'affiche dans le terminal. Ouvrez-le dans votre navigateur, connectez-vous à Cloudflare, et autorisez `lab-sws.com`. Un certificat `cert.pem` est généré automatiquement dans `~/.cloudflared/`.

### 9.3 Créer le tunnel

```bash
cloudflared tunnel create energiqualif-tunnel
```

> Un UUID est affiché, par exemple : `a1b2c3d4-e5f6-7890-abcd-ef1234567890`  
> Notez cet UUID, il sera utilisé dans la configuration.

```bash
# Vérification — liste les tunnels existants
cloudflared tunnel list
```

### 9.4 Créer le fichier de configuration du tunnel

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Contenu de `/etc/cloudflared/config.yml` :

```yaml
tunnel: a1b2c3d4-e5f6-7890-abcd-ef1234567890   # Remplacer par votre UUID
credentials-file: /home/energiqualif/.cloudflared/a1b2c3d4-e5f6-7890-abcd-ef1234567890.json

ingress:
  - hostname: energiqualif.lab-sws.com
    service: http://localhost:5000
  - service: http_status:404
```

> Le fichier `.json` des credentials se trouve dans `~/.cloudflared/` — vérifiez le nom exact avec `ls ~/.cloudflared/`.

### 9.5 Installer cloudflared comme service système

```bash
sudo cloudflared service install

# Copier le fichier de config au bon emplacement
sudo cp ~/.cloudflared/cert.pem /etc/cloudflared/cert.pem

# Démarrer le service
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Vérifier le statut
sudo systemctl status cloudflared
```

---

## 10. Configuration DNS sur lab-sws.com

### 10.1 Ajouter l'enregistrement CNAME dans Cloudflare

Dans le tableau de bord Cloudflare → **DNS** → **Records** → **Add record** :

| Type | Nom | Cible | Proxy |
|------|-----|-------|-------|
| `CNAME` | `energiqualif` | `a1b2c3d4-e5f6-7890-abcd-ef1234567890.cfargotunnel.com` | ✅ Proxied (orange) |

> - **Nom** `energiqualif` correspond au sous-domaine → `energiqualif.lab-sws.com`  
> - Remplacer `a1b2c3d4-...` par l'UUID réel de votre tunnel.

**OU** — via CLI cloudflared (crée le CNAME automatiquement) :

```bash
cloudflared tunnel route dns energiqualif-tunnel energiqualif.lab-sws.com
```

### 10.2 Paramètres SSL/TLS Cloudflare recommandés

Dans Cloudflare → **SSL/TLS** :
- Mode chiffrement : **Full** (pas Full Strict, le tunnel gère le TLS en interne)

Dans Cloudflare → **SSL/TLS** → **Edge Certificates** :
- ✅ Always Use HTTPS
- ✅ Automatic HTTPS Rewrites
- ✅ HTTP Strict Transport Security (HSTS) — optionnel mais recommandé

> Le certificat SSL pour `energiqualif.lab-sws.com` est émis automatiquement par Cloudflare (Let's Encrypt) — aucune configuration supplémentaire requise.

---

## 11. Vérification finale

### 11.1 Vérifier que l'app tourne

```bash
pm2 status
# energiqualif doit être en "online"

curl http://localhost:5000
# Doit retourner du HTML
```

### 11.2 Vérifier le tunnel

```bash
sudo systemctl status cloudflared
# Active: active (running)

cloudflared tunnel info energiqualif-tunnel
```

### 11.3 Tester l'URL publique

```bash
curl https://energiqualif.lab-sws.com
# Doit retourner le HTML de l'app
```

Ou simplement ouvrir `https://energiqualif.lab-sws.com` dans un navigateur.

---

## 12. Maintenance et mises à jour

### 12.1 Mise à jour du code

```bash
cd /home/energiqualif/energiqualif

# Récupérer les dernières modifications
git pull origin main

# Réinstaller les dépendances si package.json a changé
npm install

# Rebuilder
npm run build

# Appliquer les migrations de base de données si nécessaire
npm run db:push

# Redémarrer l'application
pm2 restart energiqualif
```

### 12.2 Consulter les logs

```bash
# Logs de l'application (Node.js)
pm2 logs energiqualif --lines 200

# Logs du tunnel Cloudflare
sudo journalctl -u cloudflared -f

# Logs PostgreSQL
sudo journalctl -u postgresql -f
```

### 12.3 Sauvegarder la base de données

```bash
# Créer le dossier de sauvegardes
mkdir -p /home/energiqualif/backups

# Dump complet
pg_dump -U energiqualif_user -d energiqualif_db -h localhost -F c \
  -f /home/energiqualif/backups/energiqualif_$(date +%Y%m%d).dump

# Automatiser via cron (sauvegarde quotidienne à 2h00)
crontab -e
# Ajouter la ligne suivante :
# 0 2 * * * pg_dump -U energiqualif_user -d energiqualif_db -h localhost -F c -f /home/energiqualif/backups/energiqualif_$(date +\%Y\%m\%d).dump
```

---

## 13. Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs PM2
pm2 logs energiqualif --err

# Tester manuellement
cd /home/energiqualif/energiqualif
node dist/index.cjs
```

Causes fréquentes :
- `DATABASE_URL` incorrecte → vérifier `.env`
- Port 5000 déjà occupé → `sudo lsof -i :5000`
- `dist/` absent → relancer `npm run build`

### Le tunnel Cloudflare ne connecte pas

```bash
sudo journalctl -u cloudflared -n 50

# Tester manuellement (sans service)
cloudflared tunnel --config /etc/cloudflared/config.yml run
```

Causes fréquentes :
- UUID du tunnel incorrect dans `config.yml`
- Fichier JSON credentials introuvable
- CNAME DNS pas encore propagé (attendre 5 à 10 min)

### Le sous-domaine ne répond pas

```bash
# Vérifier que le CNAME est bien créé dans Cloudflare
cloudflared tunnel route list

# Vérifier la résolution DNS
nslookup energiqualif.lab-sws.com
# Doit retourner une adresse Cloudflare (104.x.x.x ou 172.x.x.x)
```

### Erreur PostgreSQL "connection refused"

```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Vérifier que PostgreSQL écoute sur localhost
sudo -u postgres psql -c "SHOW listen_addresses;"
```

### PDF Puppeteer échoue sur le serveur

```bash
# Vérifier que Chromium est installé
which chromium-browser
chromium-browser --version

# Vérifier les variables d'environnement
echo $PUPPETEER_EXECUTABLE_PATH
```

Si Puppeteer cherche Chromium dans le mauvais chemin, ajouter dans `.env` :

```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

---

## Récapitulatif des ports et services

| Service | Port | Accessible depuis |
|---------|------|-------------------|
| Application Node.js | `5000` | Localhost uniquement (via tunnel) |
| PostgreSQL | `5432` | Localhost uniquement |
| Cloudflare Tunnel | — | Sortant vers Cloudflare |
| HTTPS public | `443` | Via Cloudflare → `energiqualif.lab-sws.com` |

> **Aucun port entrant n'est requis sur le firewall de la VM** grâce au tunnel Cloudflare.

---

*Document généré pour le projet EnergiQualif — APH SELECT*
