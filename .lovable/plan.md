

# Correction UX IA — Message dupliqué + Settings placeholder

## Problemes identifies

1. **`/admin` — message duplique** : quand Supabase n'est pas configure, `AdminPage.tsx` affiche `t('admin.ai.linkDisabled')` deux fois — une fois comme description (ligne 137) et une fois comme span italique (ligne 149-151).

2. **Settings — placeholder "Coming soon" obsolete** : `SettingsPage.tsx` affiche toujours le bloc statique `opacity-50` avec "Bientot disponible" au lieu d'un etat dynamique base sur `isSupabaseConfigured()`.

## Modifications prevues

### 1. `src/pages/AdminPage.tsx`

- Quand `!supabaseReady` : afficher `t('admin.ai.linkDisabled')` uniquement dans la description (ligne 137), supprimer le span italique duplique (lignes 149-151) et le remplacer par rien (ou un texte d'aide different, par ex. `t('admin.ai.linkDesc')` comme explication complementaire).
- Resultat : un seul message d'indisponibilite, propre et non duplique.

### 2. `src/pages/SettingsPage.tsx`

- Importer `isSupabaseConfigured` depuis `@/integrations/supabase/client` et `useNavigate` depuis `react-router-dom`.
- Remplacer le bloc AI statique (lignes 228-240) par une logique conditionnelle :
  - Si Supabase configure : afficher un bouton "Configurer" qui navigue vers `/admin/ai`.
  - Si Supabase non configure : afficher un texte explicatif "Requiert Supabase" sans affordance trompeuse.
- Retirer `opacity-50` et le texte "Coming soon".

### 3. `src/lib/translations.ts`

- Verifier que les cles `settings.aiConfigure` et `settings.aiRequiresSupabase` existent. Si absentes, les ajouter en FR et EN.

## Fichiers concernes

| Fichier | Action |
|---|---|
| `src/pages/AdminPage.tsx` | Supprimer le doublon du message linkDisabled |
| `src/pages/SettingsPage.tsx` | Remplacer le placeholder AI statique par un etat dynamique |
| `src/lib/translations.ts` | Ajouter les cles manquantes si necessaire |

## Ce qui ne change pas

- `ai-extract-rows`, `ai-provider-dispatch`, `ai-providers-test` — aucune modification
- Moteur balistique — aucune modification
- Aucune migration VM

