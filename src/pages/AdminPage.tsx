/**
 * Legacy /admin route — Sprint 2 hub Réglages.
 *
 * Le contenu admin (export/import, diagnostics, journal BLE, lien IA) a
 * été migré dans le hub Réglages sous l'onglet "Données" et "IA". Cette
 * page redirige donc vers /settings?tab=data pour préserver les anciens
 * liens et bookmarks.
 */
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  return <Navigate to="/settings?tab=data" replace />;
}
