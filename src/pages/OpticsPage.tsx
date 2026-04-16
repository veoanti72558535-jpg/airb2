import React, { useState } from 'react';
import { Eye, Plus, Trash2, Edit2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { opticStore } from '@/lib/storage';
import { Optic } from '@/lib/types';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

export default function OpticsPage() {
  const { t } = useI18n();
  const [optics, setOptics] = useState<Optic[]>(opticStore.getAll());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Optic | null>(null);
  const [form, setForm] = useState<{ name: string; type: string; clickUnit: 'MOA' | 'MRAD' | 'mil'; clickValue: number; mountHeight: number; notes: string }>({ name: '', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 0, notes: '' });

  const refresh = () => setOptics(opticStore.getAll());

  const handleSave = () => {
    if (!form.name) return;
    if (editing) {
      opticStore.update(editing.id, form);
    } else {
      opticStore.create(form as any);
    }
    refresh();
    setShowForm(false);
    setEditing(null);
    toast({ title: t('common.save') });
  };

  const handleDelete = (id: string) => { opticStore.delete(id); refresh(); };
  const handleEdit = (o: Optic) => {
    setEditing(o);
    setForm({ name: o.name, type: o.type ?? 'scope', clickUnit: o.clickUnit, clickValue: o.clickValue, mountHeight: o.mountHeight ?? 0, notes: o.notes ?? '' });
    setShowForm(true);
  };

  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('optics.title')}</h1>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
          <Plus className="h-4 w-4" />{t('optics.add')}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t('optics.name')}</label><input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">{t('optics.type')}</label>
              <select className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="scope">Scope</option><option value="red-dot">Red Dot</option><option value="iron">Iron Sights</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">{t('optics.clickUnit')}</label>
              <select className={inputClass} value={form.clickUnit} onChange={e => setForm(f => ({ ...f, clickUnit: e.target.value as any }))}>
                <option>MOA</option><option>MRAD</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">{t('optics.clickValue')}</label>
              <input type="number" step="0.01" className={inputClass} value={form.clickValue} onChange={e => setForm(f => ({ ...f, clickValue: +e.target.value }))} />
            </div>
          </div>
          <div><label className="text-xs text-muted-foreground">{t('airguns.notes')}</label><textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">{t('common.save')}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm">{t('common.cancel')}</button>
          </div>
        </motion.div>
      )}

      {optics.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('common.noData')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {optics.map(o => (
            <div key={o.id} className="surface-elevated p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm">{o.name}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="tactical-badge">{o.clickUnit}</span>
                    <span className="tactical-badge">{o.clickValue} / click</span>
                    {o.type && <span className="text-xs text-muted-foreground">{o.type}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(o)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(o.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
