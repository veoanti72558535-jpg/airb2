import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AdvancedDisclosure } from '@/components/AdvancedDisclosure';
import type { BleParseConfig, BleDataFormat, BleEndian } from '@/lib/chrono/fx-radar-ble';
import { DEFAULT_BLE_PARSE_CONFIG } from '@/lib/chrono/fx-radar-ble';

interface Props {
  value: BleParseConfig;
  onChange: (config: BleParseConfig) => void;
  disabled?: boolean;
}

export default function ChronoBleSettings({ value, onChange, disabled }: Props) {
  const { t } = useI18n();

  return (
    <AdvancedDisclosure
      title={t('chrono.settings.title' as any) || 'BLE parse settings'}
      description={t('chrono.settings.desc' as any) || 'Adjust how velocity bytes are interpreted'}
    >
      <div className="space-y-4">
        {/* Data format */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">{t('chrono.settings.format' as any) || 'Data format'}</Label>
          <RadioGroup
            value={value.format}
            onValueChange={(v) => onChange({ ...value, format: v as BleDataFormat })}
            disabled={disabled}
            className="grid grid-cols-2 gap-2"
          >
            {(['auto', 'float32', 'uint16', 'uint8'] as BleDataFormat[]).map((fmt) => (
              <div key={fmt} className="flex items-center gap-2">
                <RadioGroupItem value={fmt} id={`fmt-${fmt}`} />
                <Label htmlFor={`fmt-${fmt}`} className="text-xs font-mono cursor-pointer">
                  {fmt === 'auto' ? (t('chrono.settings.auto' as any) || 'Auto') : fmt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Endianness */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">{t('chrono.settings.endian' as any) || 'Byte order'}</Label>
          <RadioGroup
            value={value.endian}
            onValueChange={(v) => onChange({ ...value, endian: v as BleEndian })}
            disabled={disabled}
            className="flex gap-4"
          >
            {(['little', 'big'] as BleEndian[]).map((e) => (
              <div key={e} className="flex items-center gap-2">
                <RadioGroupItem value={e} id={`endian-${e}`} />
                <Label htmlFor={`endian-${e}`} className="text-xs font-mono cursor-pointer">
                  {e === 'little' ? 'Little-endian' : 'Big-endian'}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Divisor */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">{t('chrono.settings.divisor' as any) || 'Divisor'}</Label>
          <p className="text-[10px] text-muted-foreground">
            {t('chrono.settings.divisorHint' as any) || 'e.g. 10 if device sends tenths of m/s'}
          </p>
          <Input
            type="number"
            min="1"
            step="1"
            value={value.divisor}
            onChange={(e) => {
              const d = parseFloat(e.target.value);
              if (d > 0) onChange({ ...value, divisor: d });
            }}
            disabled={disabled || value.format === 'auto'}
            className="w-24 font-mono text-sm"
          />
        </div>
      </div>
    </AdvancedDisclosure>
  );
}