/**
 * /docs/fx — User-facing FX documentation hub with search and tag filters.
 *
 * Architecture:
 *  - Reads sections through the hybrid store (seed .md + localStorage
 *    overrides). Drafts are hidden from non-admins.
 *  - Search uses Fuse.js (client-side, instant, offline-friendly).
 *  - Admin gating: `useIsAdmin()` controls visibility of the New / Edit /
 *    Delete affordances. The data store itself does NOT enforce — defense
 *    in depth lives in PostgreSQL RLS for any future server-backed table.
 *
 * Why one page (not /docs/fx + /docs/fx/:id):
 *  - Docs are short and grouped by category; in-page expand keeps the
 *    search → read flow tight on mobile (project core: mobile-first).
 */
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Search, Tag, Plus, Pencil, Trash2, RotateCcw, BookOpen, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';
import { useIsAdmin } from '@/lib/hooks/useIsAdmin';
import {
  deleteSection,
  hasOverride,
  listSections,
  resetSeedSection,
  subscribeOverrideChanges,
  upsertSection,
} from '@/lib/docs-fx/store';
import { listAllTags, paginate, searchDocs } from '@/lib/docs-fx/search';
import type { DocSection, DocCategory } from '@/lib/docs-fx/types';
import { DOC_CATEGORIES } from '@/lib/docs-fx/types';
import { SectionEditorDialog } from '@/components/docs-fx/SectionEditorDialog';
import { ErrorCodesTable } from '@/components/docs-fx/ErrorCodesTable';
import { toast } from 'sonner';

const PAGE_SIZE = 8;
const CATEGORY_ALL = '__all__' as const;

/**
 * Build a compact page list with ellipsis markers around the current page.
 * Always includes first + last; collapses long ranges to keep the bar
 * usable on mobile (target: ≤ 7 visible items).
 */
function buildPageList(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

function useReadSections(includeDrafts: boolean): DocSection[] {
  // Re-read on every render is cheap (≤ a few dozen entries).
  // We track a tick to force refresh after writes.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // Subscribe via the store's pub/sub so we react to BOTH same-tab
    // mutations (which native `storage` events don't fire) AND cross-tab
    // edits (re-broadcast by the store from the `storage` event).
    return subscribeOverrideChanges(() => setTick((x) => x + 1));
  }, []);
  const sections = useMemo(() => {
    void tick;
    return listSections().filter((s) => includeDrafts || s.visibility === 'published');
  }, [tick, includeDrafts]);
  return sections;
}

export default function DocsFxPage() {
  const { t } = useI18n();
  const admin = useIsAdmin();
  const isAdmin = admin.isAdmin;

  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [category, setCategory] = useState<DocCategory | typeof CATEGORY_ALL>(CATEGORY_ALL);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTarget, setEditorTarget] = useState<DocSection | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DocSection | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Read sections (drafts only visible to admin) AND keep the page tick in
  // sync with override mutations (auto-invalidates Fuse via the store).
  void useReadSections(isAdmin);
  useEffect(() => {
    return subscribeOverrideChanges(() => setRefreshTick((x) => x + 1));
  }, []);

  const allTags = useMemo(() => {
    void refreshTick;
    return listAllTags(isAdmin);
  }, [isAdmin, refreshTick]);

  const hits = useMemo(() => {
    void refreshTick;
    return searchDocs(query, {
      tags: activeTags.length > 0 ? activeTags : undefined,
      category: category === CATEGORY_ALL ? undefined : category,
      includeDrafts: isAdmin,
    });
  }, [query, activeTags, category, isAdmin, refreshTick]);

  // Any filter change resets pagination so the user lands on page 1.
  useEffect(() => {
    setPage(1);
  }, [query, activeTags, category]);

  const pageData = useMemo(
    () => paginate(hits, { page, pageSize: PAGE_SIZE }),
    [hits, page],
  );
  // Clamp the page if a refresh shrinks the result set below the current page.
  useEffect(() => {
    if (pageData.page !== page) setPage(pageData.page);
  }, [pageData.page, page]);

  function toggleTag(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }
  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setQuery('');
    setActiveTags([]);
    setCategory(CATEGORY_ALL);
  }

  function openNew() {
    setEditorTarget(null);
    setEditorOpen(true);
  }
  function openEdit(section: DocSection) {
    setEditorTarget(section);
    setEditorOpen(true);
  }
  function handleSave(input: Parameters<typeof upsertSection>[0]) {
    upsertSection(input);
    setEditorOpen(false);
    toast.success(t('docsFx.toast.saved'));
  }
  function handleDelete(section: DocSection) {
    deleteSection(section.id);
    setConfirmDelete(null);
    toast.success(section.fromSeed ? t('docsFx.toast.hidden') : t('docsFx.toast.deleted'));
  }
  function handleResetSeed(section: DocSection) {
    resetSeedSection(section.id);
    toast.success(t('docsFx.toast.reset'));
  }

  return (
    <div className="container mx-auto max-w-4xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {t('docsFx.page.title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t('docsFx.page.subtitle')}</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t('docsFx.page.newSection')}</span>
          </Button>
        )}
      </header>

      {/*
        Sticky search/filter rail on mobile so users keep search-as-you-type
        accessible while scrolling through long sections. backdrop-blur keeps
        the underlying content readable on dark backgrounds.
      */}
      <div className="space-y-3 sticky top-0 z-10 -mx-3 sm:mx-0 px-3 sm:px-0 py-2 sm:py-0 bg-background/85 sm:bg-transparent backdrop-blur sm:backdrop-blur-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('docsFx.search.placeholder')}
            className="pl-9"
            aria-label={t('docsFx.search.placeholder')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="docsfx-category">
            {t('docsFx.search.categoryLabel')}
          </label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as DocCategory | typeof CATEGORY_ALL)}
          >
            <SelectTrigger id="docsfx-category" className="h-8 w-full max-w-[200px] sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CATEGORY_ALL}>{t('docsFx.search.categoryAll')}</SelectItem>
              {DOC_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`docsFx.category.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(query.trim() !== '' || activeTags.length > 0 || category !== CATEGORY_ALL) && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground underline ml-auto"
            >
              {t('docsFx.search.clearAll')}
            </button>
          )}
        </div>
        {allTags.length > 0 && (
          // Single-row scrollable tag rail on mobile (no wrap blow-up); wraps
          // on >= sm where vertical real estate is cheaper.
          <div className="flex sm:flex-wrap gap-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-thin">
            <Tag className="h-4 w-4 text-muted-foreground self-center shrink-0" />
            {allTags.map((tag) => {
              const active = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded shrink-0"
                  aria-pressed={active}
                >
                  <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer">
                    {tag}
                  </Badge>
                </button>
              );
            })}
            {activeTags.length > 0 && (
              <button
                onClick={() => setActiveTags([])}
                className="text-xs text-muted-foreground underline self-center shrink-0"
              >
                {t('docsFx.search.clearTags')}
              </button>
            )}
          </div>
        )}
      </div>

      {hits.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('docsFx.search.resultsCount')
            .replace('{count}', String(hits.length))
            .replace('{from}', String((pageData.page - 1) * PAGE_SIZE + 1))
            .replace('{to}', String((pageData.page - 1) * PAGE_SIZE + pageData.items.length))}
        </p>
      )}

      {hits.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          {t('docsFx.search.empty')}
        </Card>
      )}

      {/*
        Pinned, non-editable error catalog. Mounted unconditionally above
        the editable sections so admins cannot accidentally hide it via
        the section editor. Hidden when the user is actively filtering by
        a non-error tag to keep the search results focused.
      */}
      {query.trim() === '' && activeTags.length === 0 && category === CATEGORY_ALL && page === 1 && (
        <Card className="p-4">
          <ErrorCodesTable />
        </Card>
      )}

      <div className="space-y-3">
        {pageData.items.map(({ section }) => {
          const isOpen = expanded.has(section.id);
          const overridden = hasOverride(section.id);
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Card className="overflow-hidden">
                <button
                  onClick={() => toggleExpanded(section.id)}
                  className="w-full text-left p-3 sm:p-4 flex items-start justify-between gap-3 hover:bg-muted/40 min-h-[56px]"
                  aria-expanded={isOpen}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-heading font-semibold text-sm sm:text-base leading-tight break-words">
                        {section.title}
                      </h2>
                      <Badge variant="outline" className="text-[10px]">
                        {t(`docsFx.category.${section.category}`)}
                      </Badge>
                      {section.visibility === 'draft' && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t('docsFx.visibility.draft')}
                        </Badge>
                      )}
                      {overridden && (
                        <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border border-amber-500/30">
                          {t('docsFx.badge.edited')}
                        </Badge>
                      )}
                    </div>
                    {section.tags.length > 0 && (
                      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1.5">
                        {section.tags.map((tag) => (
                          <span key={tag} className="text-[10px] text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 mt-1 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-3 sm:px-4 pb-4 border-t border-border">
                    {/*
                      Reading mode tweaks for mobile:
                      - prose-sm baseline keeps line-height comfortable
                      - tables/code blocks scroll horizontally inside the card
                      - break-words prevents long URLs from blowing out width
                    */}
                    <div className="prose prose-sm prose-invert max-w-none mt-3 break-words [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_img]:max-w-full">
                      <ReactMarkdown>{section.body}</ReactMarkdown>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/40">
                        <Button size="sm" variant="outline" onClick={() => openEdit(section)}>
                          <Pencil className="h-3 w-3 mr-1" /> {t('common.edit')}
                        </Button>
                        {section.fromSeed && overridden && (
                          <Button size="sm" variant="ghost" onClick={() => handleResetSeed(section)}>
                            <RotateCcw className="h-3 w-3 mr-1" /> {t('docsFx.action.resetSeed')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(section)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {section.fromSeed ? t('docsFx.action.hide') : t('common.delete')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {pageData.pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={pageData.page <= 1}
                className={pageData.page <= 1 ? 'pointer-events-none opacity-50' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  if (pageData.page > 1) setPage(pageData.page - 1);
                }}
              />
            </PaginationItem>
            {buildPageList(pageData.page, pageData.pageCount).map((entry, idx) =>
              entry === 'ellipsis' ? (
                <PaginationItem key={`e-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={entry}>
                  <PaginationLink
                    href="#"
                    isActive={entry === pageData.page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(entry);
                    }}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={pageData.page >= pageData.pageCount}
                className={
                  pageData.page >= pageData.pageCount ? 'pointer-events-none opacity-50' : ''
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (pageData.page < pageData.pageCount) setPage(pageData.page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <SectionEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        section={editorTarget}
        onSave={handleSave}
      />

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.fromSeed
                ? t('docsFx.confirm.hideTitle')
                : t('docsFx.confirm.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.fromSeed
                ? t('docsFx.confirm.hideBody')
                : t('docsFx.confirm.deleteBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}