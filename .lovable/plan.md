

# Guide débutant — Installer AirBallistik sur VM Proxmox (Ubuntu 24.04) + Supabase self-hosted

## Objectif

Produire **un seul document** `docs/deploy/install-proxmox-ubuntu-supabase.md`, pensé pour un **débutant total**, qui détaille pas à pas :

1. la création d'une VM Ubuntu 24.04 sur Proxmox (accessible sur `192.168.1.100:8006`),
2. le clonage du repo GitHub AirBallistik,
3. le build de l'app et son exposition via **Traefik** (recommandé) ou Nginx ou `vite preview`,
4. l'installation et la configuration de **Supabase self-hosted dès maintenant** (migrations IA-1 incluses),
5. la validation end-to-end du flux IA-1 Strelok Pro.

**Aucun code applicatif ne sera modifié.** Un seul fichier Markdown sera créé.

---

## Plan du document (sections)

### 1. Résumé exécutif + arbre de décision
- Schéma ASCII : Proxmox → VM Ubuntu → (AirBallistik + Supabase Docker) → LAN.
- Tableau « Quand utiliser Traefik vs Nginx vs vite preview » (recommandation débutant : **Traefik**, parce qu'il gère Supabase + l'app sous le même domaine avec TLS auto).

### 2. Prérequis (avant de toucher à quoi que ce soit)
- Accès Proxmox `https://192.168.1.100:8006` (login root@pam).
- ISO **Ubuntu 24.04 LTS Server** téléchargée sur le storage Proxmox (procédure upload ISO détaillée).
- Compte GitHub avec le repo AirBallistik connecté (via Connectors Lovable).
- Clé API **Quatarly** (primaire) + clé **Google Generative Language** (fallback optionnel).
- 1 screenshot Strelok Pro pour la recette finale.
- Un nom de domaine local ou `.localhost` (ex. `airballistik.lan`, `supabase.lan`) — ou IP directe si pas de DNS LAN.

### 3. Recommandations hardware (VM Proxmox)
Tableau concret :

| Profil | vCPU | RAM | Disque | Usage |
|---|---|---|---|---|
| Minimal test | 2 | 4 Go | 30 Go | App seule, Supabase off |
| **Recommandé (app + Supabase)** | **4** | **8 Go** | **60 Go SSD** | Postgres + Kong + Auth + Storage + Studio + app |
| Confortable durable | 6 | 16 Go | 100 Go SSD | idem + marge logs/snapshots |

Réseau : bridge `vmbr0`, IP statique conseillée (ex. `192.168.1.150/24`), gateway `192.168.1.1`.

### 4. Étape 1 — Créer la VM sur Proxmox (pas à pas, UI)
Navigation exacte dans l'interface `192.168.1.100:8006` :
1. Datacenter → pve → `Create VM` (bouton haut-droite).
2. Onglet **General** : VM ID `150`, Name `airballistik`.
3. Onglet **OS** : ISO = `ubuntu-24.04-live-server-amd64.iso` (expliquer comment l'uploader via `local → ISO Images → Upload` si pas présente).
4. Onglet **System** : Machine `q35`, BIOS `OVMF (UEFI)`, EFI storage `local-lvm`, cocher Qemu Agent.
5. Onglet **Disks** : storage `local-lvm`, taille **60 Go**, cache `Write back`, cocher `Discard` et `SSD emulation`.
6. Onglet **CPU** : 4 cores, type `host`.
7. Onglet **Memory** : 8192 Mo, ballooning activé.
8. Onglet **Network** : bridge `vmbr0`, modèle `VirtIO`.
9. Confirm → Start.

### 5. Étape 2 — Installer Ubuntu 24.04 Server
- Langue, clavier, profil réseau (assigner IP statique `192.168.1.150/24` depuis l'installeur).
- Storage : LVM entier, chiffrement optionnel.
- Profil : user `airadmin`, hostname `airballistik-vm`.
- **Installer OpenSSH** (cocher).
- **Ne pas** installer Docker depuis Snap (faille/config).
- Reboot, retirer ISO.

### 6. Étape 3 — Premiers réglages système
```bash
ssh airadmin@192.168.1.150
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates gnupg ufw htop unzip
sudo timedatectl set-timezone Europe/Paris
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```
Expliquer chaque commande en 1 ligne. **Prendre un snapshot Proxmox** `post-os-install` avant d'aller plus loin.

### 7. Étape 4 — Installer Docker + Compose (pour Supabase)
Procédure officielle Docker (repo apt) :
```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker airadmin
```
Logout/login. Vérif : `docker run hello-world`.

### 8. Étape 5 — Installer Node 20 LTS (pour builder l'app)
NodeSource :
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

### 9. Étape 6 — Cloner et builder AirBallistik
```bash
sudo mkdir -p /opt/airballistik && sudo chown airadmin:airadmin /opt/airballistik
cd /opt && git clone https://github.com/<user>/<repo>.git airballistik
cd /opt/airballistik
npm ci
# On builde PLUS TARD, après avoir défini VITE_SUPABASE_URL/ANON_KEY (§12)
```
Encadré : **ne pas builder tout de suite** — on a besoin des variables Supabase.

### 10. Étape 7 — Installer Supabase self-hosted (Docker)
```bash
cd /opt
git clone --depth 1 https://github.com/supabase/supabase.git supabase-stack
cd supabase-stack/docker
cp .env.example .env
```
Éditer `.env` avec `nano .env`. Points importants à remplir **avec des valeurs nouvelles** (pas celles de l'exemple) :
- `POSTGRES_PASSWORD` : générer `openssl rand -hex 32`
- `JWT_SECRET` : `openssl rand -hex 32`
- `ANON_KEY` / `SERVICE_ROLE_KEY` : générer via `https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys` (JWT signés avec `JWT_SECRET`), procédure détaillée dans le guide.
- `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` : Studio admin.
- `SITE_URL` : `http://192.168.1.150` (temporaire, ajustera avec Traefik).
- `API_EXTERNAL_URL` : `http://192.168.1.150:8000` (temporaire).
- `SMTP_*` : laisser vide pour l'instant (pas d'email).

Lancer :
```bash
docker compose pull
docker compose up -d
docker compose ps
```
Vérifier : Studio sur `http://192.168.1.150:8000`, login avec `DASHBOARD_USERNAME/PASSWORD`.

### 11. Étape 8 — Appliquer les migrations IA-1
Deux options, le guide détaille les deux :

**Option A — Supabase CLI (recommandé)** :
```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz
sudo mv supabase /usr/local/bin/
cd /opt/airballistik
supabase link --project-ref <ref-local>   # N/A en self-hosted pur
```
Comme `link` est cloud-only, **fallback recommandé** :

**Option B — psql direct sur la stack Docker** :
```bash
cd /opt/supabase-stack/docker
docker compose exec -T db psql -U postgres -d postgres \
  < /opt/airballistik/supabase/migrations/20260420000000_ia1_init.sql
```
Vérif SQL (via Studio → SQL editor) :
```sql
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('user_roles','app_settings','ai_agent_configs','ai_agent_runs','ai_usage_events');
```
→ 5 lignes attendues.

### 12. Étape 9 — Déployer les Edge Functions IA-1
Supabase self-hosted Docker **inclut** le runtime functions. Procédure :
```bash
cd /opt/airballistik/supabase/functions
# Copier dans le volume attendu par la stack :
sudo mkdir -p /opt/supabase-stack/docker/volumes/functions/ai-extract-rows
sudo mkdir -p /opt/supabase-stack/docker/volumes/functions/ai-providers-test
sudo mkdir -p /opt/supabase-stack/docker/volumes/functions/_shared
sudo cp ai-extract-rows/index.ts /opt/supabase-stack/docker/volumes/functions/ai-extract-rows/
sudo cp ai-providers-test/index.ts /opt/supabase-stack/docker/volumes/functions/ai-providers-test/
sudo cp _shared/*.ts /opt/supabase-stack/docker/volumes/functions/_shared/
```
Injecter les secrets providers dans `.env` de la stack :
```
QUATARLY_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...     # optionnel
```
Reloader la stack :
```bash
cd /opt/supabase-stack/docker
docker compose up -d functions
docker compose logs -f functions   # vérifier qu'elles sont chargées
```

### 13. Étape 10 — Créer l'admin IA-1
Via Studio → Authentication → Add user (email + password). Noter l'UUID.
Puis SQL editor :
```sql
insert into public.user_roles (user_id, role)
values ('<UUID>', 'admin');
select public.has_role('<UUID>', 'admin'::public.app_role);   -- true
```

### 14. Étape 11 — Builder AirBallistik avec les clés Supabase
```bash
cd /opt/airballistik
cat > .env.production <<'EOF'
VITE_SUPABASE_URL=http://192.168.1.150:8000
VITE_SUPABASE_ANON_KEY=<ANON_KEY copié depuis supabase-stack/docker/.env>
EOF
npm run build
```
Artefact : `/opt/airballistik/dist/`.

### 15. Étape 12 — Exposer l'app : 3 options

**Option 1 — Traefik (recommandé, unifie app + Supabase sous TLS)** :
- Créer `/opt/traefik/docker-compose.yml` et `/opt/traefik/traefik.yml` (fichiers fournis en bloc, ~30 lignes).
- Réseau Docker externe partagé avec Supabase.
- Labels à ajouter dans `supabase-stack/docker/docker-compose.yml` (`traefik.enable=true`, hôte `supabase.lan`).
- Service statique pour servir `/opt/airballistik/dist` (container `nginx:alpine` avec label `Host(airballistik.lan)`).
- Entrée `/etc/hosts` côté poste client : `192.168.1.150 airballistik.lan supabase.lan`.

**Option 2 — Nginx natif** :
- `sudo apt install -y nginx`
- Config `/etc/nginx/sites-available/airballistik` : root `/opt/airballistik/dist`, `try_files $uri /index.html;`, listen 80.
- `sudo ln -s ... && sudo nginx -t && sudo systemctl reload nginx`.

**Option 3 — `vite preview` (test ultra rapide)** :
```bash
cd /opt/airballistik
npm run preview -- --host 0.0.0.0 --port 4173
```
Accès : `http://192.168.1.150:4173`. Non recommandé au-delà de 24 h.

Tableau comparatif fourni (TLS, multi-host, complexité, reload).

### 16. Étape 13 — Snapshot Proxmox
`Datacenter → airballistik-vm → Snapshots → Take Snapshot` → nom `pre-recette-ia1`.

### 17. Étape 14 — Recette E2E IA-1 (version courte)
Renvoi explicite vers `docs/ai/ia-1-runbook.md` §5 pour le protocole complet, avec rappel des 10 étapes E1→E10 et la vérif SQL sur `ai_agent_runs`.

### 18. Workflow GitHub pour la VM
- `git fetch && git pull origin main`
- `npm ci && npm run build`
- redémarrer Nginx/Traefik (reload config, pas restart)
- **toujours** snapshot Proxmox avant pull important
- **ne jamais** éditer de fichiers directement dans la VM

### 19. Checklist de validation
- [ ] VM démarre, SSH OK, UFW actif
- [ ] Docker `hello-world` OK
- [ ] Supabase Studio accessible
- [ ] 5 tables IA-1 présentes
- [ ] Edge functions chargées (logs OK)
- [ ] Admin créé, `has_role` = true
- [ ] Build AirBallistik sans erreur
- [ ] App accessible via Traefik/Nginx/preview
- [ ] `/admin/ai` → Tester providers → `keyPresent: true`
- [ ] Bouton « Importer depuis screenshot » visible sur `/cross-validation`
- [ ] Voie manuelle `PasteRowsModal` intacte
- [ ] Snapshot `pre-recette-ia1` pris

### 20. Dépannage débutant (tableau)

| Symptôme | Cause | Solution |
|---|---|---|
| VM ne boot pas UEFI | EFI disk manquant | re-créer Disk avec `efi` |
| `docker compose up` fail `permission denied` | user pas dans group docker | logout/login |
| Supabase Studio 502 | `kong` pas prêt | `docker compose logs kong`, attendre 30 s |
| ANON_KEY rejetée | JWT signé avec mauvais secret | régénérer via outil officiel avec `JWT_SECRET` à jour |
| Edge function 404 | volume mal monté | vérifier `/opt/supabase-stack/docker/volumes/functions/` |
| `403 not-admin` | ligne `user_roles` manquante | step 13 |
| App build OK mais page blanche | env vars pas lues | `grep VITE_ dist/assets/*.js` doit trouver l'URL |
| Bouton IA absent | `.env.production` pas chargé au build | rebuild après `export` |
| Port 8000 inaccessible | UFW bloque | `sudo ufw allow 8000/tcp` |
| Pull conflit git | edits locaux | `git stash && git pull` |

### 21. Recommandation finale
- Débutant : **suivre ce guide dans l'ordre strict**, snapshot Proxmox entre §6, §10, §14.
- Hardware : 4 vCPU / 8 Go RAM / 60 Go SSD.
- TLS : **Traefik + Let's Encrypt** dès que l'app quitte le LAN (hors scope test).
- Sauvegardes : dump Postgres hebdo via `docker compose exec db pg_dumpall`.
- Quand ouvrir une tranche BUILD Docker : si on veut une image OCI reproductible d'AirBallistik (Dockerfile multi-stage → nginx:alpine). Pas nécessaire aujourd'hui.

### 22. Annexes
- Fichiers `.env` Supabase avec **toutes** les clés à personnaliser (checklist).
- Gabarit `traefik.yml` + `docker-compose.yml` Traefik prêt à copier.
- Gabarit Nginx minimal.
- Commandes `pg_dumpall` / `pg_restore` pour backup/restore.

---

## Compte rendu technique (inclus en fin de document)

1. **Implémenté** : 1 document Markdown opérateur de bout en bout (Proxmox UI → Ubuntu → Docker → Supabase self-hosted → migrations IA-1 → Edge Functions → admin → build app → Traefik/Nginx/preview → recette).
2. **Modifiés** : aucun.
3. **Créés** : `docs/deploy/install-proxmox-ubuntu-supabase.md`.
4. **Supprimés** : aucun.
5. **Rôle du fichier** : guide débutant unique pour passer de Proxmox vide à AirBallistik + IA-1 opérationnels sur LAN.
6. **Points sensibles** :
   - Génération JWT `ANON_KEY`/`SERVICE_ROLE_KEY` — erreur n°1 des débutants ; procédure détaillée + test `curl` fourni.
   - Edge Functions self-hosted : montage volume critique, logs à surveiller.
   - `.env.production` doit exister **avant** `npm run build` sinon le gate `isSupabaseConfigured()` masque l'IA.
   - UFW : ouvrir 8000 (Kong) et 80/443 (Traefik/Nginx).
   - Snapshots Proxmox recommandés à 3 points (§6, §10, §14).
7. **Terminé / reste à faire** :
   - ✔ Guide complet, aucun code modifié, aucun test à rejouer.
   - ↻ À faire par l'opérateur : exécuter le guide sur `192.168.1.100:8006`, remplir la checklist, lancer la recette IA-1 `docs/ai/ia-1-runbook.md` §5.
   - ↻ Tranche future optionnelle : BUILD Docker (Dockerfile + compose) pour industrialiser, si besoin après validation recette.

