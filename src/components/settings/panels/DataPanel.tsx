import React, { useState } from 'react';
import { Download, Upload, Database, BarChart3, Crosshair, Telescope, Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { airgunStore, projectileStore, opticStore, sessionStore, exportAllData } from '@/lib/storage';
import { ImportJsonModal } from '@/components/import/ImportJsonModal';
import type { ImportEntityType } from '@/lib/import-schemas';
import { ProjectileStorageDiagnosticCard } from '@/components/admin/ProjectileStorageDiagnosticCard';
import { ProjectileCleanupCard } from '@/components/admin/ProjectileCleanupCard';
import { SessionStorageDiagnosticCard } from '@/components/admin/SessionStorageDiagnosticCard';
import { StorageQuotaDiagnosticCard } from '@/components/admin/StorageQuotaDiagnosticCard';
import { BleJournalCard } from '@/components/admin/BleJournalCard';

/**
 * Hub Réglages — onglet "Données" :
 * export/import JSON, diagnostics stockage, nettoyage, journal BLE.
 * Reprend l'intégralité du contenu utile de l'ex-AdminPage.
 */
export function DataPanel() {
  const { t } = useI18n();
  const [importType, setImportType] = useState<ImportEntityType | null>(null);
  const [diagRefreshKey, setDiagRefreshKey] = useState(0);

  const totalItems =
    airgunStore.getAll().length +
    projectileStore.getAll().length +
    opticStore.getAll().length +
    sessionStore.getAll().length;

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airballistik-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="surface-elevated p-4 text-center">
          <BarChart3 className="h-4 w-4 mx-auto mb-1.5 text-primary" />
          <div className="text-xl font-mono font-bold">{totalItems}</div>
          <div className="text-[11px] text-muted-foreground">{t('admin.totalItems')}</div>
        </div>
        <div className="surface-elevated p-4 text-center">
          <Download className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
          <div className="text-sm font-mono font-medium text-muted-foreground">{t('admin.never')}</div>
          <div className="text-[11px] text-muted-foreground">{t('admin.lastExport')}</div>
        </div>
      </div>

      {/* Export */}
      <div className="surface-elevated p-4 flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{t('admin.imports')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t('admin.importsDesc')}</div>
          <button
            onClick={handleExport}
            className="mt-2 px-3 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Imports JSON */}
      <div className="surface-elevated p-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
            <Upload className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{t('admin.import.section')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t('admin.import.sectionDesc')}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            data-testid="settings-import-projectiles"
            onClick={() => setImportType('projectile')}
            className="px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Target className="h-3.5 w-3.5" />
            {t('admin.import.projectiles')}
          </button>
          <button
            type="button"
            data-testid="settings-import-optics"
            onClick={() => setImportType('optic')}
            className="px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Telescope className="h-3.5 w-3.5" />
            {t('admin.import.optics')}
          </button>
          <button
            type="button"
            data-testid="settings-import-reticles"
            onClick={() => setImportType('reticle')}
            className="px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {t('admin.import.reticles')}
          </button>
        </div>
      </div>

      {/* Diagnostics */}
      <ProjectileStorageDiagnosticCard refreshKey={diagRefreshKey} />
      <SessionStorageDiagnosticCard />
      <StorageQuotaDiagnosticCard />
      <ProjectileCleanupCard onCleaned={() => setDiagRefreshKey((k) => k + 1)} />
      <BleJournalCard />

      {/* Catalog placeholder */}
      <div className="surface-elevated p-4 flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
          <Database className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{t('admin.catalog')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t('admin.catalogDesc')}</div>
          <span className="mt-2 inline-block text-[11px] text-muted-foreground italic">{t('docs.comingSoon')}</span>
        </div>
      </div>

      {importType !== null && (
        <ImportJsonModal
          entityType={importType}
          source="json-user"
          open={importType !== null}
          onClose={() => setImportType(null)}
          onSuccess={() => {
            if (importType === 'projectile') setDiagRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
