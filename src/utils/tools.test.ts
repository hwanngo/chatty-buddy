import { describe, expect, it, vi } from 'vitest';
import { executeToolCall } from './tools';
import type { ToolCallInterface } from '@type/chat';
const call = (url = 'https://example.com'): ToolCallInterface => ({
  id: 'call',
  type: 'function',
  function: { name: 'fetch_url', arguments: JSON.stringify({ url }) },
});

describe('client tool boundary', () => {
  it('never sends an unapproved URL to the reader', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(executeToolCall(call())).rejects.toThrow('disabled');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects credentials and local targets before any network request', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    for (const url of [
      'https://user:pass@example.com',
      'http://127.0.0.1',
      'http://localhost',
      'file:///etc/passwd',
    ]) {
      const result = await executeToolCall(call(url), undefined, true);
      expect(result.content).toMatch(/^Error:/);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('stops consuming a large reader body and truncates the tool result', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(
          new TextEncoder().encode('readable page '.repeat(10000))
        );
      },
      cancel() {
        cancelled = true;
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    const result = await executeToolCall(call(), undefined, true);
    expect(result.content).toContain('[Content truncated');
    expect(result.content.length).toBeLessThan(20100);
    expect(cancelled).toBe(true);
  });
});
