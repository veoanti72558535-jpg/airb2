# Guide de mise à jour VM — AirBallistik

> Date : 2026-04-21
>
> Ce guide explique comment mettre à jour l'application sur la VM après des modifications faites dans Lovable / GitHub.

---

## 1. Principe de mise à jour

```text
Lovable (éditer) → GitHub (sync auto) → VM (git pull + rebuild)
```

**Ce qu'il ne faut PAS faire :**

- Ne jamais modifier les fichiers directement sur la VM (sauf `.env` et fichiers de configuration locale)
- Ne jamais faire `git commit` sur la VM — cela crée des conflits
- Ne jamais supprimer `node_modules` sans raison

La VM est un environnement de déploiement, pas de développement. Lovable et GitHub sont la source de vérité.

---

## 2. Checklist avant mise à jour

- [ ] Les changements Lovable sont visibles sur GitHub (commits récents)
- [ ] Type de changement identifié (voir section 4)
- [ ] Si changement Supabase/migrations/edge functions : snapshot Proxmox **obligatoire**
- [ ] Si changement front simple : snapshot **optionnel** (recommandé la première fois)
- [ ] Personne n'utilise l'app pendant la mise à jour

---

## 3. Procédure standard de mise à jour

```bash
# 1. Se connecter en SSH
ssh airadmin@192.168.1.150

# 2. Aller dans le repo
cd /home/airadmin/airballistik

# 3. Vérifier la branche (doit être main)
git branch

# 4. Récupérer les changements
git fetch origin

# 5. Vérifier ce qui a changé
git log --oneline HEAD..origin/main

# 6. Appliquer les changements
git pull origin main

# 7. Installer les dépendances si package.json a changé
npm install

# 8. Rebuilder l'application
npm run build

# 9. Copier le build dans le conteneur Nginx
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/

# 10. Vérifier que l'app répond
curl -s -o /dev/null -w "%{http_code}" http://localhost/
# Doit retourner 200

# 11. Tester dans le navigateur
# Ouvrir http://192.168.1.150 ou http://airballistik.lan
```

---

## 4. Cas selon le type de changement

### A. Changement front simple (UI, composants, styles)

```bash
git pull origin main
npm run build
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/
```

Vérifier : pages modifiées, pas d'erreur console.

### B. Changement docs seulement

```bash
git pull origin main
```

Rien d'autre. Les docs sont dans le repo mais pas servies par l'app.

### C. Nouvelles dépendances npm

```bash
git pull origin main
npm install
npm run build
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/
```

Vérifier : `npm install` sans erreur, build OK.

### D. Variables d'environnement (VITE_*)

```bash
git pull origin main
nano .env                # ajouter/modifier les nouvelles variables
npm run build            # VITE_* sont injectées au build
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/
```

Vérifier : `grep "VITE_" dist/assets/*.js | head` pour confirmer les valeurs.

### E. Changement Supabase self-hosted (config, RLS)

**Snapshot Proxmox obligatoire avant.**

```bash
git pull origin main
for f in /home/airadmin/airballistik/supabase/migrations/*.sql; do
  echo "==> $f"
  docker compose -f /home/airadmin/supabase-stack/docker/docker-compose.yml \
    exec -T db psql -U postgres -d postgres < "$f"
done
npm run build
docker cp dist/. airballistik-nginx:/usr/share/nginx/html/
```

Vérifier : pas d'erreur SQL, tables présentes.

### F. Nouvelles migrations SQL

Même procédure que E. Les migrations sont idempotentes (DROP IF EXISTS + CREATE).

### G. Edge Functions modifiées

```bash
git pull origin main
STACK=/home/airadmin/supabase-stack/docker
cp supabase/functions/ai-extract-rows/index.ts $STACK/volumes/functions/ai-extract-rows/
cp supabase/functions/ai-providers-test/index.ts $STACK/volumes/functions/ai-providers-test/
cp -r supabase/functions/_shared/* $STACK/volumes/functions/_shared/
docker compose -f $STACK/docker-compose.yml restart functions
```

Vérifier : `/admin/ai` > « Tester providers ».

### H. Changement purement UI/navigation

Identique à A. Rebuild + copie dist.

---

## 5. Snapshot Proxmox

| Quand | Obligatoire ? |
|---|---|
| Avant migration SQL | **Oui** |
| Avant changement Edge Functions | **Oui** |
| Avant changement front simple | Non (recommandé la 1ère fois) |
| Avant changement `.env` | Recommandé |
| Avant grosse mise à jour (10+ commits) | Recommandé |

**Nommage** : `pre-update-YYYY-MM-DD-description`

Exemple : `pre-update-2026-04-21-ia1-migration`

**Quand rollback** : si l'app ne démarre plus, si les données sont corrompues, si une migration SQL échoue à mi-chemin.

---

## 6. Validation après mise à jour

- [ ] Page d'accueil `/` charge sans erreur
- [ ] Quick Calc `/calc` fonctionne
- [ ] Sessions `/sessions` affiche les sessions existantes
- [ ] Library `/library` affiche les onglets
- [ ] Cross-validation `/cross-validation` charge
- [ ] Admin `/admin` charge
- [ ] `/admin/ai` charge (si Supabase configuré)
- [ ] Bouton IA visible/caché selon configuration
- [ ] Console navigateur : pas d'erreur rouge bloquante
- [ ] Version/build cohérente

---

## 7. Dépannage

| Problème | Cause probable | Solution |
|---|---|---|
| `git pull` conflit | Fichier modifié sur la VM | `git checkout -- .` puis `git pull` |
| `npm install` échoue | Node.js trop ancien ou lock file corrompu | `rm -rf node_modules && npm install` |
| `npm run build` échoue | Erreur TypeScript ou dépendance manquante | Lire l'erreur, souvent `npm install` résout |
| Nginx ne sert pas le nouveau build | `dist/` pas copié | `docker cp dist/. airballistik-nginx:/usr/share/nginx/html/` |
| Variable VITE_* manquante | `.env` pas mis à jour avant build | Éditer `.env`, re-builder |
| Bouton IA disparu | `VITE_SUPABASE_URL` absent au build | Vérifier `.env`, re-builder |
| Route 404 au refresh | Nginx pas configuré SPA | Vérifier `nginx-spa.conf` avec `try_files` |
| Supabase KO | Conteneur Docker arrêté | `docker compose up -d` dans le stack Supabase |
| Edge Function non prise en compte | Fichier pas copié ou conteneur pas redémarré | Re-copier + `docker compose restart functions` |
| Migration SQL échoue | Syntaxe ou table déjà modifiée | Lire l'erreur, rollback Proxmox si nécessaire |
| Rollback Proxmox | Mise à jour catastrophique | Restaurer le snapshot, analyser, ouvrir tranche corrective |

---

## 8. Recommandation finale

**Workflow recommandé :**

1. Faire toutes les modifications dans Lovable
2. Vérifier que GitHub est synchronisé
3. SSH sur la VM
4. `git pull` + identifier le type de changement (A–H)
5. Suivre la procédure correspondante
6. Valider avec la checklist

**Simple mise à jour** : changement front, docs, pages sans nouvelle dépendance.

**Procédure lourde** : migration SQL, Edge Functions, variables Supabase, grosse refonte.

**Tranche BUILD corrective** : si le build échoue, si une migration est incompatible, si un rollback a été nécessaire.