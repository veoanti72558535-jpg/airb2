

# AIRBALLISTIK — PLAN IA2f — MIGRATION PROGRESSIVE DES AGENTS VERS LE DISPATCHER

---

## 1. RESUME EXECUTIF

IA2f porte sur la question de savoir si et comment migrer des agents vers le dispatcher generique `ai-provider-dispatch`. Apres analyse du code existant, la recommandation est claire : **ne pas toucher a `ai-extract-rows`** dans cette tranche, et limiter IA2f aux futurs agents uniquement. La fonction IA-1 est stable, specifique, et n'a rien a gagner d'une migration vers le dispatcher a ce stade. Le dispatcher est pret pour de nouveaux agents ; c'est la qu'il doit etre utilise.

---

## 2. SOCLE A PRESERVER

Les elements suivants sont intouchables dans IA2f :

| Element | Raison |
|---|---|
| `ai-extract-rows` (Edge Function) | Fonction IA-1 en production, validation Zod specifique, prompt Strelok dedie |
| `cross-validation-strelok-rows` (agent slug) | Config agent en base, liee a `ai-extract-rows` |
| `src/lib/ai/strelok-rows.ts` | Client frontend IA-1, appelle directement `ai-extract-rows` |
| `src/components/cross-validation/AIImportModal.tsx` | UI du flux screenshot, garde-fous humains |
| Voie manuelle (paste/JSON) | Toujours fonctionnelle sans Supabase |
| `confidence = 'C'` | Plafond force cote schema utilisateur |
| Absence de persistance silencieuse | Rien n'est sauve avant confirmation explicite |
| Contrats JSON cross-validation existants | Schemas Zod, `UserReferenceRow`, cas fixtures |
| `requireAdmin()` | Auth admin sur toutes les Edge Functions IA |
| Logging IA (`ai_runs`, `ai_run_events`) | Audit trail intact |

---

## 3. CE QUE IA2f SIGNIFIE REELLEMENT

### Ce que IA2f N'est PAS

IA2f **n'est pas** la migration de `ai-extract-rows` vers le dispatcher. Cette fonction a une logique metier specifique :
- Validation Zod du draft avec schema `draftSchema` dedie
- Hash SHA-256 de l'image source pour audit trail
- Verification taille image via `settings.maxImageBytes`
- Prompt version trackee dans la reponse
- Contrat de sortie specifique (`draft: AIDraftRows`)

Le dispatcher generique (`ai-provider-dispatch`) n'a pas cette logique metier. Le migrer impliquerait soit de dupliquer la validation dans le dispatcher (pollution), soit de la perdre (regression).

### Ce que IA2f EST

IA2f = **etablir le cadre pour que les futurs agents utilisent exclusivement `ai-provider-dispatch` via `queryAIViaEdge()`**.

Concretement :
- Definir le premier agent concret qui passe par le dispatcher (candidat naturel : aide contextuelle / suggestions)
- Verifier que le circuit complet fonctionne : `queryAIViaEdge()` → `ai-provider-dispatch` → provider → reponse
- Valider le logging, le fallback, le quota
- Documenter le pattern pour les agents suivants

### Decoupe recommandee

**Pas de sous-phases IA2f.1 / IA2f.2.** La migration de `ai-extract-rows` n'est pas dans IA2f. Si elle devait un jour se faire, ce serait une tranche separee (IA2g ou plus tard), avec ses propres criteres d'entree.

---

## 4. RISQUE SPECIFIQUE SUR `ai-extract-rows`

### Faut-il y toucher ?

**Non.** Pas maintenant, probablement pas avant longtemps.

### Benefices theoriques d'une migration

- Centralisation du code provider (deja partagee via `_shared/providers.ts`)
- Logging unifie (deja fait via `_shared/logging.ts`)
- Un seul point d'entree Edge Function

### Risques concrets

| Risque | Severite |
|---|---|
| Perte de la validation Zod specifique `draftSchema` | Critique |
| Perte du hash SHA-256 de l'image | Elevee |
| Perte du controle de taille image | Elevee |
| Regression du contrat de sortie (`draft` vs `text`) | Critique |
| Casse du client `strelok-rows.ts` qui attend un format specifique | Critique |
| Double point de defaillance pendant la migration | Elevee |
| Tests IA-1 a reecrire | Moyen |

### Preconditions minimales (si un jour necessaire)

1. Dispatcher valide en production self-hosted depuis > 30 jours
2. Au moins 2 autres agents passent par le dispatcher sans incident
3. Tests end-to-end du flux screenshot avec le dispatcher en shadow mode
4. Comparaison sortie `ai-extract-rows` vs dispatcher sur 20+ images reelles
5. Rollback instantane garanti (les deux fonctions coexistent)

---

## 5. CRITERES D'ENTREE AVANT IA2f

Avant d'implementer IA2f, les conditions suivantes doivent etre reunies :

### Validations Supabase Cloud

- [ ] `ai-provider-dispatch` deploye et fonctionnel (test manuel via `curl` ou Postman)
- [ ] `ai-providers-test` renvoie les 3 sections (Quatarly, Google quota, Ollama)
- [ ] `queryAIViaEdge()` appelle le dispatcher et recoit une reponse valide
- [ ] Logging dans `ai_runs` / `ai_run_events` visible en base
- [ ] Quota Google fonctionne (compteur incremente)

### Validations self-hosted (reportees)

- [ ] Memes tests sur la VM Proxmox apres deploiement des migrations + fonctions
- [ ] Ollama joignable depuis la VM

### Tests qui doivent etre verts

- [ ] `edge-client.test.ts` (5 scenarios existants)
- [ ] `strelok-rows.test.ts` (non-regression IA-1)
- [ ] `AIImportModal.test.ts` (non-regression UI IA-1)
- [ ] Build TypeScript sans erreur

### Stabilite du dispatcher

- Au moins un aller-retour reussi texte-only via `ai-provider-dispatch`
- Fallback Google teste (primaire en echec → fallback OK)

---

## 6. STRATEGIE DE MIGRATION LA PLUS SURE

### Principe : cohabitation stricte

```text
┌─────────────────────────────────────────────┐
│  ai-extract-rows  (IA-1, inchangee)        │
│  └─ strelok-rows.ts → AIImportModal        │
│     Chemin dedie, validation Zod specifique │
├─────────────────────────────────────────────┤
│  ai-provider-dispatch  (IA2+, nouveaux)    │
│  └─ queryAIViaEdge() → futurs composants   │
│     Chemin generique, validation cote agent │
└─────────────────────────────────────────────┘
```

### Pas de feature flag necessaire

Les deux chemins sont deja separes par construction :
- `strelok-rows.ts` appelle `supabase.functions.invoke('ai-extract-rows', ...)`
- `queryAIViaEdge()` appelle `supabase.functions.invoke('ai-provider-dispatch', ...)`

Il n'y a pas de migration a basculer. Les nouveaux agents utilisent le dispatcher directement. L'ancien agent garde sa fonction dediee.

### Rollback

Si un nouvel agent via le dispatcher pose probleme : on le desactive dans `ai_agent_configs` (`enabled = false`). Aucun impact sur IA-1.

---

## 7. IMPACTS ET ZONES SENSIBLES

| Zone | Impact IA2f |
|---|---|
| Auth (`requireAdmin`) | Aucun — deja en place sur le dispatcher |
| Logs (`ai_runs`, `ai_run_events`) | Aucun — le dispatcher logue deja |
| Output schema | Specifique par agent, pas de conflit |
| Fallback provider | Fonctionne deja dans le dispatcher |
| Quota Google | Deja verifie par le dispatcher |
| `/admin/ai` | Pourrait afficher le nouvel agent si ajoute en base |
| `queryAIViaEdge()` | Sera utilise pour la premiere fois en production |
| Tests existants | Aucun impact si on ne touche pas a IA-1 |
| UX flux screenshot | Zero impact |
| Cross-validation references | Zero impact |

### Point d'attention principal

Le premier usage reel de `queryAIViaEdge()` en production sera le vrai test d'integration. Il faut choisir un agent simple et non critique pour ce premier essai.

---

## 8. HORS SCOPE IA2f

- Pas de nouvelle source (ChairGun, MERO, AirBallistik propre)
- Pas d'extraction d'inputs balistiques
- Pas de multi-image
- Pas de refonte UI
- Pas de changement moteur balistique
- Pas de changement de tolerances cross-validation
- Pas de nouveau provider obligatoire
- Pas de bascule automatique non validee
- Pas de migration de `ai-extract-rows` vers le dispatcher
- Pas de changement du role `admin`
- Pas de migration VM dans cette tranche

---

## 9. DECOUPAGE RECOMMANDE

IA2f se decompose en une seule tranche BUILD legere :

### BUILD-IA2f : Premier agent via le dispatcher

1. **Definir un premier agent concret** — candidat : `contextual-help` ou `session-summary` (agent texte-only, non critique, utile pour le debug admin)
2. **Creer la config agent** dans une migration SQL additive (`ai_agent_configs` INSERT)
3. **Creer le composant UI minimal** qui appelle `queryAIViaEdge()` avec cet agent
4. **Verifier** que le circuit complet fonctionne (appel, logging, reponse, affichage)
5. **Ajouter les traductions FR/EN** pour ce nouvel agent
6. **Ne pas toucher** a `ai-extract-rows`, au moteur, ni au flux screenshot

Cette tranche est estimee a ~4 fichiers modifies/crees.

---

## 10. RECOMMANDATION FINALE

### Faut-il lancer IA2f bientot ?

**Oui, mais seulement apres validation runtime du dispatcher en Supabase Cloud.** Le code est pret dans le repo, mais aucun test d'integration reel n'a ete fait. Deployer d'abord les migrations + fonctions sur Supabase Cloud, tester manuellement le dispatcher, puis seulement implementer IA2f.

### Faut-il attendre la phase self-hosted finale ?

**Non.** IA2f peut etre testee sur Supabase Cloud. La migration self-hosted viendra apres.

### Faut-il migrer `ai-extract-rows` ?

**Non.** La laisser tranquille. Elle fonctionne, elle est specifique, elle a ses garde-fous. Le dispatcher est pour les nouveaux agents.

### Quelle est la plus petite tranche sure a faire ensuite ?

**Deployer les fonctions Edge + migrations sur Supabase Cloud et faire un test manuel du dispatcher.** C'est la precondition avant toute implementation IA2f. Sans cette validation runtime, coder un nouvel agent serait premature.

---

## COMPTE RENDU TECHNIQUE

### 1. Resume

Ceci est un plan d'analyse, aucune implementation n'a ete faite.

### 2-4. Fichiers modifies / crees / supprimes

Aucun.

### 5. Role des changements

Neant — tranche PLAN uniquement.

### 6. Points sensibles

- Le dispatcher `ai-provider-dispatch` n'a jamais ete teste en runtime (ni Cloud ni self-hosted)
- `queryAIViaEdge()` n'a jamais ete appele en conditions reelles
- La premiere utilisation reelle du dispatcher sera le vrai test d'integration
- `ai-extract-rows` ne doit pas etre touchee — c'est la conclusion principale de ce plan

### 7. Ce qui est termine et ce qui reste

- **Termine** : analyse, arbitrage, plan d'execution
- **Reste** : validation runtime du dispatcher (Cloud), puis BUILD-IA2f

### 8. Migration / deploiement VM

La migration et le deploiement VM sont **volontairement reportes**. La prochaine etape est le deploiement sur Supabase Cloud pour validation runtime, puis BUILD-IA2f, puis migration self-hosted finale.

