import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { geocodeCity } from './weather';

describe('geocodeCity', () => {
  const realFetch = global.fetch;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('returns [] without calling fetch when query is shorter than 2 chars', async () => {
    expect(await geocodeCity('')).toEqual([]);
    expect(await geocodeCity(' ')).toEqual([]);
    expect(await geocodeCity('a')).toEqual([]);
    expect(await geocodeCity('  a  ')).toEqual([]); // trims first
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps Open-Meteo results to GeocodeResult shape', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            name: 'Paris',
            latitude: 48.8534,
            longitude: 2.3488,
            country: 'France',
            country_code: 'FR',
            admin1: 'Île-de-France',
            population: 2138551,
          },
          {
            name: 'Paris',
            latitude: 33.6617,
            longitude: -95.5555,
            country: 'United States',
            country_code: 'US',
            admin1: 'Texas',
          },
        ],
      }),
    } as Response);

    const results = await geocodeCity('Paris');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      name: 'Paris',
      latitude: 48.8534,
      longitude: 2.3488,
      country: 'France',
      countryCode: 'FR',
      admin1: 'Île-de-France',
      population: 2138551,
    });
    expect(results[1].countryCode).toBe('US');
    expect(results[1].population).toBeUndefined();
  });

  it('returns [] when Open-Meteo returns no results array', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ generationtime_ms: 0.1 }),
    } as Response);
    expect(await geocodeCity('zzzzznotacity')).toEqual([]);
  });

  it('builds the request URL with name, count, language and format', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await geocodeCity('Lyon', { count: 5, language: 'fr' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain('https://geocoding-api.open-meteo.com/v1/search');
    expect(url).toContain('name=Lyon');
    expect(url).toContain('count=5');
    expect(url).toContain('language=fr');
    expect(url).toContain('format=json');
  });

  it('defaults to count=8 and language=en', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await geocodeCity('London');
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain('count=8');
    expect(url).toContain('language=en');
  });

  it('throws on HTTP error responses', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(geocodeCity('Paris')).rejects.toThrow(/HTTP 500/);

    fetchSpy.mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    await expect(geocodeCity('Paris')).rejects.toThrow(/HTTP 429/);
  });

  it('propagates network errors', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'));
    await expect(geocodeCity('Paris')).rejects.toThrow('network down');
  });

  it('forwards the AbortSignal to fetch', async () => {
    const ctrl = new AbortController();
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await geocodeCity('Paris', { signal: ctrl.signal });
    const init = fetchSpy.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.signal).toBe(ctrl.signal);
  });
});
