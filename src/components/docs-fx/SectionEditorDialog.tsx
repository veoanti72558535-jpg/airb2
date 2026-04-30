/**
 * Admin-only editor for an FX documentation section.
 *
 * Visibility:
 *   - The dialog itself never enforces admin — the host page (DocsFxPage)
 *     only mounts the trigger when `useIsAdmin().isAdmin === true`. This
 *     follows the project pattern (RequireAdmin / has_role RPC).
 *
 * Markdown editing is plain <textarea> + react-markdown preview tab. A
 * heavier WYSIWYG would inflate the bundle for a feature used by 1
 * person; the textarea + preview combo matches the `docs/` workflow.
 */
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { DOC_CATEGORIES, DOC_VISIBILITIES, type DocSection } from '@/lib/docs-fx/types';
import { useI18n } from '@/lib/i18n';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export interface SectionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, edits this section. When null, creates a new one. */
  section: DocSection | null;
  onSave: (input: {
    id: string;
    title: string;
    body: string;
    tags: string[];
    category: DocSection['category'];
    order: number;
    visibility: DocSection['visibility'];
  }) => void;
}

export function SectionEditorDialog({ open, onOpenChange, section, onSave }: SectionEditorDialogProps) {
  const { t } = useI18n();
  const isNew = section === null;

  const [title, setTitle] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [category, setCategory] = useState<DocSection['category']>('general');
  const [order, setOrder] = useState<number>(100);
  const [visibility, setVisibility] = useState<DocSection['visibility']>('published');

  useEffect(() => {
    if (!open) return;
    if (section) {
      setTitle(section.title);
      setId(section.id);
      setIdTouched(true);
      setBody(section.body);
      setTags(section.tags);
      setCategory(section.category);
      setOrder(section.order);
      setVisibility(section.visibility);
    } else {
      setTitle('');
      setId('');
      setIdTouched(false);
      setBody('');
      setTags([]);
      setCategory('general');
      setOrder(100);
      setVisibility('published');
    }
    setTagDraft('');
  }, [open, section]);

  // Auto-derive id from title until the admin manually edits it.
  useEffect(() => {
    if (!isNew || idTouched) return;
    setId(slugify(title));
  }, [title, isNew, idTouched]);

  const canSave = useMemo(() => {
    return title.trim().length > 0 && id.trim().length > 0 && body.trim().length > 0;
  }, [title, id, body]);

  function addTag() {
    const v = tagDraft.trim().toLowerCase();
    if (!v || tags.includes(v)) {
      setTagDraft('');
      return;
    }
    setTags([...tags, v]);
    setTagDraft('');
  }

  function handleSave() {
    if (!canSave) return;
    onSave({
      id: id.trim(),
      title: title.trim(),
      body,
      tags,
      category,
      order: Number.isFinite(order) ? order : 100,
      visibility,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Mobile: occupy the full viewport (h-[100dvh], rounded-none) so the
        soft-keyboard can push the textarea around without clipping the
        action bar. Desktop: keep the centered modal pattern.
      */}
      <DialogContent className="max-w-3xl w-screen sm:w-auto h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-lg p-0 sm:p-6 gap-0 sm:gap-4 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 sm:px-0 pt-4 sm:pt-0 shrink-0">
          <DialogTitle>
            {isNew ? t('docsFx.editor.titleNew') : t('docsFx.editor.titleEdit')}
          </DialogTitle>
          <DialogDescription>{t('docsFx.editor.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-4 sm:px-0 py-4 sm:py-0 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t('docsFx.editor.fieldTitle')}</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('docsFx.editor.fieldId')}</label>
              <Input
                value={id}
                disabled={!isNew}
                onChange={(e) => {
                  setIdTouched(true);
                  setId(slugify(e.target.value));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t('docsFx.editor.fieldCategory')}</label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocSection['category'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{t(`docsFx.category.${c}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('docsFx.editor.fieldOrder')}</label>
              <Input
                type="number"
                inputMode="numeric"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value, 10))}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-muted-foreground">{t('docsFx.editor.fieldVisibility')}</label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as DocSection['visibility'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_VISIBILITIES.map((v) => (
                    <SelectItem key={v} value={v}>{t(`docsFx.visibility.${v}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{t('docsFx.editor.fieldTags')}</label>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== tag))}
                    aria-label={`remove ${tag}`}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                className="w-32 h-8"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder={t('docsFx.editor.tagsPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{t('docsFx.editor.fieldBody')}</label>
            {/*
              Body editing strategy:
              - Mobile (< md): tabbed Write / Preview to maximize each pane.
              - Desktop (>= md): split-pane (textarea + live preview) so the
                admin sees rendered output without tab-toggling.
            */}
            {/* Mobile: tabbed */}
            <div className="md:hidden">
              <Tabs defaultValue="write" className="mt-1">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="write">{t('docsFx.editor.tabWrite')}</TabsTrigger>
                  <TabsTrigger value="preview">{t('docsFx.editor.tabPreview')}</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="font-mono text-sm min-h-[45vh]"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="prose prose-sm prose-invert max-w-none rounded border border-border bg-muted/40 p-3 min-h-[45vh] text-sm break-words [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto">
                    <ReactMarkdown>{body || `_${t('docsFx.editor.previewEmpty')}_`}</ReactMarkdown>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            {/* Desktop: split-pane */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-3 mt-1">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-sm min-h-[320px]"
                aria-label={t('docsFx.editor.tabWrite')}
              />
              <div
                className="prose prose-sm prose-invert max-w-none rounded border border-border bg-muted/40 p-4 min-h-[320px] text-sm overflow-y-auto break-words [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto"
                aria-label={t('docsFx.editor.tabPreview')}
              >
                <ReactMarkdown>{body || `_${t('docsFx.editor.previewEmpty')}_`}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 sm:px-0 py-3 sm:py-0 border-t sm:border-t-0 border-border bg-background shrink-0 gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="flex-1 sm:flex-none">
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SectionEditorDialog;