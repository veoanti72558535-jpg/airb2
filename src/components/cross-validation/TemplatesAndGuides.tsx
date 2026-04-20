/**
 * BUILD — Templates + guides de saisie source-spécifiques.
 *
 * Surface autonome affichée en tête de la liste des cas dans l'onglet
 * "Validation externe". Deux blocs :
 *   1. Téléchargement de templates JSON (ChairGun Elite / Strelok Pro /
 *      MERO / générique).
 *   2. Guides de saisie source-spécifiques (collapsibles), expliquant
 *      quoi relever et quels pièges éviter.
 *
 * Aucun calcul, aucune valeur externe inventée. Les templates sont
 * produits par `templates.ts` et passent la validation Zod du schéma.
 */

import { useState } from 'react';
import { Download, BookOpen, ChevronDown, ChevronRight, FileJson, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useI18n } from '@/lib/i18n';
import {
  SOURCE_GUIDES,
  TEMPLATE_DESCRIPTORS,
  makeTemplate,
  templateToJson,
  type TemplateKind,
} from '@/lib/cross-validation/templates';
import type { UserCrossValidationCase } from '@/lib/cross-validation';

export interface TemplatesAndGuidesProps {
  /**
   * Callback "Nouveau depuis template" — laisse le parent décider du flux
   * (création + ouverture éditeur). Si non fourni, le bouton est masqué.
   */
  onUseTemplate?: (caseFromTemplate: UserCrossValidationCase) => void;
}

function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function TemplatesAndGuides({ onUseTemplate }: TemplatesAndGuidesProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const handleDownload = (kind: TemplateKind, filename: string) => {
    downloadJson(filename, templateToJson(kind));
  };

  const handleUse = (kind: TemplateKind) => {
    if (!onUseTemplate) return;
    onUseTemplate(makeTemplate(kind));
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card data-testid="cv-templates-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left p-3 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors rounded-t"
            data-testid="cv-templates-toggle"
          >
            <div className="flex items-center gap-2 min-w-0">
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">
                {t('crossValidation.templates.title')}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {t('crossValidation.templates.subtitle')}
            </span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-3 pt-0 space-y-4">
            {/* Templates */}
            <section className="space-y-2" data-testid="cv-templates-list">
              <p className="text-[11px] text-muted-foreground">
                {t('crossValidation.templates.intro')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEMPLATE_DESCRIPTORS.map((tpl) => (
                  <div
                    key={tpl.kind}
                    className="rounded border border-border bg-muted/20 p-2 space-y-1.5"
                    data-testid={`cv-template-${tpl.kind}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileJson className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="text-xs font-medium truncate">{tpl.label}</div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{tpl.hint}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={() => handleDownload(tpl.kind, tpl.filenameSuggestion)}
                        data-testid={`cv-template-${tpl.kind}-download`}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {t('crossValidation.templates.download')}
                      </Button>
                      {onUseTemplate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => handleUse(tpl.kind)}
                          data-testid={`cv-template-${tpl.kind}-use`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {t('crossValidation.templates.use')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Guides */}
            <section className="space-y-2" data-testid="cv-guides-list">
              <h3 className="text-xs font-medium">
                {t('crossValidation.guide.title')}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {t('crossValidation.guide.intro')}
              </p>
              <div className="space-y-2">
                {Object.values(SOURCE_GUIDES).map((guide) => (
                  <SourceGuideBlock key={guide.kind} guide={guide} />
                ))}
              </div>
            </section>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function SourceGuideBlock({
  guide,
}: {
  guide: (typeof SOURCE_GUIDES)[keyof typeof SOURCE_GUIDES];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className="border-border/60"
        data-testid={`cv-guide-${guide.kind}`}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left p-2 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors rounded-t"
          >
            <div className="flex items-center gap-2">
              {open ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs font-medium">
                {t(guide.labelKey as Parameters<typeof t>[0])}
              </span>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-2 pt-0 space-y-2">
            {guide.sections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t(section.titleKey as Parameters<typeof t>[0])}
                </div>
                <ul className="text-[11px] list-disc pl-4 space-y-0.5">
                  {section.bulletKeys.map((key) => (
                    <li key={key}>{t(key as Parameters<typeof t>[0])}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default TemplatesAndGuides;