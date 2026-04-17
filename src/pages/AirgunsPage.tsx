import React, { useMemo, useState } from 'react';
import { Target, Plus, Trash2, Edit2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { airgunStore } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { Airgun } from '@/lib/types';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { SearchBar } from '@/components/SearchBar';

export default function AirgunsPage() {
  const { t } = useI18n();
  const { symbol } = useUnits();
  const [airguns, setAirguns] = useState<Airgun[]>(airgunStore.getAll());
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Airgun | null>(null);
  const [form, setForm] = useState({ brand: '', model: '', caliber: '.177', barrelLength: 600, regPressure: 110, fillPressure: 250, powerSetting: '', defaultSightHeight: 40, defaultZeroRange: 30, notes: '' });

  const filteredAirguns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return airguns;
    return airguns.filter(a =>
      `${a.brand} ${a.model} ${a.notes ?? ''}`.toLowerCase().includes(q)
    );
  }, [airguns, searchQuery]);

  const refresh = () => setAirguns(airgunStore.getAll());

  const handleSave = () => {
    if (!form.brand || !form.model) return;
    if (editing) {
      airgunStore.update(editing.id, form);
    } else {
      airgunStore.create(form as any);
    }
    refresh();
    setShowForm(false);
    setEditing(null);
    setForm({ brand: '', model: '', caliber: '.177', barrelLength: 600, regPressure: 110, fillPressure: 250, powerSetting: '', defaultSightHeight: 40, defaultZeroRange: 30, notes: '' });
    toast({ title: t('common.save') });
  };

  const handleDelete = (id: string) => {
    airgunStore.delete(id);
    refresh();
  };

  const handleEdit = (a: Airgun) => {
    setEditing(a);
    setForm({ brand: a.brand, model: a.model, caliber: a.caliber, barrelLength: a.barrelLength ?? 600, regPressure: a.regPressure ?? 110, fillPressure: a.fillPressure ?? 250, powerSetting: a.powerSetting ?? '', defaultSightHeight: a.defaultSightHeight ?? 40, defaultZeroRange: a.defaultZeroRange ?? 30, notes: a.notes ?? '' });
    setShowForm(true);
  };

  const lengthSym = symbol('length');
  const pressSym = symbol('pressure');
  const distSym = symbol('distance');
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('airguns.title')}</h1>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); }}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t('airguns.add')}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.brand')}</label>
              <input className={inputClass} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.model')}</label>
              <input className={inputClass} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.caliber')}</label>
              <select className={inputClass} value={form.caliber} onChange={e => setForm(f => ({ ...f, caliber: e.target.value }))}>
                <option>.177 (4.5mm)</option>
                <option>.22 (5.5mm)</option>
                <option>.25 (6.35mm)</option>
                <option>.30 (7.62mm)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.barrelLength')} ({lengthSym})</label>
              <input type="number" className={inputClass} value={form.barrelLength} onChange={e => setForm(f => ({ ...f, barrelLength: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.regPressure')} ({pressSym})</label>
              <input type="number" className={inputClass} value={form.regPressure} onChange={e => setForm(f => ({ ...f, regPressure: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.fillPressure')} ({pressSym})</label>
              <input type="number" className={inputClass} value={form.fillPressure} onChange={e => setForm(f => ({ ...f, fillPressure: +e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('airguns.notes')}</label>
            <textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">{t('common.save')}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm">{t('common.cancel')}</button>
          </div>
        </motion.div>
      )}

      {airguns.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('common.noData')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {airguns.map(a => (
            <div key={a.id} className="surface-elevated p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{a.brand} {a.model}</div>
                  <div className="text-xs text-muted-foreground font-mono">{a.caliber}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(a)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                {a.barrelLength && <span>{t('airguns.barrelLength')}: {a.barrelLength} {lengthSym}</span>}
                {a.regPressure && <span>Reg: {a.regPressure} {pressSym}</span>}
                {a.fillPressure && <span>Fill: {a.fillPressure} {pressSym}</span>}
              </div>
              {a.notes && <p className="text-xs text-muted-foreground mt-2 italic">{a.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
