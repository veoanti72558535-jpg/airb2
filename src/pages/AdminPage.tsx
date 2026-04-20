import React, { useState } from 'react';
import { Shield, Download, Upload, FileText, Database, Wrench, BarChart3, Crosshair, Telescope, Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { airgunStore, projectileStore, opticStore, sessionStore, exportAllData } from '@/lib/storage';
import { motion } from 'framer-motion';
import { ImportJsonModal } from '@/components/import/ImportJsonModal';
import type { ImportEntityType } from '@/lib/import-schemas';
import { ProjectileStorageDiagnosticCard } from '@/components/admin/ProjectileStorageDiagnosticCard';

export default function AdminPage() {
  const { t } = useI18n();
  const [importType, setImportType] = useState<ImportEntityType | null>(null);
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

  const sections = [
    {
      icon: Download,
      title: t('admin.imports'),
      desc: t('admin.importsDesc'),
      action: handleExport,
      actionLabel: 'Export JSON',
    },
    { icon: FileText, title: t('admin.documents'), desc: t('admin.documentsDesc') },
    { icon: Database, title: t('admin.catalog'), desc: t('admin.catalogDesc') },
    { icon: Wrench, title: t('admin.technical'), desc: t('admin.technicalDesc') },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">{t('admin.title')}</h1>
      </div>

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

      {/* Imports JSON (Tranche F.3) */}
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
            data-testid="admin-import-projectiles"
            onClick={() => setImportType('projectile')}
            className="px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Target className="h-3.5 w-3.5" />
            {t('admin.import.projectiles')}
          </button>
          <button
            type="button"
            data-testid="admin-import-optics"
            onClick={() => setImportType('optic')}
            className="px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Telescope className="h-3.5 w-3.5" />
            {t('admin.import.optics')}
          </button>
          <button
            type="button"
            data-testid="admin-import-reticles"
            onClick={() => setImportType('reticle')}
            className="px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {t('admin.import.reticles')}
          </button>
        </div>
      </div>

      {/* Diagnostic stockage projectiles (Tranche Admin Storage Diagnostic) */}
      <ProjectileStorageDiagnosticCard />

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, i) => (
          <div key={i} className="surface-elevated p-4 flex items-start gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
              <section.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{section.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{section.desc}</div>
              {section.action && (
                <button
                  onClick={section.action}
                  className="mt-2 px-3 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {section.actionLabel}
                </button>
              )}
              {!section.action && (
                <span className="mt-2 inline-block text-[11px] text-muted-foreground italic">{t('docs.comingSoon')}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {importType !== null && (
        <ImportJsonModal
          entityType={importType}
          source="json-user"
          open={importType !== null}
          onClose={() => setImportType(null)}
        />
      )}
    </motion.div>
  );
}
