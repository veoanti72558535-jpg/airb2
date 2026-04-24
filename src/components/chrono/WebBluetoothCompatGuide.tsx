import { AlertTriangle, BluetoothOff, ExternalLink, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { WebBluetoothSupport } from '@/lib/chrono/web-bluetooth-support';

interface Props {
  support: WebBluetoothSupport;
}

/**
 * Contextual compatibility guide shown when Web Bluetooth is not usable.
 * Picks the message + recommended action based on `support.reason`.
 */
export default function WebBluetoothCompatGuide({ support }: Props) {
  const { t } = useI18n();
  const { reason, browser } = support;

  // Pick title + body keys based on reason
  const titleKey = (() => {
    switch (reason) {
      case 'ios-webkit':         return 'chrono.compat.iosTitle';
      case 'firefox':            return 'chrono.compat.firefoxTitle';
      case 'safari':             return 'chrono.compat.safariTitle';
      case 'insecure-context':   return 'chrono.compat.insecureTitle';
      case 'no-bluetooth-api':
      case 'no-request-device':  return 'chrono.compat.noApiTitle';
      default:                   return 'chrono.compat.unknownTitle';
    }
  })() as Parameters<typeof t>[0];

  const bodyKey = (() => {
    switch (reason) {
      case 'ios-webkit':         return 'chrono.compat.iosBody';
      case 'firefox':            return 'chrono.compat.firefoxBody';
      case 'safari':             return 'chrono.compat.safariBody';
      case 'insecure-context':   return 'chrono.compat.insecureBody';
      case 'no-bluetooth-api':
      case 'no-request-device':  return 'chrono.compat.noApiBody';
      default:                   return 'chrono.compat.unknownBody';
    }
  })() as Parameters<typeof t>[0];

  // Recommendations: ordered list of bullet points
  const recommendations: string[] = (() => {
    switch (reason) {
      case 'ios-webkit':
        return [
          t('chrono.compat.tip.useAndroid'),
          t('chrono.compat.tip.bluefyApp'),
          t('chrono.compat.tip.useDesktop'),
        ];
      case 'firefox':
        return [
          t('chrono.compat.tip.installChrome'),
          t('chrono.compat.tip.installEdge'),
        ];
      case 'safari':
        return browser.os === 'macos'
          ? [t('chrono.compat.tip.installChrome'), t('chrono.compat.tip.installEdge')]
          : [t('chrono.compat.tip.useAndroid'), t('chrono.compat.tip.bluefyApp')];
      case 'insecure-context':
        return [t('chrono.compat.tip.https'), t('chrono.compat.tip.localhost')];
      case 'no-bluetooth-api':
        return [
          t('chrono.compat.tip.updateBrowser'),
          t('chrono.compat.tip.enableFlag'),
          t('chrono.compat.tip.osBluetooth'),
        ];
      case 'no-request-device':
        return [t('chrono.compat.tip.updateBrowser'), t('chrono.compat.tip.osBluetooth')];
      default:
        return [t('chrono.compat.tip.updateBrowser'), t('chrono.compat.tip.osBluetooth')];
    }
  })();

  const Icon = reason === 'insecure-context' ? ShieldAlert : BluetoothOff;

  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3 text-sm"
      data-testid="webble-compat-guide"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-destructive">{t(titleKey)}</h3>
          <p className="text-muted-foreground text-xs">{t(bodyKey)}</p>
        </div>
      </div>

      {recommendations.length > 0 && (
        <ul className="ml-8 list-disc space-y-1 text-xs text-foreground">
          {recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      )}

      <div className="ml-8 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t('chrono.compat.detected')}: <code className="font-mono">{browser.family} / {browser.os}</code>
        </span>
        <a
          href="https://caniuse.com/web-bluetooth"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {t('chrono.compat.checkCompat')}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
