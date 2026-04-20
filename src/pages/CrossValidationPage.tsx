import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Upload,
  Download,
  Save,
  Pencil,
  Play,
  AlertCircle,
  ChevronLeft,
  FileJson,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n';
import {
  makeEmptyReferenceRow,
  makeEmptyUserCase,
  makeEmptyUserReference,
  mapUserCaseToCrossValidationCase,
  parseUserCaseJson,
  validateUserCase,
  type UserCrossValidationCase,
  type UserReference,
  type ValidationIssue,
} from '@/lib/cross-validation/user-case-schema';
import {
  userCaseRepo,
  type StoredUserCase,
} from '@/lib/cross-validation/user-case-repo';
import { runCaseComparison } from '@/lib/cross-validation';
import type { CaseComparisonResult } from '@/lib/cross-validation';
import { CrossValidationResults } from '@/components/cross-validation/CrossValidationResults';

/**
 * BUILD-C bis — Onglet "Validation externe".
 *
 * UI mobile-first :
 *  - liste des cas saisis (left/top sur mobile)
 *  - éditeur d'un cas (inputs + références multiples)
 *  - import/export JSON
 *  - bouton "Comparer avec le moteur" qui appelle le harness BUILD-B
 *
 * AUCUN appel moteur tant que l'utilisateur n'a pas explicitement cliqué
 * sur "Comparer". L'éditeur reste pur.
 */

type View = 'list' | 'edit';

export default function CrossValidationPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<StoredUserCase[]>([]);
  const [view, setView] = useState<View>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserCrossValidationCase | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [lastResult, setLastResult] = useState<{
    result: CaseComparisonResult;
    title: string;
    runAt: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setItems(userCaseRepo.getAll());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openNew = () => {
    setActiveId(null);
    setDraft(makeEmptyUserCase());
    setIssues([]);
    setView('edit');
  };

  const openEdit = (stored: StoredUserCase) => {
    setActiveId(stored.id);
    setDraft(structuredClone(stored.case));
    setIssues([]);
    setView('edit');
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('crossValidation.confirmDelete'))) return;
    userCaseRepo.remove(id);
    refresh();
    toast.success(t('crossValidation.deleted'));
  };

  const handleSave = () => {
    if (!draft) return;
    const result = activeId
      ? userCaseRepo.update(activeId, draft)
      : userCaseRepo.create(draft);
    if (!result.ok) {
      setIssues(result.issues ?? []);
      toast.error(t('crossValidation.saveFailed'));
      return;
    }
    setIssues([]);
    refresh();
    toast.success(t('crossValidation.saved'));
    setView('list');
    setActiveId(null);
    setDraft(null);
  };

  const handleExport = (stored: StoredUserCase) => {
    const blob = new Blob([JSON.stringify(stored.case, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stored.case.caseId || 'case'}.cross-validation.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File) => {
    if (file.size > 1_000_000) {
      toast.error(t('crossValidation.fileTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseUserCaseJson(text);
      if (result.ok === false) {
        setIssues(result.issues);
        toast.error(t('crossValidation.importFailed'));
        return;
      }
      const created = userCaseRepo.create(result.case);
      if (!created.ok) {
        setIssues(created.issues ?? []);
        toast.error(t('crossValidation.importFailed'));
        return;
      }
      setIssues([]);
      refresh();
      toast.success(t('crossValidation.imported'));
    };
    reader.onerror = () => toast.error(t('crossValidation.importFailed'));
    reader.readAsText(file);
  };

  const handleCompare = (stored: StoredUserCase) => {
    const v = validateUserCase(stored.case);
    if (v.ok === false) {
      setIssues(v.issues);
      toast.error(t('crossValidation.compareInvalid'));
      return;
    }
    try {
      const cvCase = mapUserCaseToCrossValidationCase(v.case);
      const result = runCaseComparison(cvCase);
      const passed = result.perReference.filter((r) => r.status === 'PASS').length;
      const indicative = result.perReference.filter((r) => r.status === 'INDICATIVE').length;
      const failed = result.perReference.filter((r) => r.status === 'FAIL').length;
      toast.success(
        t('crossValidation.compareSummary', {
          status: result.status,
          pass: passed,
          indicative,
          fail: failed,
        }),
        { duration: 6000 },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${t('crossValidation.compareFailed')}: ${msg}`);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-heading font-semibold tracking-tight">
            {t('crossValidation.title')}
          </h1>
          {view === 'edit' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setView('list');
                setActiveId(null);
                setDraft(null);
                setIssues([]);
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('crossValidation.backToList')}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t('crossValidation.subtitle')}
        </p>
      </header>

      {view === 'list' && (
        <ListView
          items={items}
          onNew={openNew}
          onEdit={openEdit}
          onDelete={handleDelete}
          onExport={handleExport}
          onCompare={handleCompare}
          onImportClick={() => fileInputRef.current?.click()}
        />
      )}

      {view === 'edit' && draft && (
        <EditView
          draft={draft}
          onChange={setDraft}
          onSave={handleSave}
          issues={issues}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        data-testid="cv-import-file-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportFile(f);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// LIST VIEW
// -----------------------------------------------------------------------------

interface ListViewProps {
  items: StoredUserCase[];
  onNew: () => void;
  onEdit: (s: StoredUserCase) => void;
  onDelete: (id: string) => void;
  onExport: (s: StoredUserCase) => void;
  onCompare: (s: StoredUserCase) => void;
  onImportClick: () => void;
}

function ListView({
  items,
  onNew,
  onEdit,
  onDelete,
  onExport,
  onCompare,
  onImportClick,
}: ListViewProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onNew} data-testid="cv-new-btn">
          <Plus className="h-4 w-4 mr-1" />
          {t('crossValidation.newCase')}
        </Button>
        <Button size="sm" variant="secondary" onClick={onImportClick} data-testid="cv-import-btn">
          <Upload className="h-4 w-4 mr-1" />
          {t('crossValidation.importJson')}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/docs">
            <FileJson className="h-4 w-4 mr-1" />
            {t('crossValidation.docsLink')}
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t('crossValidation.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map((s) => (
            <Card key={s.id} data-testid={`cv-case-${s.case.caseId}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.case.title}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {s.case.caseId}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {s.case.references.map((r, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px]">
                        {r.meta.source} · {r.meta.confidence}
                      </Badge>
                    ))}
                  </div>
                </div>
                {s.case.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {s.case.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 pt-1">
                  <Button size="sm" variant="default" onClick={() => onCompare(s)}>
                    <Play className="h-3.5 w-3.5 mr-1" />
                    {t('crossValidation.compare')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onEdit(s)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {t('crossValidation.edit')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onExport(s)}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    {t('crossValidation.exportJson')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// EDIT VIEW
// -----------------------------------------------------------------------------

interface EditViewProps {
  draft: UserCrossValidationCase;
  onChange: (next: UserCrossValidationCase) => void;
  onSave: () => void;
  issues: ValidationIssue[];
}

function EditView({ draft, onChange, onSave, issues }: EditViewProps) {
  const { t } = useI18n();

  const update = useCallback(
    <K extends keyof UserCrossValidationCase>(key: K, value: UserCrossValidationCase[K]) => {
      onChange({ ...draft, [key]: value });
    },
    [draft, onChange],
  );

  const updateInputs = useCallback(
    (patch: Partial<UserCrossValidationCase['inputs']>) => {
      onChange({ ...draft, inputs: { ...draft.inputs, ...patch } });
    },
    [draft, onChange],
  );

  const updateReference = useCallback(
    (idx: number, next: UserReference) => {
      const refs = draft.references.slice();
      refs[idx] = next;
      onChange({ ...draft, references: refs });
    },
    [draft, onChange],
  );

  const addReference = () => {
    onChange({ ...draft, references: [...draft.references, makeEmptyUserReference()] });
  };

  const removeReference = (idx: number) => {
    if (draft.references.length <= 1) {
      toast.error(t('crossValidation.atLeastOneRef'));
      return;
    }
    onChange({
      ...draft,
      references: draft.references.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-4">
      {issues.length > 0 && (
        <Alert variant="destructive" data-testid="cv-issues">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">{t('crossValidation.validationFailed')}</div>
            <ul className="text-xs space-y-0.5 list-disc pl-4">
              {issues.slice(0, 8).map((iss, i) => (
                <li key={i}>
                  <span className="font-mono opacity-70">{iss.path}</span>: {iss.message}
                </li>
              ))}
              {issues.length > 8 && (
                <li className="opacity-70">…+{issues.length - 8}</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="meta" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="meta">{t('crossValidation.tab.meta')}</TabsTrigger>
          <TabsTrigger value="inputs">{t('crossValidation.tab.inputs')}</TabsTrigger>
          <TabsTrigger value="references">
            {t('crossValidation.tab.references')} ({draft.references.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <Field label={t('crossValidation.field.caseId')}>
                <Input
                  value={draft.caseId}
                  onChange={(e) => update('caseId', e.target.value)}
                  data-testid="cv-field-caseId"
                  placeholder="22-jsb-18gr-280-zero30"
                />
              </Field>
              <Field label={t('crossValidation.field.title')}>
                <Input
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
                  data-testid="cv-field-title"
                />
              </Field>
              <Field label={t('crossValidation.field.description')}>
                <Textarea
                  value={draft.description ?? ''}
                  onChange={(e) => update('description', e.target.value)}
                  rows={2}
                />
              </Field>
              <Field label={t('crossValidation.field.tags')}>
                <Input
                  value={(draft.tags ?? []).join(', ')}
                  onChange={(e) =>
                    update(
                      'tags',
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="22, pellet, no-wind"
                />
              </Field>
              <Field label={t('crossValidation.field.notes')}>
                <Textarea
                  value={draft.notes ?? ''}
                  onChange={(e) => update('notes', e.target.value)}
                  rows={3}
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inputs" className="mt-3">
          <InputsEditor draft={draft} onPatch={updateInputs} />
        </TabsContent>

        <TabsContent value="references" className="mt-3 space-y-3">
          {draft.references.map((ref, idx) => (
            <ReferenceEditor
              key={idx}
              index={idx}
              reference={ref}
              onChange={(next) => updateReference(idx, next)}
              onRemove={() => removeReference(idx)}
            />
          ))}
          <Button size="sm" variant="secondary" onClick={addReference} data-testid="cv-add-ref">
            <Plus className="h-4 w-4 mr-1" />
            {t('crossValidation.addReference')}
          </Button>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur py-2 -mx-4 px-4 border-t border-border">
        <Button onClick={onSave} className="w-full sm:w-auto" data-testid="cv-save-btn">
          <Save className="h-4 w-4 mr-1" />
          {t('crossValidation.save')}
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// FIELD HELPER
// -----------------------------------------------------------------------------

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NumField({
  value,
  onChange,
  step = 'any',
  placeholder,
  testId,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: string;
  placeholder?: string;
  testId?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      value={value === undefined || Number.isNaN(value) ? '' : value}
      placeholder={placeholder}
      data-testid={testId}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onChange(undefined);
          return;
        }
        const n = Number(raw);
        onChange(Number.isFinite(n) ? n : undefined);
      }}
    />
  );
}

// -----------------------------------------------------------------------------
// INPUTS EDITOR
// -----------------------------------------------------------------------------

interface InputsEditorProps {
  draft: UserCrossValidationCase;
  onPatch: (patch: Partial<UserCrossValidationCase['inputs']>) => void;
}

function InputsEditor({ draft, onPatch }: InputsEditorProps) {
  const { t } = useI18n();
  const i = draft.inputs;
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('crossValidation.section.projectile')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('crossValidation.input.projectileName')}>
            <Input
              value={i.projectileName}
              onChange={(e) => onPatch({ projectileName: e.target.value })}
              data-testid="cv-input-name"
            />
          </Field>
          <Field label={t('crossValidation.input.projectileType')}>
            <Select
              value={i.projectileType ?? ''}
              onValueChange={(v) =>
                onPatch({ projectileType: (v || undefined) as typeof i.projectileType })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('crossValidation.optional')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pellet">pellet</SelectItem>
                <SelectItem value="slug">slug</SelectItem>
                <SelectItem value="bb">bb</SelectItem>
                <SelectItem value="dart">dart</SelectItem>
                <SelectItem value="other">other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('crossValidation.input.caliber')}>
            <Input
              value={i.caliber}
              onChange={(e) => onPatch({ caliber: e.target.value })}
              placeholder=".22"
            />
          </Field>
          <Field label={t('crossValidation.input.diameterMm')}>
            <NumField value={i.diameterMm} onChange={(v) => onPatch({ diameterMm: v })} />
          </Field>
          <Field label={t('crossValidation.input.weightGrains')}>
            <NumField
              value={i.weightGrains}
              onChange={(v) => onPatch({ weightGrains: v ?? 0 })}
              testId="cv-input-weight"
            />
          </Field>
          <Field label={t('crossValidation.input.bc')}>
            <NumField value={i.bc} onChange={(v) => onPatch({ bc: v ?? 0 })} testId="cv-input-bc" />
          </Field>
          <Field label={t('crossValidation.input.bcModel')}>
            <Select
              value={i.bcModel ?? ''}
              onValueChange={(v) =>
                onPatch({ bcModel: (v || undefined) as typeof i.bcModel })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="G1" />
              </SelectTrigger>
              <SelectContent>
                {['G1', 'G7', 'GA', 'GS', 'RA4', 'GA2', 'SLG0', 'SLG1'].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('crossValidation.input.twistRate')}>
            <NumField value={i.twistRate} onChange={(v) => onPatch({ twistRate: v })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('crossValidation.section.setup')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('crossValidation.input.muzzleVelocity')}>
            <NumField
              value={i.muzzleVelocity}
              onChange={(v) => onPatch({ muzzleVelocity: v ?? 0 })}
              testId="cv-input-mv"
            />
          </Field>
          <Field label={t('crossValidation.input.sightHeight')}>
            <NumField
              value={i.sightHeight}
              onChange={(v) => onPatch({ sightHeight: v ?? 0 })}
            />
          </Field>
          <Field label={t('crossValidation.input.zeroDistance')}>
            <NumField
              value={i.zeroDistance}
              onChange={(v) => onPatch({ zeroDistance: v ?? 0 })}
            />
          </Field>
          <Field label={t('crossValidation.input.rangeMax')}>
            <NumField value={i.rangeMax} onChange={(v) => onPatch({ rangeMax: v ?? 100 })} />
          </Field>
          <Field label={t('crossValidation.input.rangeStep')}>
            <NumField value={i.rangeStep} onChange={(v) => onPatch({ rangeStep: v ?? 10 })} />
          </Field>
          <Field label={t('crossValidation.input.rangeStart')}>
            <NumField value={i.rangeStart} onChange={(v) => onPatch({ rangeStart: v })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('crossValidation.section.atmosphere')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('crossValidation.input.temperatureC')}>
            <NumField value={i.temperatureC} onChange={(v) => onPatch({ temperatureC: v })} />
          </Field>
          <Field label={t('crossValidation.input.pressureHpaAbsolute')}>
            <NumField
              value={i.pressureHpaAbsolute}
              onChange={(v) => onPatch({ pressureHpaAbsolute: v })}
            />
          </Field>
          <Field label={t('crossValidation.input.humidityPercent')}>
            <NumField
              value={i.humidityPercent}
              onChange={(v) => onPatch({ humidityPercent: v })}
            />
          </Field>
          <Field label={t('crossValidation.input.altitudeM')}>
            <NumField value={i.altitudeM} onChange={(v) => onPatch({ altitudeM: v })} />
          </Field>
          <Field label={t('crossValidation.input.windSpeed')}>
            <NumField value={i.windSpeed} onChange={(v) => onPatch({ windSpeed: v })} />
          </Field>
          <Field label={t('crossValidation.input.windDirection')}>
            <NumField
              value={i.windDirection}
              onChange={(v) => onPatch({ windDirection: v })}
            />
          </Field>
          <Field
            label={t('crossValidation.input.windConvention')}
            hint={t('crossValidation.input.windConventionHint')}
          >
            <Input
              value={i.windConvention ?? ''}
              onChange={(e) => onPatch({ windConvention: e.target.value || undefined })}
              placeholder="0=face / 90=droite"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('crossValidation.section.documentary')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <Field label={t('crossValidation.input.sourceUnitsNote')}>
            <Input
              value={i.sourceUnitsNote ?? ''}
              onChange={(e) => onPatch({ sourceUnitsNote: e.target.value || undefined })}
              placeholder="m, mm, m/s, hPa absolu"
            />
          </Field>
          <Field label={t('crossValidation.input.comment')}>
            <Textarea
              value={i.comment ?? ''}
              onChange={(e) => onPatch({ comment: e.target.value || undefined })}
              rows={2}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// REFERENCE EDITOR
// -----------------------------------------------------------------------------

const SOURCE_OPTIONS = [
  'chairgun',
  'chairgun-elite',
  'strelok',
  'strelok-pro',
  'mero',
  'auxiliary',
] as const;
const CONFIDENCE_OPTIONS = ['A', 'B', 'C'] as const;
const EXTRACTION_OPTIONS = [
  'manual-entry',
  'screenshot-retyped',
  'export-csv',
  'export-json',
  'published-table',
] as const;

interface ReferenceEditorProps {
  index: number;
  reference: UserReference;
  onChange: (next: UserReference) => void;
  onRemove: () => void;
}

function ReferenceEditor({ index, reference, onChange, onRemove }: ReferenceEditorProps) {
  const { t } = useI18n();
  const meta = reference.meta;

  const updateMeta = (patch: Partial<UserReference['meta']>) =>
    onChange({ ...reference, meta: { ...reference.meta, ...patch } });

  const updateRow = (idx: number, patch: Partial<UserReference['rows'][number]>) => {
    const rows = reference.rows.slice();
    rows[idx] = { ...rows[idx], ...patch };
    onChange({ ...reference, rows });
  };

  const addRow = () => {
    const last = reference.rows[reference.rows.length - 1];
    onChange({
      ...reference,
      rows: [...reference.rows, makeEmptyReferenceRow((last?.range ?? 0) + 10)],
    });
  };

  const removeRow = (idx: number) => {
    if (reference.rows.length <= 1) {
      toast.error(t('crossValidation.atLeastOneRow'));
      return;
    }
    onChange({ ...reference, rows: reference.rows.filter((_, i) => i !== idx) });
  };

  return (
    <Card data-testid={`cv-reference-${index}`}>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm">
          {t('crossValidation.referenceN', { n: index + 1 })} — {meta.source}
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive h-7 px-2"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('crossValidation.field.source')}>
            <Select value={meta.source} onValueChange={(v) => updateMeta({ source: v as typeof meta.source })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('crossValidation.field.version')}>
            <Input
              value={meta.version}
              onChange={(e) => updateMeta({ version: e.target.value })}
              placeholder="Strelok Pro 6.x"
            />
          </Field>
          <Field label={t('crossValidation.field.confidence')}>
            <Select
              value={meta.confidence}
              onValueChange={(v) => updateMeta({ confidence: v as typeof meta.confidence })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFIDENCE_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('crossValidation.field.extractionMethod')}>
            <Select
              value={meta.extractionMethod}
              onValueChange={(v) =>
                updateMeta({ extractionMethod: v as typeof meta.extractionMethod })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTRACTION_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('crossValidation.field.operator')}>
            <Input
              value={meta.operator ?? ''}
              onChange={(e) => updateMeta({ operator: e.target.value || undefined })}
            />
          </Field>
          <Field label={t('crossValidation.field.extractedAt')}>
            <Input
              value={meta.extractedAt}
              onChange={(e) => updateMeta({ extractedAt: e.target.value })}
            />
          </Field>
          <Field label={t('crossValidation.field.sourceUri')}>
            <Input
              value={meta.sourceUri ?? ''}
              onChange={(e) => updateMeta({ sourceUri: e.target.value || undefined })}
              placeholder="https://… ou chemin local"
            />
          </Field>
          <Field
            label={t('crossValidation.field.assumptions')}
            hint={t('crossValidation.field.assumptionsHint')}
          >
            <Input
              value={(meta.assumptions ?? []).join(' | ')}
              onChange={(e) => {
                const raw = e.target.value
                  .split('|')
                  .map((s) => s.trim())
                  .filter(Boolean);
                updateMeta({ assumptions: raw.length ? raw : undefined });
              }}
              placeholder="vent 90°, BC G1 supposé | …"
            />
          </Field>
        </div>

        <Field label={t('crossValidation.field.refNotes')}>
          <Textarea
            value={meta.notes ?? ''}
            onChange={(e) => updateMeta({ notes: e.target.value || undefined })}
            rows={2}
          />
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t('crossValidation.field.rows')}</Label>
            <Button size="sm" variant="ghost" className="h-7" onClick={addRow}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('crossValidation.addRow')}
            </Button>
          </div>
          <div className="overflow-x-auto -mx-3 px-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-normal py-1 pr-1">range</th>
                  <th className="text-left font-normal py-1 pr-1">drop</th>
                  <th className="text-left font-normal py-1 pr-1">velocity</th>
                  <th className="text-left font-normal py-1 pr-1">tof</th>
                  <th className="text-left font-normal py-1 pr-1">windDrift</th>
                  <th className="text-left font-normal py-1 pr-1">energy</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {reference.rows.map((row, idx) => (
                  <tr key={idx} data-testid={`cv-row-${index}-${idx}`}>
                    <td className="py-1 pr-1">
                      <NumField
                        value={row.range}
                        onChange={(v) => updateRow(idx, { range: v ?? 0 })}
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <NumField value={row.drop} onChange={(v) => updateRow(idx, { drop: v })} />
                    </td>
                    <td className="py-1 pr-1">
                      <NumField
                        value={row.velocity}
                        onChange={(v) => updateRow(idx, { velocity: v })}
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <NumField value={row.tof} onChange={(v) => updateRow(idx, { tof: v })} />
                    </td>
                    <td className="py-1 pr-1">
                      <NumField
                        value={row.windDrift}
                        onChange={(v) => updateRow(idx, { windDrift: v })}
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <NumField
                        value={row.energy}
                        onChange={(v) => updateRow(idx, { energy: v })}
                      />
                    </td>
                    <td className="py-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => removeRow(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            {t('crossValidation.rowsHint')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}