/**
 * Tests du helper de diagnostic global de capacité de stockage.
 * Couvre :
 *  - cas supporté nominal (usage + quota fournis)
 *  - cas supporté partiel (champs manquants)
 *  - cas non supporté (API absente)
 *  - cas erreur (estimate rejette)
 *  - classification des seuils watch/critical
 *  - formatage MB/GB
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getStorageQuotaDiagnostic,
  formatBytesMB,
  QUOTA_WATCH_PERCENT,
  QUOTA_CRITICAL_PERCENT,
} from './storage-quota-diagnostic';

const originalStorage = (navigator as any).storage;

function mockEstimate(impl: () => Promise<{ usage?: number; quota?: number }>) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { estimate: impl },
  });
}

afterEach(() => {
  if (originalStorage === undefined) {
    delete (navigator as any).storage;
  } else {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: originalStorage,
    });
  }
});

describe('storage-quota-diagnostic', () => {
  it('reports supported + computes percent when usage and quota are present', async () => {
    mockEstimate(async () => ({ usage: 50 * 1024 * 1024, quota: 500 * 1024 * 1024 }));
    const diag = await getStorageQuotaDiagnostic();
    expect(diag.supported).toBe(true);
    expect(diag.usageBytes).toBe(50 * 1024 * 1024);
    expect(diag.quotaBytes).toBe(500 * 1024 * 1024);
    expect(diag.usagePercent).toBe(10);
    expect(diag.severity).toBe('normal');
    expect(diag.errorHint).toBeNull();
  });

  it('classifies usage above watch threshold as "watch"', async () => {
    mockEstimate(async () => ({ usage: 75, quota: 100 }));
    const diag = await getStorageQuotaDiagnostic();
    expect(diag.usagePercent).toBe(75);
    expect(diag.severity).toBe('watch');
    expect(QUOTA_WATCH_PERCENT).toBeLessThanOrEqual(75);
  });

  it('classifies usage above critical threshold as "critical"', async () => {
    mockEstimate(async () => ({ usage: 95, quota: 100 }));
    const diag = await getStorageQuotaDiagnostic();
    expect(diag.severity).toBe('critical');
    expect(QUOTA_CRITICAL_PERCENT).toBeLessThanOrEqual(95);
  });

  it('keeps null when fields are missing instead of inventing values', async () => {
    mockEstimate(async () => ({ usage: 100 }));
    const diag = await getStorageQuotaDiagnostic();
    expect(diag.supported).toBe(true);
    expect(diag.usageBytes).toBe(100);
    expect(diag.quotaBytes).toBeNull();
    expect(diag.usagePercent).toBeNull();
    expect(diag.severity).toBe('unknown');
  });

  it('reports unsupported when navigator.storage.estimate is missing', async () => {
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
    const diag = await getStorageQuotaDiagnostic();
    expect(diag.supported).toBe(false);
    expect(diag.severity).toBe('unknown');
    expect(diag.errorHint).toContain('unavailable');
  });

  it('reports unsupported when estimate() rejects', async () => {
    mockEstimate(async () => {
      throw new Error('blocked by user');
    });
    const diag = await getStorageQuotaDiagnostic();
    expect(diag.supported).toBe(false);
    expect(diag.errorHint).toBe('blocked by user');
  });

  it('formats bytes into compact MB/GB units', () => {
    expect(formatBytesMB(null)).toBe('—');
    expect(formatBytesMB(0)).toBe('0.0 MB');
    expect(formatBytesMB(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytesMB(50 * 1024 * 1024)).toBe('50 MB');
    expect(formatBytesMB(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });
});