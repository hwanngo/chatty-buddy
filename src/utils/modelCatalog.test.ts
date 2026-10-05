import { describe, expect, it, vi } from 'vitest';
import bundled from '../../public/models.json';
import {
  fetchModelsJson,
  MODEL_CACHE_KEY,
  parseModelCatalog,
} from './modelCatalog';

const data = {
  data: [
    {
      id: 'test-model',
      context_length: 8192,
      architecture: { modality: 'text->text' },
      pricing: { prompt: '0', completion: '0' },
    },
  ],
};
const response = () =>
  new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });

describe('model catalog recovery', () => {
  it('accepts the bundled catalog including explicitly unknown routing prices', () => {
    const parsed = parseModelCatalog(bundled);
    expect(parsed.data).toHaveLength(bundled.data.length);
    expect(
      parsed.data.find((model) => model.id === 'openrouter/auto')?.pricing
        .prompt
    ).toBe('-1');
  });
  it.each([
    '{broken',
    JSON.stringify({ timestamp: Date.now(), data: { data: [{}] } }),
  ])('evicts invalid cache and loads network: %s', async (raw) => {
    localStorage.setItem(MODEL_CACHE_KEY, raw);
    const fetchMock = vi.fn().mockResolvedValue(response());
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchModelsJson()).data[0].id).toBe('test-model');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(localStorage.getItem(MODEL_CACHE_KEY)!).data.data[0].id
    ).toBe('test-model');
  });
  it('keeps network results when cache persistence fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    const fetchMock = vi.fn().mockResolvedValue(response());
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchModelsJson()).data[0].id).toBe('test-model');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('falls back to bundled data after invalid network metadata', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"data":[null]}', {
          headers: { 'content-type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(response());
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchModelsJson()).data[0].id).toBe('test-model');
    expect(fetchMock.mock.calls[1][0]).toBe('/models.json');
  });
});
