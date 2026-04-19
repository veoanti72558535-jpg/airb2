/**
 * Tranche F.5 — Résolution de l'origine d'import pour le tooltip EngineBadge.
 *
 * Helper purement fonctionnel : prend une `Session` et résout, via les stores
 * existants, l'`importedFrom` du projectile et de l'optique liés (si liens
 * exploitables ET entité retrouvée ET marqueur `importedFrom` présent).
 *
 * Politique de la tranche :
 *  - couvre uniquement projectile + optique (pas de réticule : la session
 *    n'a pas encore de lien direct exploitable vers un réticule)
 *  - jamais de devinette : entité absente du store ⇒ rien
 *  - jamais d'écriture, jamais de mutation
 *  - rétrocompatible : sessions legacy sans `projectileId`/`opticId` retournent
 *    un objet vide
 */
import type { Session, ImportSource } from '@/lib/types';
import { projectileStore, opticStore } from '@/lib/storage';
import type { TranslationKey } from '@/lib/translations';

export interface ImportedFromInfo {
  /** Source d'import du projectile lié si pertinent. */
  projectile?: ImportSource;
  /** Source d'import de l'optique liée si pertinente. */
  optic?: ImportSource;
}

/** Mappe une `ImportSource` vers la clé i18n de son label affichable. */
export function importSourceLabelKey(source: ImportSource): TranslationKey {
  switch (source) {
    case 'json-user':
      return 'import.source.jsonUser';
    case 'preset-internal':
      return 'import.source.presetInternal';
    case 'strelok':
      return 'import.source.strelok';
    case 'chairgun':
      return 'import.source.chairgun';
    case 'airballistik':
      return 'import.source.airballistik';
  }
}

/**
 * Résout l'origine d'import des entités liées à une session.
 *
 * Robuste aux cas legacy / entités supprimées : retourne un objet vide quand
 * aucun lien n'est exploitable. Ne lève jamais.
 */
export function resolveSessionImportedFrom(session: Session): ImportedFromInfo {
  const out: ImportedFromInfo = {};

  if (session.projectileId) {
    try {
      const p = projectileStore.getById(session.projectileId);
      if (p?.importedFrom) out.projectile = p.importedFrom;
    } catch {
      // store indisponible (test ?) → ignore silencieusement
    }
  }

  if (session.opticId) {
    try {
      const o = opticStore.getById(session.opticId);
      if (o?.importedFrom) out.optic = o.importedFrom;
    } catch {
      // idem
    }
  }

  return out;
}

/** True si au moins une entité liée porte un `importedFrom` exploitable. */
export function hasAnyImportedFrom(info: ImportedFromInfo): boolean {
  return !!info.projectile || !!info.optic;
}
