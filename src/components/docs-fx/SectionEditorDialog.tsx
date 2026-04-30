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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? t('docsFx.editor.titleNew') : t('docsFx.editor.titleEdit')}
          </DialogTitle>
          <DialogDescription>{t('docsFx.editor.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value, 10))}
              />
            </div>
            <div>
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
                className="w-32 h-7"
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
            <Tabs defaultValue="write" className="mt-1">
              <TabsList>
                <TabsTrigger value="write">{t('docsFx.editor.tabWrite')}</TabsTrigger>
                <TabsTrigger value="preview">{t('docsFx.editor.tabPreview')}</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="font-mono text-sm min-h-[260px]"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="prose prose-invert max-w-none rounded border border-border bg-muted/40 p-4 min-h-[260px] text-sm">
                  <ReactMarkdown>{body || `_${t('docsFx.editor.previewEmpty')}_`}</ReactMarkdown>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={!canSave}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SectionEditorDialog;