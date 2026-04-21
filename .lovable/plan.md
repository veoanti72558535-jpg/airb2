

# AUDIT NAVIGATION / ROUTES + GUIDE MISE A JOUR VM

## 1. RESUME EXECUTIF

Cette tranche produit deux livrables documentaires sans aucun changement de code :

- **Partie A** : Audit systématique de toutes les routes, pages et liens de navigation. Deux cas non exposés confirmés : `/admin/ai` et `/compare`.
- **Partie B** : Guide opérateur complet de mise a jour VM apres modifications Lovable/GitHub, couvrant tous les cas de figure.

Livrable final : un fichier `docs/deploy/vm-update-guide.md` et un fichier `docs/audit/navigation-routes-audit.md`.

---

## 2. AUDIT NAVIGATION / ROUTES

### Tableau complet

| Route | Page | Dans la navigation ? | Condition d'acces | Statut | Recommandation |
|---|---|---|---|---|---|
| `/` | Dashboard | Oui (mainNav) | Aucune | OK | — |
| `/calc` | QuickCalc | Oui (mainNav) | Aucune | OK | — |
| `/library` | LibraryPage (onglets) | Oui (mainNav) | Aucune | OK | — |
| `/library/airgun/:id` | AirgunDetailPage | Non (lien contextuel depuis library) | Aucune | OK — intentionnel | Detail accessible via liste |
| `/library/projectile/:id` | ProjectileDetailPage | Non (lien contextuel) | Aucune | OK — intentionnel | Detail accessible via liste |
| `/library/optic/:id` | OpticDetailPage | Non (lien contextuel) | Aucune | OK — intentionnel | Detail accessible via liste |
| `/library/reticles` | ReticlesPage | Non (onglet dans LibraryPage) | Aucune | OK — intentionnel | Aussi monte comme route directe |
| `/library/reticles/:id` | ReticleDetailPage | Non (lien contextuel) | Aucune | OK — intentionnel | Detail accessible via liste |
| `/sessions` | SessionsPage | Oui (mainNav) | Aucune | OK | — |
| `/compare` | ComparePage | **Non** | Aucune | **Cachee intentionnellement** | Accessible via bouton Comparer dans Sessions et QuickCalc. Pas de lien direct dans les menus. A clarifier si un raccourci menu serait utile |
| `/conversions` | ConversionsPage | Oui (moreNav) | Aucune | OK | — |
| `/docs` | DocsPage | Oui (moreNav) | Aucune | OK | — |
| `/search` | SearchPage | Oui (moreNav) | Aucune | OK | — |
| `/cross-validation` | CrossValidationPage | Oui (moreNav) | Aucune | OK | Le bouton IA-1 dans cette page est conditionnel (Supabase connecte) |
| `/settings` | SettingsPage | Oui (moreNav) | Aucune | OK | — |
| `/admin` | AdminPage | Oui (moreNav) | Aucune | OK | — |
| `/admin/ai` | AdminAiPage | **Non** | Supabase connecte | **Probable oubli** | Aucun lien ne pointe vers cette page. Ni le menu, ni AdminPage. Accessible uniquement par URL directe |
| `/airguns` | LibraryPage (legacy) | Non | Aucune | OK — intentionnel | Redirect legacy, pas besoin de menu |
| `/projectiles` | LibraryPage (legacy) | Non | Aucune | OK — intentionnel | Redirect legacy |
| `/optics` | LibraryPage (legacy) | Non | Aucune | OK — intentionnel | Redirect legacy |

---

## 3. CAS CONFIRMES

### `/admin/ai` — Probable oubli

- **Route declaree** dans `App.tsx` ligne 55
- **Page existante** : `src/pages/AdminAiPage.tsx`
- **Aucun lien** dans `Layout.tsx` (ni mainNav, ni moreNav)
- **Aucun lien** dans `AdminPage.tsx` (aucune reference a `/admin/ai`)
- **Accessible uniquement** par URL directe : `/admin/ai`
- **Verdict** : oubli confirme. AdminPage devrait contenir un lien/bouton vers la sous-page IA.

### `/compare` — Cache intentionnellement

- **Route declaree** dans `App.tsx` ligne 49
- **Page existante** : `src/pages/ComparePage.tsx`
- **Pas dans les menus** : ni mainNav, ni moreNav
- **Accessible via** : bouton "Comparer" dans SessionsPage (navigation programmatique `navigate('/compare?a=...&b=...')`) et depuis QuickCalc
- **Verdict** : cache intentionnellement. La page necessite des parametres URL (deux IDs de session), un lien menu n'aurait pas de sens sans contexte.

---

## 4. CAS PROBABLES OU A CLARIFIER

1. **`/admin/ai` non relie a `/admin`** : faut-il ajouter un bouton/lien dans AdminPage vers `/admin/ai` ? Ou un sous-menu admin ? A decider.

2. **`/compare` sans raccourci** : actuellement OK, mais si un utilisateur veut retrouver une comparaison, il doit repasser par Sessions. Pas un oubli, mais une amelioration possible (historique de comparaisons ou lien depuis Dashboard).

3. **Cross-validation et IA** : le bouton "Importer depuis screenshot" dans CrossValidationPage est conditionnel (Supabase connecte + agent active). Ce n'est pas un probleme de route mais d'affordance — l'utilisateur ne sait pas pourquoi le bouton est absent sans Supabase. C'est documente dans le code mais pas forcement visible pour l'operateur.

---

## 5. RECOMMANDATIONS DE NAVIGATION

Pour une future tranche BUILD (pas cette tranche) :

1. **Ajouter un lien `/admin/ai` dans AdminPage** — un bouton ou une carte "Configuration IA" qui navigue vers `/admin/ai`. Conditionnel a `isSupabaseConfigured()`.

2. **Aucune action necessaire pour `/compare`** — le pattern actuel (navigation programmatique avec parametres) est correct.

3. **Optionnel** : ajouter un indicateur visuel sur la page `/admin` quand Supabase est configure, avec le lien vers `/admin/ai`.

---

## 6. GUIDE SPECIAL MISE A JOUR VM

### 6.1 Principe de mise a jour

**Workflow recommande :**

```text
Lovable (editer) → GitHub (sync auto) → VM (git pull + rebuild)
```

**Ce qu'il ne faut PAS faire :**
- Ne jamais modifier les fichiers directement sur la VM (sauf `.env` et fichiers de configuration locale)
- Ne jamais faire `git commit` sur la VM — cela cree des conflits
- Ne jamais supprimer `node_modules` puis reinstaller sans raison

**Pourquoi :** La VM est un environnement de deploiement, pas de developpement. Lovable et GitHub sont la source de verite.

### 6.2 Checklist avant mise a jour

1. Verifier que les changements Lovable sont visibles sur GitHub (commits recents)
2. Identifier le type de changement (voir section 6.4)
3. Si changement Supabase/migrations/edge functions : snapshot Proxmox **obligatoire**
4. Si changement front simple : snapshot **optionnel** (recommande si premiere fois)
5. Verifier que personne n'utilise l'app pendant la mise a jour

### 6.3 Procedure standard de mise a jour

```bash
# 1. Se connecter en SSH
ssh airadmin@192.168.1.150

# 2. Aller dans le repo
cd /home/airadmin/airballistik

# 3. Verifier la branche (doit etre main)
git branch

# 4. Recuperer les changements
git fetch origin

# 5. Verifier ce qui a change
git log --oneline HEAD..origin/main

# 6. Appliquer les changements
git pull origin main

# 7. Installer les dependances si package.json a change
npm install

# 8. Rebuilder l'application
npm run build

# 9. Copier le build dans le conteneur Nginx
# (adapter selon votre configuration Docker)
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/

# 10. Verifier que l'app repond
curl -s -o /dev/null -w "%{http_code}" http://localhost/
# Doit retourner 200

# 11. Tester dans le navigateur
# Ouvrir http://192.168.1.150 ou http://airballistik.lan
```

### 6.4 Cas selon le type de changement

#### A. Changement front simple (UI, composants, styles)

```bash
git pull origin main
npm run build
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/
```

Verifier : pages modifiees, pas d'erreur console.

#### B. Changement docs seulement

```bash
git pull origin main
```

Rien d'autre. Les docs sont dans le repo mais pas servies par l'app.

#### C. Nouvelles dependances npm

```bash
git pull origin main
npm install       # regenere node_modules
npm run build
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/
```

Verifier : `npm install` sans erreur, build OK.

#### D. Variables d'environnement (VITE_*)

```bash
git pull origin main
# Editer .env si nouvelles variables ajoutees
nano .env
# IMPORTANT : les variables VITE_* sont injectees AU BUILD
npm run build
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/
```

Verifier : `grep "VITE_" dist/assets/*.js | head` pour confirmer les valeurs.

#### E. Changement Supabase self-hosted (config, RLS)

Snapshot Proxmox obligatoire avant.

```bash
git pull origin main
# Appliquer les nouvelles migrations
for f in /home/airadmin/airballistik/supabase/migrations/*.sql; do
  echo "==> $f"
  docker compose -f /home/airadmin/supabase-stack/docker/docker-compose.yml \
    exec -T db psql -U postgres -d postgres < "$f"
done
# Puis rebuild si front modifie aussi
npm run build
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/
```

Verifier : pas d'erreur SQL, tables presentes.

#### F. Nouvelles migrations SQL

Meme procedure que E. Les migrations sont idempotentes (DROP IF EXISTS + CREATE), donc les rejouer n'est pas destructif.

#### G. Edge Functions modifiees

```bash
git pull origin main
# Copier les fichiers mis a jour
STACK=/home/airadmin/supabase-stack/docker
cp supabase/functions/ai-extract-rows/index.ts $STACK/volumes/functions/ai-extract-rows/
cp supabase/functions/ai-providers-test/index.ts $STACK/volumes/functions/ai-providers-test/
cp -r supabase/functions/_shared/* $STACK/volumes/functions/_shared/
# Redemarrer le conteneur functions
docker compose -f $STACK/docker-compose.yml restart functions
```

Verifier : `/admin/ai` > "Tester providers".

#### H. Changement purement UI/navigation

Identique a A. Rebuild + copie dist.

### 6.5 Snapshot Proxmox

| Quand | Obligatoire ? |
|---|---|
| Avant migration SQL | **Oui** |
| Avant changement Edge Functions | **Oui** |
| Avant changement front simple | Non (recommande si premiere mise a jour) |
| Avant changement `.env` | Recommande |
| Avant grosse mise a jour (10+ commits) | Recommande |

**Nommage** : `pre-update-YYYY-MM-DD-description`

Exemple : `pre-update-2026-04-21-ia1-migration`

**Quand rollback** : si l'app ne demarre plus, si les donnees sont corrompues, si une migration SQL echoue a mi-chemin.

### 6.6 Validation apres mise a jour

Checklist :

- [ ] Page d'accueil `/` charge sans erreur
- [ ] Quick Calc `/calc` fonctionne (saisir des valeurs, calculer)
- [ ] Sessions `/sessions` affiche les sessions existantes
- [ ] Library `/library` affiche les onglets
- [ ] Cross-validation `/cross-validation` charge
- [ ] Admin `/admin` charge
- [ ] `/admin/ai` charge (si Supabase configure)
- [ ] Bouton IA visible/cache selon configuration
- [ ] Console navigateur : pas d'erreur rouge bloquante
- [ ] Version/build coherente (verifier date de build si affichee)

### 6.7 Depannage

| Probleme | Cause probable | Solution |
|---|---|---|
| `git pull` conflit | Fichier modifie sur la VM | `git checkout -- .` puis `git pull` |
| `npm install` echoue | Node.js trop ancien ou lock file corrompu | `rm -rf node_modules && npm install` |
| `npm run build` echoue | Erreur TypeScript ou dependance manquante | Lire l'erreur, souvent `npm install` resout |
| Nginx ne sert pas le nouveau build | `dist/` pas copie | `docker cp dist/. airballistik-nginx:/usr/share/nginx/html/` |
| Variable VITE_* manquante | `.env` pas mis a jour avant build | Editer `.env`, re-builder |
| Bouton IA disparu | `VITE_SUPABASE_URL` absent au build | Verifier `.env`, re-builder |
| Route 404 au refresh | Nginx pas configure en SPA | Verifier `nginx-spa.conf` avec `try_files` |
| Supabase KO | Conteneur Docker arrete | `docker compose up -d` dans le stack Supabase |
| Edge Function non prise en compte | Fichier pas copie ou conteneur pas redemarre | Re-copier + `docker compose restart functions` |
| Migration SQL echoue | Syntaxe ou table deja modifiee | Lire l'erreur, rollback Proxmox si necessaire |
| Rollback Proxmox | Mise a jour catastrophique | Restaurer le snapshot, analyser le probleme, ouvrir tranche corrective |

---

## 7. CHECKLIST RAPIDE AVANT / PENDANT / APRES UPDATE

### Avant

- [ ] Changements visibles sur GitHub ?
- [ ] Type de changement identifie (A-H) ?
- [ ] Snapshot Proxmox si necessaire ?

### Pendant

- [ ] `git pull` sans conflit ?
- [ ] `npm install` si `package.json` modifie ?
- [ ] `npm run build` sans erreur ?
- [ ] `dist/` copie dans le conteneur ?
- [ ] Migrations SQL appliquees si besoin ?
- [ ] Edge Functions copiees + restart si besoin ?

### Apres

- [ ] App repond (HTTP 200) ?
- [ ] Pages cles fonctionnelles ?
- [ ] Pas d'erreur console bloquante ?

---

## 8. RECOMMANDATION FINALE

**Workflow recommande pour vous :**

1. Faire toutes les modifications dans Lovable
2. Verifier que GitHub est synchronise (commits visibles)
3. SSH sur la VM
4. `git pull` + identifier le type de changement
5. Suivre la procedure correspondante (A-H)
6. Valider avec la checklist

**Quand une simple mise a jour suffit :**
- Changement front (UI, textes, styles, composants)
- Changement docs
- Ajout/modification de pages sans nouvelle dependance

**Quand procedure lourde :**
- Nouvelle migration SQL
- Modification Edge Functions
- Changement de variables d'environnement Supabase
- Grosse refonte (nouvelle lib, changement de structure)

**Quand ouvrir une tranche BUILD corrective :**
- Si le build echoue a cause d'une erreur TypeScript dans le code Lovable
- Si une migration SQL est incompatible avec l'etat actuel de la base
- Si un rollback Proxmox a ete necessaire

---

## 9. COMPTE RENDU TECHNIQUE

### 1. Resume

Tranche de plan/audit/documentation uniquement. Aucun code modifie.

- Audit complet des 19 routes declarees dans `App.tsx` vs les 10 entrees de navigation dans `Layout.tsx`
- 2 cas identifies : `/admin/ai` (probable oubli — aucun lien nulle part) et `/compare` (cache intentionnellement — navigation programmatique)
- Guide de mise a jour VM complet couvrant 8 scenarios de changement

### 2. Fichiers modifies

Aucun.

### 3. Fichiers a creer (prochaine tranche)

- `docs/audit/navigation-routes-audit.md` — audit formalise
- `docs/deploy/vm-update-guide.md` — guide operateur mise a jour VM

### 4. Fichiers supprimes

Aucun.

### 5. Points sensibles

- `/admin/ai` n'est accessible que par URL directe. Un operateur debutant ne le trouvera jamais sans documentation. A corriger dans une prochaine tranche BUILD.
- Le guide VM suppose que le conteneur Nginx s'appelle `airballistik-nginx` et que le stack Supabase est dans `/home/airadmin/supabase-stack/docker`. Adapter si noms differents.

### 6. Ce qui est termine

- Audit navigation complet
- Guide de mise a jour VM complet
- Recommandations documentees

### 7. Ce qui reste a faire (tranches futures)

- **Tranche BUILD** : ajouter un lien `/admin/ai` dans AdminPage (bouton conditionnel a Supabase)
- **Tranche DOC** : creer les fichiers `.md` dans le repo avec le contenu de ce plan

