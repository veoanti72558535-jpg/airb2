/// <reference types="web-bluetooth" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChronoConnectButton from './ChronoConnectButton';
import { I18nProvider } from '@/lib/i18n';

const wrap = (ui: React.ReactElement) =>
  render(<I18nProvider>{ui}</I18nProvider>);

describe('ChronoConnectButton', () => {
  beforeEach(() => {
    // Reset navigator.bluetooth
    Object.defineProperty(navigator, 'bluetooth', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  it('shows unsupported when Web Bluetooth is absent', () => {
    wrap(<ChronoConnectButton onVelocity={vi.fn()} />);
    expect(screen.getByText(/Web Bluetooth/i)).toBeInTheDocument();
  });

  it('shows connect button when BLE is supported', () => {
    Object.defineProperty(navigator, 'bluetooth', {
      value: { requestDevice: vi.fn() },
      writable: true,
      configurable: true,
    });
    wrap(<ChronoConnectButton onVelocity={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});