

# Fix : Génération JWT — Ubuntu 24.04 PEP 668 + variable manquante

## Problème

Deux erreurs à l'étape §9.3 du guide :

1. **`pip3 install` échoue** sur Ubuntu 24.04 à cause de PEP 668 (« externally-managed-environment »). Le système interdit les `pip install` globaux.
2. **`KeyError: 'JWT_SECRET'`** — le script Python lit `os.environ["JWT_SECRET"]` mais le guide ne montre le `export` qu'**après** le bloc de code. Un débutant ne le voit pas.

## Solution

Réécrire le bloc CLI de §9.3 (lignes ~289-306) dans `docs/deploy/install-proxmox-ubuntu-supabase.md` :

### Changements

1. **Remplacer `pip3 install pyjwt`** par un venv jetable ou, mieux, par `python3 -c` utilisant `hmac`+`base64` natifs (zéro dépendance externe). Le plus simple et robuste pour un débutant : utiliser le module `jwt` dans un venv temporaire :

```bash
# 1. Exporter JWT_SECRET AVANT de lancer le script
export JWT_SECRET="<coller la valeur générée au §9.2>"

# 2. Créer un venv temporaire + installer pyjwt
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

2. **Déplacer l'instruction `export JWT_SECRET=...`** en première ligne du bloc (pas après). Ajouter un encadré d'avertissement :

> ⚠️ **Important** : la commande `export JWT_SECRET="..."` doit être exécutée **avant** le script Python, dans le même terminal. Sans elle, le script échoue avec `KeyError: 'JWT_SECRET'`.

3. **Supprimer** `sudo apt install -y python3-pip` et `pip3 install --user pyjwt` (incompatibles PEP 668 sur Ubuntu 24.04+).

4. **Supprimer** la note orpheline après le bloc (ligne 306 `(Exportez d'abord...)`) puisque l'export est maintenant intégré dans le bloc.

## Fichier modifié

- `docs/deploy/install-proxmox-ubuntu-supabase.md` — section §9.3, lignes ~289-306 : réécriture du bloc CLI avec venv + export en tête.

## Aucun changement moteur, aucun fichier créé/supprimé.

