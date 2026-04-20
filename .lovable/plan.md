

# Fix: Guide d'installation — remplacer `npm ci` par `npm install`

## Problème

Le repo contient `bun.lock` / `bun.lockb` (gestionnaire utilisé par Lovable) mais le `package-lock.json` est désynchronisé de `package.json`. La commande `npm ci` exige une synchronisation parfaite et échoue.

## Solution

Modifier `docs/deploy/install-proxmox-ubuntu-supabase.md` à deux endroits :

### 1. Section 8 (Étape 6 — Cloner AirBallistik), ligne ~239

Remplacer `npm ci` par `npm install` et ajouter un encadré expliquant pourquoi :

```bash
cd /home/airadmin
git clone https://github.com/<user>/<repo>.git airballistik
cd /home/airadmin/airballistik
npm install
```

Ajouter une note :

> Le projet utilise `bun` en interne (Lovable). Le fichier `package-lock.json` peut être désynchronisé. Utilisez `npm install` (qui régénère le lock file) au lieu de `npm ci` (qui exige un lock file parfait). Si vous préférez bun : `curl -fsSL https://bun.sh/install | bash && bun install`.

### 2. Section 18 (Workflow GitHub), ligne ~678

Remplacer `npm ci` par `npm install` dans la séquence de mise à jour.

## Fichiers modifiés

- `docs/deploy/install-proxmox-ubuntu-supabase.md` — 2 occurrences de `npm ci` → `npm install` + note explicative sur bun vs npm.

## Aucun changement moteur, aucun fichier créé/supprimé.

