# MAB Projets — Build de l'application desktop (Tauri)

L'app desktop emballe le frontend React et le serveur Express/SQLite dans un
installateur Windows autonome. Aucune installation de Node.js ni de base de
données n'est requise sur le poste de l'utilisateur, et l'app fonctionne
entièrement hors ligne.

## Architecture

```
MAB Projets.exe (Tauri, Rust)
 ├─ démarre le sidecar : binaries/node + resources/server.cjs (Express + SQLite)
 │    · PORT=0 → port attribué par l'OS, annoncé dans les logs, validé via /api/health
 │    · écoute sur 127.0.0.1 uniquement
 │    · données dans %APPDATA%\com.conseilsmab.mabprojets\ (Windows)
 │      – mab-projets.db (base SQLite)
 │      – uploads/ (rapports HOT2000, images, PDF)
 │      – .session-secret (généré au premier lancement)
 └─ ouvre la WebView sur http://127.0.0.1:<port>
```

La génération de PDF (Puppeteer) utilise le navigateur **système** — Microsoft
Edge (préinstallé sur Windows 10/11) ou Chrome — donc aucun Chromium n'est
bundlé et tout reste hors ligne.

## Prérequis sur la machine de build

⚠️ **Le build doit être fait sur Windows** : les modules natifs
better-sqlite3/sharp et l'installateur NSIS sont compilés pour Windows.

1. **Node.js 20+** — https://nodejs.org
2. **Rust (stable)** — https://rustup.rs
3. **Windows uniquement** : "Desktop development with C++" via Visual Studio
   Build Tools (exigé par Rust MSVC), et WebView2 (déjà présent sur Win 10/11).
## Build

```bash
git clone <ce dépôt>
cd <dépôt>
npm ci
npm run tauri:build
# ou : npm run tauri:build:windows
```

`tauri:build` exécute automatiquement `desktop:prepare` qui :
1. compile le frontend Vite → `dist/public`
2. bundle le serveur Express → `src-tauri/resources/server.cjs`
3. copie le frontend dans `src-tauri/resources/public`
4. copie les modèles des PDF collectifs et d'attestation dans
   `src-tauri/resources/templates`
5. installe les modules natifs (better-sqlite3, sharp, puppeteer sans Chromium)
   dans `src-tauri/resources/node_modules`
6. télécharge et bundle Poppler (`pdftotext`, `pdftoppm`), Tesseract avec la
   langue française (`tessdata/fra.traineddata`) et ImageMagick dans
   `src-tauri/resources/bin`
7. copie le binaire Node local comme sidecar (`src-tauri/binaries/node-<triple>`)

Résultat :
- **Windows** : `src-tauri/target/release/bundle/nsis/MAB Projets_1.0.0_x64-setup.exe`

## Premier lancement

- Windows SmartScreen affichera un avertissement (installateur non signé) —
  cliquer « Informations complémentaires » → « Exécuter quand même ».
  (Le code signing avec certificat EV est hors périmètre pour l'instant.)
- Au premier lancement, la base SQLite et le dossier de données sont créés
  automatiquement dans le dossier de données de l'app.

## Données existantes

Pour transférer les données du Replit vers le desktop, copier le contenu du
dossier `data/` du Replit (fichier `mab-projets.db` + dossier `uploads/`) dans
le dossier de données de l'app desktop (`%APPDATA%\com.conseilsmab.mabprojets\`).

## Outils de traitement de fichiers

Certaines fonctions appellent des outils en ligne de commande absents d'un
poste Windows standard :
- `pdftotext` / `pdftoppm` (poppler) — extraction texte HOT2000 et conversion
  PDF → image (pages de spec, annexes)
- `tesseract` (+ langue `fra`) — OCR de secours pour les PDF LogisVert
- `magick` (ImageMagick) — conversion HEIC/TIFF de secours (sharp couvre déjà
  la plupart des formats)

`npm run tauri:build` les télécharge et les place automatiquement dans
`src-tauri/resources/bin/`. Le shell Tauri ajoute ce dossier au `PATH` du
serveur et définit `TESSDATA_PREFIX` pour que Tesseract trouve `fra.traineddata`
hors connexion. Aucune installation supplémentaire n'est requise sur le poste
client.

Les versions, l’empreinte SHA-256 de chaque téléchargement et le commit exact
des données `fra` sont figés dans `script/build-desktop.ts`. Le build vérifie
l’empreinte avant toute extraction ou exécution, puis contrôle que les quatre
outils démarrent et que Tesseract liste bien `fra`.

Pour utiliser un miroir interne ou une version validée différente, définir sur
la machine de build une paire d’options, par exemple `MAB_POPPLER_URL` et
`MAB_POPPLER_SHA256`. Les paires équivalentes existent pour `TESSERACT`,
`TESSDATA_FRA` et `IMAGEMAGICK`; une URL personnalisée sans son empreinte
SHA-256 fait échouer le build. Si un outil ou la langue française manque malgré
tout dans une installation, l'application indique clairement lequel doit être
réinstallé.

## Dépannage

- **Fenêtre blanche / rien ne s'ouvre** : lancer l'exe depuis un terminal pour
  voir les logs `[server]` du sidecar.
- **PDF ne se génère pas** : vérifier qu'Edge ou Chrome est installé, ou définir
  la variable d'environnement `PUPPETEER_EXECUTABLE_PATH`.
- **Icônes** : régénérer avec `npx tauri icon <png carré 1024×1024>`.
