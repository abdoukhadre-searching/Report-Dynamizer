# Déploiement d’EnergiQualif

La procédure de déploiement maintenue est disponible dans
[DEPLOY-VM.md](DEPLOY-VM.md).

Elle couvre la PWA web avec PostgreSQL, les sessions persistantes, les uploads,
la génération PDF et la procédure de retour à la base PostgreSQL historique.
Avant toute mise à jour d’une VM ayant utilisé SQLite, suivre la section
« Rétablir la PWA sur la base PostgreSQL historique » : le fichier
`mab-projets.db` doit être sauvegardé, jamais supprimé.

L’application ne dépend plus de Tauri ni de SQLite.