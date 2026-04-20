# Installer AirBallistik sur VM Proxmox (Ubuntu 24.04) + Supabase self-hosted

> Guide **débutant**, pas-à-pas, pour passer d'un Proxmox vide
> (`https://192.168.1.100:8006`) à AirBallistik opérationnel en LAN avec
> IA-1 (Strelok Pro screenshot → rows JSON) activée sur un Supabase
> self-hosted.
>
> **Aucun changement de code applicatif**. Ce document est une procédure
> opérateur. Si vous voulez juste tester l'app sans backend, préférez
> d'abord [install-test-environment.md](./install-test-environment.md).

---

## 1. Résumé exécutif et arbre de décision

```text
┌──────────────────────────────────────────────────────────────────┐
│  Proxmox  192.168.1.100:8006                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  VM "airballistik"  (Ubuntu 24.04 LTS, 192.168.1.150)      │  │
│  │                                                            │  │
│  │   ┌──────────────────┐     ┌─────────────────────────────┐ │  │
│  │   │ AirBallistik SPA │────▶│ Supabase self-hosted        │ │  │
│  │   │ (Vite build,     │ JWT │ Postgres + Kong + Auth      │ │  │
│  │   │  servi par       │     │ Storage + Studio + Functions│ │  │
│  │   │  Traefik/Nginx)  │     │   - ai-extract-rows         │ │  │
│  │   └──────────────────┘     │   - ai-providers-test       │ │  │
│  │                            └─────────────────────────────┘ │  │
│  │   Reverse proxy : Traefik (recommandé) | Nginx | preview   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                 ▲                                │
└─────────────────────────────────┼────────────────────────────────┘
                                  │ LAN 192.168.1.0/24
                           Poste client (navigateur)
```

**Quel reverse proxy choisir ?**

| Option | TLS auto | Multi-host (app + Supabase) | Complexité | Quand l'utiliser |
|---|---|---|---|---|
| **Traefik** ✅ recommandé | Oui (Let's Encrypt) | Oui | Moyenne | Installation pérenne, LAN ou Internet |
| Nginx natif | Manuel (certbot) | Oui mais vhost à la main | Faible | Vous connaissez déjà Nginx |
| `vite preview` | Non | Non | Très faible | Test ≤ 24 h, jamais en prod |

**Temps estimé** pour un débutant : **2 à 4 h** la première fois.

**Snapshots Proxmox recommandés** à 3 moments : après installation OS
(§3), après Docker + Supabase up (§5), avant la recette IA-1 (§10).

---

## 2. Prérequis

À réunir **avant** de commencer :

- Accès Proxmox `https://192.168.1.100:8006` avec un compte disposant
  des droits de création de VM (root@pam suffit).
- ISO **Ubuntu 24.04 LTS Server** :
  <https://ubuntu.com/download/server>. Nom de fichier attendu
  `ubuntu-24.04-live-server-amd64.iso`.
- Un terminal SSH côté poste client (macOS/Linux natifs, Windows : MobaXterm ou WSL).
- Le repo AirBallistik sur GitHub (via Connectors Lovable → GitHub).
- **Clé API Quatarly** (provider primaire IA-1). Sans elle, l'agent IA-1 échouera.
- **Clé API Google Generative Language** (fallback, facultatif mais recommandé).
- **1 screenshot Strelok Pro** d'une table balistique lisible, pour la recette finale.
- Un plan d'adressage LAN. Ce guide suppose :
  - VM = `192.168.1.150/24`
  - Gateway = `192.168.1.1`
  - Bridge Proxmox = `vmbr0`

Optionnel mais confortable : 2 entrées DNS locales (ou `/etc/hosts` côté
client) `airballistik.lan` et `supabase.lan` pointant vers
`192.168.1.150`.

### Ressources hardware conseillées pour la VM

| Profil | vCPU | RAM | Disque | Usage |
|---|---|---|---|---|
| Minimal (sans Supabase) | 2 | 4 Go | 30 Go | App seule, IA-1 off |
| **Recommandé (ce guide)** | **4** | **8 Go** | **60 Go SSD** | App + Postgres + Kong + Auth + Storage + Studio + Functions |
| Confortable durable | 6 | 16 Go | 100 Go SSD | idem + marge logs et snapshots |

---

## 3. Étape 1 — Créer la VM sur Proxmox

### 3.1 Uploader l'ISO Ubuntu (si absente)

1. Dans l'UI Proxmox, panneau de gauche, cliquer sur `local` (ou le
   storage qui a le rôle `ISO image`).
2. Onglet **ISO Images** → bouton **Upload**.
3. Sélectionner `ubuntu-24.04-live-server-amd64.iso`, valider.
4. Attendre la fin de l'upload.

### 3.2 Créer la VM

En haut à droite de l'UI : **Create VM**. Renseigner les onglets :

| Onglet | Champ | Valeur |
|---|---|---|
| General | VM ID | `150` |
| General | Name | `airballistik` |
| OS | ISO image | `ubuntu-24.04-live-server-amd64.iso` |
| OS | Type | `Linux`, Version `6.x - 2.6 Kernel` |
| System | Machine | `q35` |
| System | BIOS | `OVMF (UEFI)` |
| System | EFI Storage | `local-lvm`, cocher `Pre-enroll keys` |
| System | Qemu Agent | coché |
| Disks | Storage | `local-lvm` |
| Disks | Disk size | `60` Go |
| Disks | Cache | `Write back` |
| Disks | Discard + SSD emulation | cochés |
| CPU | Cores | `4` |
| CPU | Type | `host` |
| Memory | Memory | `8192` Mo |
| Memory | Ballooning Device | coché |
| Network | Bridge | `vmbr0` |
| Network | Model | `VirtIO (paravirtualized)` |
| Network | Firewall | décoché (on gère UFW dans la VM) |

Confirm → **Start** la VM, puis ouvrir la console (`>_ Console`).

---

## 4. Étape 2 — Installer Ubuntu 24.04 Server

L'installeur Ubuntu guide en mode texte. Points-clés :

- **Langue** : English (claviers FR sélectionnables ensuite).
- **Keyboard** : French si clavier AZERTY.
- **Type of install** : `Ubuntu Server` (pas Minimized).
- **Network** : éditer l'interface, choisir **IPv4 Manual** :
  - Subnet : `192.168.1.0/24`
  - Address : `192.168.1.150`
  - Gateway : `192.168.1.1`
  - Name servers : `1.1.1.1, 9.9.9.9`
- **Proxy** : laisser vide.
- **Mirror** : par défaut.
- **Storage** : `Use an entire disk` + LVM. Chiffrement optionnel.
- **Profile** :
  - Your name : `airadmin`
  - Server's name : `airballistik-vm`
  - Username : `airadmin`
  - Password : **mot de passe fort**
- **SSH** : cocher **Install OpenSSH server**.
- **Featured server snaps** : **ne rien cocher** (surtout pas Docker
  snap, on prendra la version officielle apt).

Reboot, retirer l'ISO (Hardware → CD/DVD Drive → `Do not use any
media`), relancer.

> ✅ **Snapshot Proxmox** : VM → Snapshots → Take Snapshot →
> `post-os-install`. Permet un rollback propre en cas d'erreur plus loin.

---

## 5. Étape 3 — Premiers réglages système

Depuis votre poste :

```bash
ssh airadmin@192.168.1.150
```

Puis dans la VM :

```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Outils indispensables
sudo apt install -y git curl ca-certificates gnupg ufw htop unzip nano

# Fuseau horaire
sudo timedatectl set-timezone Europe/Paris

# Pare-feu minimal
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Explication :
- `apt upgrade` : applique tous les patchs sécurité.
- `ufw` : firewall front. On ouvre 22 (SSH), 80 (HTTP), 443 (HTTPS).
- On ouvrira ponctuellement 8000 (Kong/Supabase) ou 4173 (vite preview)
  selon l'option de déploiement choisie.

---

## 6. Étape 4 — Installer Docker + Compose

Docker officiel via le repo apt (pas la version Snap) :

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker airadmin
```

**Important** : quitter la session SSH puis revenir (`exit` + `ssh ...`)
pour que le groupe `docker` soit effectif.

Vérif :
```bash
docker run --rm hello-world
docker compose version
```

---

## 7. Étape 5 — Installer Node 20 LTS

On utilise NodeSource :

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
npm -v    # 10.x
```

---

## 8. Étape 6 — Cloner AirBallistik (build plus tard)

```bash
cd /home/airadmin
git clone https://github.com/<user>/<repo>.git airballistik
cd /home/airadmin/airballistik
npm install
```

> ℹ️ **Pourquoi `npm install` et pas `npm ci` ?** Le projet utilise **bun**
> en interne (Lovable). Le fichier `package-lock.json` peut être
> désynchronisé de `package.json`. `npm install` régénère le lock file,
> tandis que `npm ci` exige une synchronisation parfaite et échouera.
> Si vous préférez bun : `curl -fsSL https://bun.sh/install | bash && bun install`.

> ⚠️ **Ne faites pas `npm run build` tout de suite.** Vite inclut les
> variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` **au moment
> du build**. Si on build avant d'avoir Supabase, l'app sera gelée en
> mode sans backend et le bouton IA restera masqué (vous devrez
> reconstruire). On build à l'étape §11.

---

## 9. Étape 7 — Installer Supabase self-hosted (Docker)

### 9.1 Récupérer la stack

```bash
cd /home/airadmin
git clone --depth 1 https://github.com/supabase/supabase.git supabase-stack
cd supabase-stack/docker
cp .env.example .env
```

### 9.2 Générer des secrets forts

```bash
# À exécuter une seule fois, noter les valeurs :
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "DASHBOARD_PASSWORD=$(openssl rand -hex 24)"
```

### 9.3 Générer ANON_KEY et SERVICE_ROLE_KEY

Ces deux clés sont des **JWT signés avec `JWT_SECRET`**. Erreur n°1 des
débutants : utiliser les valeurs d'exemple → toutes les requêtes
remontent `Invalid JWT`.

Utilisez l'outil officiel :

- Navigateur → <https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys>
- Coller le `JWT_SECRET` généré ci-dessus.
- L'outil génère 2 JWT : `anon` (role `anon`) et `service_role` (role
  `service_role`). Copier-coller les dans `.env`.

**Alternative CLI** (100% local) :

> ⚠️ **Important** : la commande `export JWT_SECRET="..."` doit être exécutée **avant** le script Python, dans le même terminal. Sans elle, le script échoue avec `KeyError: 'JWT_SECRET'`.

```bash
# 1. Exporter JWT_SECRET AVANT de lancer le script
export JWT_SECRET="<coller la valeur générée au §9.2>"

# 2. Créer un venv temporaire + installer pyjwt (Ubuntu 24.04 interdit pip global — PEP 668)
python3 -m venv /tmp/jwt-venv
/tmp/jwt-venv/bin/pip install pyjwt
/tmp/jwt-venv/bin/python3 - <<'PY'
import jwt, time, os
secret = os.environ["JWT_SECRET"]
now = int(time.time())
exp = now + 60*60*24*365*10  # 10 ans
print("ANON_KEY=" + jwt.encode(
    {"role": "anon", "iss": "supabase", "iat": now, "exp": exp},
    secret, algorithm="HS256"))
print("SERVICE_ROLE_KEY=" + jwt.encode(
    {"role": "service_role", "iss": "supabase", "iat": now, "exp": exp},
    secret, algorithm="HS256"))
PY

# 3. Nettoyer le venv temporaire
rm -rf /tmp/jwt-venv
```

### 9.4 Éditer `.env`

```bash
cd /home/airadmin/supabase-stack/docker
nano .env
```

Champs à mettre à jour **obligatoirement** :

| Clé | Valeur |
|---|---|
| `POSTGRES_PASSWORD` | valeur générée §9.2 |
| `JWT_SECRET` | valeur générée §9.2 |
| `ANON_KEY` | JWT généré §9.3 |
| `SERVICE_ROLE_KEY` | JWT généré §9.3 |
| `DASHBOARD_USERNAME` | `admin` (ou autre) |
| `DASHBOARD_PASSWORD` | valeur générée §9.2 |
| `SITE_URL` | `http://192.168.1.150` (ajustera avec Traefik plus tard) |
| `API_EXTERNAL_URL` | `http://192.168.1.150:8000` |
| `SUPABASE_PUBLIC_URL` | `http://192.168.1.150:8000` |
| `SMTP_*` | vide pour l'instant |

Ajouter à la fin du fichier les secrets providers pour les Edge
Functions IA-1 (utilisés à §11 et §12) :
```
QUATARLY_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
```

### 9.5 Lancer la stack

```bash
cd /home/airadmin/supabase-stack/docker
docker compose pull
docker compose up -d
docker compose ps
```

Vérifier que tous les services sont `healthy` (compter ~1 min). Ouvrir
le pare-feu pour Kong :
```bash
sudo ufw allow 8000/tcp
```

Accès :
- **Studio** : <http://192.168.1.150:8000> (login `DASHBOARD_USERNAME` /
  `DASHBOARD_PASSWORD`).
- **API Kong** : <http://192.168.1.150:8000/rest/v1/> (avec header
  `apikey: <ANON_KEY>`).

> ✅ **Snapshot Proxmox** : `post-supabase-up`.

---

## 10. Étape 8 — Appliquer les migrations IA-1

Les migrations du repo AirBallistik se trouvent dans
`/home/airadmin/airballistik/supabase/migrations/`. La plus importante est
`20260420000000_ia1_init.sql` (crée `user_roles`, `has_role`,
`app_settings`, `ai_agent_configs`, `ai_agent_runs`, `ai_usage_events`).

On utilise `psql` directement dans le conteneur `db` :

```bash
cd /home/airadmin/supabase-stack/docker
for f in /home/airadmin/airballistik/supabase/migrations/*.sql; do
  echo "==> Applying $f"
  docker compose exec -T db psql -U postgres -d postgres < "$f"
done
```

**Vérification** via Studio → SQL editor :
```sql
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name in (
     'user_roles', 'app_settings',
     'ai_agent_configs', 'ai_agent_runs', 'ai_usage_events'
   )
 order by table_name;
```
→ doit retourner **5 lignes**.

```sql
select slug, provider, model, enabled
  from public.ai_agent_configs;
```
→ doit retourner au moins `cross-validation-strelok-rows`.

---

## 11. Étape 9 — Déployer les Edge Functions IA-1

Les Edge Functions sont deux fichiers TypeScript dans
`/home/airadmin/airballistik/supabase/functions/`. On les monte dans le volume
attendu par le conteneur `functions` de la stack Supabase.

```bash
STACK=/home/airadmin/supabase-stack/docker
SRC=/home/airadmin/airballistik/supabase/functions

mkdir -p $STACK/volumes/functions/ai-extract-rows
mkdir -p $STACK/volumes/functions/ai-providers-test
mkdir -p $STACK/volumes/functions/_shared

cp $SRC/ai-extract-rows/index.ts    $STACK/volumes/functions/ai-extract-rows/
cp $SRC/ai-providers-test/index.ts  $STACK/volumes/functions/ai-providers-test/
cp $SRC/_shared/*.ts                $STACK/volumes/functions/_shared/
```

Recharger la stack pour embarquer les nouveaux secrets providers et les
nouvelles fonctions :
```bash
cd /home/airadmin/supabase-stack/docker
docker compose up -d functions
docker compose logs -f functions
```
(`Ctrl+C` pour quitter les logs une fois les fonctions chargées.)

**Smoke test** (sans auth, doit répondre 401 Unauthorized — c'est bon
signe, ça veut dire que la fonction est servie) :
```bash
curl -i http://192.168.1.150:8000/functions/v1/ai-providers-test
```

---

## 12. Étape 10 — Créer l'utilisateur admin IA-1

1. Studio → **Authentication** → **Add user** → renseigner email +
   password. Cocher `Auto Confirm User`.
2. Copier l'UUID de l'utilisateur créé (colonne `ID`).
3. Studio → **SQL editor** :

```sql
insert into public.user_roles (user_id, role)
values ('<UUID>', 'admin');

select public.has_role('<UUID>', 'admin'::public.app_role);
-- doit renvoyer : true
```

---

## 13. Étape 11 — Builder AirBallistik avec les clés Supabase

Récupérer `ANON_KEY` depuis `/home/airadmin/supabase-stack/docker/.env`, puis :

```bash
cd /home/airadmin/airballistik
cat > .env.production <<EOF
VITE_SUPABASE_URL=http://192.168.1.150:8000
VITE_SUPABASE_ANON_KEY=<COLLER ANON_KEY ICI>
EOF

npm run build
```

Artefact produit : `/home/airadmin/airballistik/dist/` (fichiers statiques
servables par n'importe quel reverse proxy).

**Contrôle rapide** que les variables sont bien embarquées :
```bash
grep -r "192.168.1.150" dist/assets/ | head -n 2
```
Vous devez voir l'URL apparaître dans un ou deux chunks JS.

---

## 14. Étape 12 — Exposer l'application

Trois options, choisissez-en **une**.

### Option 1 — Traefik (recommandé)

Unifie AirBallistik + Supabase sous un proxy commun, gère TLS si vous
exposez plus tard sur Internet.

```bash
mkdir -p /home/airadmin/traefik
cd /home/airadmin/traefik
```

`/home/airadmin/traefik/traefik.yml` :
```yaml
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"
providers:
  docker:
    exposedByDefault: false
    network: web
api:
  dashboard: true
  insecure: true  # LAN uniquement
```

`/home/airadmin/traefik/docker-compose.yml` :
```yaml
services:
  traefik:
    image: traefik:v3.1
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"   # dashboard Traefik (LAN)
    volumes:
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks: [web]

  airballistik:
    image: nginx:alpine
    container_name: airballistik-web
    restart: unless-stopped
    volumes:
      - /home/airadmin/airballistik/dist:/usr/share/nginx/html:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.airballistik.rule=Host(`airballistik.lan`)"
      - "traefik.http.routers.airballistik.entrypoints=web"
      - "traefik.http.services.airballistik.loadbalancer.server.port=80"
    networks: [web]

networks:
  web:
    name: web
```

Nginx interne du conteneur `airballistik-web` a besoin d'un fallback
SPA. Créer `/home/airadmin/airballistik/nginx-spa.conf` :
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```
Et monter le fichier dans le service `airballistik` :
```yaml
      - /home/airadmin/airballistik/nginx-spa.conf:/etc/nginx/conf.d/default.conf:ro
```

**Rattacher Supabase Kong à Traefik** : éditer
`/home/airadmin/supabase-stack/docker/docker-compose.yml`, dans le service
`kong`, ajouter :
```yaml
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.supabase.rule=Host(`supabase.lan`)"
      - "traefik.http.routers.supabase.entrypoints=web"
      - "traefik.http.services.supabase.loadbalancer.server.port=8000"
    networks:
      - default
      - web
```
Et tout en bas du fichier, déclarer le réseau externe :
```yaml
networks:
  web:
    external: true
```
Relancer :
```bash
cd /home/airadmin/traefik && docker compose up -d
cd /home/airadmin/supabase-stack/docker && docker compose up -d
```

**Côté poste client**, éditer `/etc/hosts` (macOS/Linux) ou
`C:\Windows\System32\drivers\etc\hosts` (Windows) :
```
192.168.1.150 airballistik.lan supabase.lan
```

N'oubliez pas de **re-builder AirBallistik** avec la bonne URL Supabase :
```bash
cd /home/airadmin/airballistik
sed -i 's#VITE_SUPABASE_URL=.*#VITE_SUPABASE_URL=http://supabase.lan#' .env.production
npm run build
```

Accès : <http://airballistik.lan> et <http://supabase.lan>.

### Option 2 — Nginx natif

```bash
sudo apt install -y nginx
sudo tee /etc/nginx/sites-available/airballistik > /dev/null <<'EOF'
server {
  listen 80 default_server;
  server_name _;
  root /home/airadmin/airballistik/dist;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
EOF
sudo ln -sf /etc/nginx/sites-available/airballistik /etc/nginx/sites-enabled/airballistik
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
Accès : <http://192.168.1.150>.

### Option 3 — `vite preview` (test jetable uniquement)

```bash
cd /home/airadmin/airballistik
sudo ufw allow 4173/tcp
npm run preview -- --host 0.0.0.0 --port 4173
```
Accès : <http://192.168.1.150:4173>. **Non recommandé au-delà de 24 h**
(pas de HTTPS, pas de cache, crashe si la session SSH se ferme sans
`tmux`).

---

## 15. Étape 13 — Snapshot avant recette

Avant de tester IA-1 en réel, **prenez un snapshot Proxmox** :
`Datacenter → airballistik-vm → Snapshots → Take Snapshot →
pre-recette-ia1`.

Il permet de rejouer la recette sans rebuilder si un test casse l'état
de la DB.

---

## 16. Étape 14 — Recette E2E IA-1 (version courte)

La procédure complète est dans
[../ai/ia-1-runbook.md](../ai/ia-1-runbook.md) **§5 — Protocole de
recette E2E**. Résumé des 10 étapes :

1. **E1** : ouvrir l'app, se connecter avec le compte admin.
2. **E2** : aller sur `/admin/ai` → **Tester providers** → vérifier
   `Quatarly · keyPresent: true` (et Google si clé fournie).
3. **E3** : aller sur `/cross-validation`, vérifier la présence du
   bouton **« Importer depuis screenshot (Strelok Pro) »**.
4. **E4** : ouvrir la modale, accepter le consentement.
5. **E5** : uploader 1 screenshot (< 4 Mo, png/jpg/webp).
6. **E6** : observer le spinner « Analyse en cours ».
7. **E7** : vérifier que le panneau de revue montre des `rows[]` avec
   `range` obligatoire et des cellules éditables.
8. **E8** : corriger / supprimer les lignes incertaines, vérifier la
   bannière jaune « Brouillon IA non vérifié ».
9. **E9** : cliquer **Confirmer**, vérifier dans
   `/cross-validation` que la référence Strelok Pro contient
   `extractionMethod: 'screenshot-ai'` et `confidence: 'C'`.
10. **E10** : vérifier côté serveur via Studio → SQL editor :

```sql
select id, agent_slug, provider, model, status,
       latency_ms, fallback_used, created_at
  from public.ai_agent_runs
 order by created_at desc
 limit 1;
```
Le run doit être `success` (sinon, voir §18 Dépannage).

---

## 17. Workflow GitHub pour la VM

**Règle d'or** : **ne jamais éditer de fichier dans la VM**. Tout passe
par GitHub.

Mise à jour normale :
```bash
cd /home/airadmin/airballistik
git fetch
git pull origin main
npm install
npm run build
# Si Nginx natif :
sudo systemctl reload nginx
# Si Traefik + conteneur nginx:alpine : rien à faire, volume monté
```

Avant chaque `pull` important : **snapshot Proxmox**.

Si un conflit apparaît (signe qu'un fichier a été modifié localement) :
```bash
git status
git stash
git pull origin main
git stash drop   # on jette la modif locale
```

---

## 18. Checklist de validation

- [ ] VM démarre, SSH OK, UFW actif (`sudo ufw status`)
- [ ] `docker run --rm hello-world` OK
- [ ] `docker compose ps` dans `supabase-stack/docker` : tous `healthy`
- [ ] Studio accessible via navigateur
- [ ] Les 5 tables IA-1 sont présentes (§10)
- [ ] Agent `cross-validation-strelok-rows` présent dans `ai_agent_configs`
- [ ] Edge Functions chargées (logs `docker compose logs functions`)
- [ ] `curl http://192.168.1.150:8000/functions/v1/ai-providers-test` renvoie 401 (pas 404)
- [ ] Admin créé et `has_role` retourne `true`
- [ ] `npm run build` réussit sans erreur
- [ ] `grep -r "192.168.1.150\|supabase.lan" dist/assets/` trouve l'URL
- [ ] App accessible via l'option choisie (Traefik / Nginx / preview)
- [ ] `/admin/ai` → **Tester providers** → `keyPresent: true`
- [ ] Bouton **Importer depuis screenshot** visible sur `/cross-validation`
- [ ] Voie manuelle (**PasteRowsModal**) fonctionne indépendamment
- [ ] Snapshot `pre-recette-ia1` pris

---

## 19. Dépannage débutant

| Symptôme | Cause probable | Solution |
|---|---|---|
| VM ne boot pas en UEFI | EFI disk manquant | Hardware → Add → EFI Disk (`local-lvm`) |
| `docker compose up` → `permission denied` sur socket | user pas dans groupe docker | `sudo usermod -aG docker airadmin` + logout/login |
| Studio renvoie 502 Bad Gateway | `kong` pas encore prêt | `docker compose logs kong`, attendre 30–60 s |
| Toutes les requêtes Supabase : `Invalid JWT` | `ANON_KEY` / `JWT_SECRET` incohérents | Régénérer `ANON_KEY` avec le `JWT_SECRET` du `.env` actuel (§9.3) |
| `401` sur `/functions/v1/...` sans header | normal, c'est la vérif JWT | rien à faire côté infra |
| `404` sur `/functions/v1/ai-extract-rows` | volume mal monté | vérifier `ls /home/airadmin/supabase-stack/docker/volumes/functions/ai-extract-rows/index.ts` |
| App renvoie `403 not-admin` | ligne `user_roles` manquante | re-exécuter §12 avec le bon UUID |
| Build OK mais page blanche | mauvais base path ou `try_files` absent | vérifier la conf Nginx / nginx-spa.conf |
| Bouton IA absent (alors que configuré) | `.env.production` pas lu au build | refaire `cat .env.production && npm run build` |
| Port 8000 inaccessible depuis le poste | UFW bloque | `sudo ufw allow 8000/tcp` |
| `git pull` : conflit | édition locale dans la VM | `git stash && git pull`, ne plus éditer dans la VM |
| Edge Function renvoie 500 | provider KO ou schema Zod | `docker compose logs -f functions` puis corriger `.env` ou prompt |
| Upload screenshot rejeté | > 4 Mo ou type non supporté | recadrer / convertir en png/jpg/webp < 4 Mo |

---

## 20. Recommandations finales

- **Suivre l'ordre strict** du guide (§3 → §16). Sauter une étape = perdre 1 h à diagnostiquer.
- **Hardware** : 4 vCPU / 8 Go RAM / 60 Go SSD.
- **Reverse proxy** : Traefik (§14 option 1) pour une installation pérenne.
- **TLS** : activer Let's Encrypt dans Traefik **dès que l'app quitte le LAN** (non couvert ici, voir doc Traefik `certificatesResolvers`).
- **Sauvegardes** : `pg_dumpall` hebdo (§22) + snapshot Proxmox quotidien.
- **Quand ouvrir une tranche BUILD Docker** : quand vous voulez une image OCI reproductible d'AirBallistik (multi-stage → `nginx:alpine`). Pas nécessaire pour une install LAN.

---

## 21. Annexes

### 21.1 Checklist `.env` Supabase (self-hosted)

Valeurs **obligatoirement** personnalisées avant `docker compose up` :
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ANON_KEY`
- `SERVICE_ROLE_KEY`
- `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`
- `SITE_URL`
- `API_EXTERNAL_URL`
- `SUPABASE_PUBLIC_URL`
- `QUATARLY_API_KEY` (ajouté pour les Edge Functions IA-1)
- `GOOGLE_AI_API_KEY` (optionnel, fallback IA-1)

### 21.2 Backup / restore Postgres

```bash
# Dump complet (tous les schémas + rôles)
docker compose -f /home/airadmin/supabase-stack/docker/docker-compose.yml \
  exec -T db pg_dumpall -U postgres > /home/airadmin/backups/supabase-$(date +%F).sql

# Restore (sur instance vierge)
docker compose -f /home/airadmin/supabase-stack/docker/docker-compose.yml \
  exec -T db psql -U postgres < /home/airadmin/backups/supabase-YYYY-MM-DD.sql
```

Automatiser via cron :
```bash
mkdir -p /home/airadmin/backups
(crontab -l 2>/dev/null; echo "0 3 * * * cd /home/airadmin/supabase-stack/docker && docker compose exec -T db pg_dumpall -U postgres > /home/airadmin/backups/supabase-\$(date +\\%F).sql") | crontab -
```

### 21.3 Arrêt / redémarrage propres

```bash
# Arrêt
cd /home/airadmin/traefik && docker compose stop
cd /home/airadmin/supabase-stack/docker && docker compose stop
# Redémarrage
cd /home/airadmin/supabase-stack/docker && docker compose up -d
cd /home/airadmin/traefik && docker compose up -d
```

---

## 22. Compte rendu technique

1. **Implémenté** : 1 guide opérateur Markdown couvrant création VM Proxmox → Ubuntu 24.04 → Docker → Supabase self-hosted → migrations IA-1 → Edge Functions → admin → build AirBallistik → exposition Traefik/Nginx/preview → recette E2E → dépannage → backups.
2. **Fichiers modifiés** : aucun.
3. **Fichiers créés** : `docs/deploy/install-proxmox-ubuntu-supabase.md`.
4. **Fichiers supprimés** : aucun.
5. **Rôle du changement** : doc-only, aucune modification moteur / harness / tests / UI. Fournit un runbook débutant complet pour la mise en service IA-1 sur `192.168.1.100:8006`.
6. **Points sensibles** :
   - Génération `ANON_KEY` / `SERVICE_ROLE_KEY` avec le bon `JWT_SECRET` = erreur n°1 des débutants ; procédure détaillée fournie (outil officiel + fallback Python local).
   - Montage volumes Edge Functions (`/home/airadmin/supabase-stack/docker/volumes/functions/...`) : oublier un fichier = 404 côté client.
   - `.env.production` **avant** `npm run build` sinon `isSupabaseConfigured()` renvoie `false` et le bouton IA reste masqué.
   - Traefik nécessite un réseau Docker externe partagé + labels côté Kong Supabase ; explication fournie mais à suivre précisément.
   - UFW : penser à `allow 8000/tcp` (Kong direct) ou 80/443 (Traefik/Nginx).
   - Snapshots Proxmox conseillés à 3 points (§4, §9.5, §15) pour faciliter les rollbacks.
7. **Terminé / reste à faire** :
   - ✔ Guide exploitable, rien à modifier côté code.
   - ↻ Opérateur : exécuter le guide sur `192.168.1.100:8006`, cocher la checklist §18, lancer la recette IA-1 (`docs/ai/ia-1-runbook.md` §5).
   - ↻ Future tranche optionnelle : BUILD Docker pour AirBallistik (Dockerfile multi-stage + compose) si industrialisation souhaitée.