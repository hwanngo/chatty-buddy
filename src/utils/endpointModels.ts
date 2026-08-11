import { anthropicAPIEndpoint, officialAPIEndpoint } from '@constants/auth';
import { isAzureEndpoint } from '@utils/api';
import { assertSafeApiEndpoint } from '@utils/url';

export type EndpointApiType = 'openai' | 'anthropic';

const AZURE_DEFAULT_API_VERSION = '2024-02-01';
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_KEY = 'endpoint_models_cache';
// One entry per endpoint the user has ever pointed at would grow forever;
// keep the most recently added handful and drop the rest.
const CACHE_MAX_ENTRIES = 20;

/** Trailing slashes and casing are not meaningful when comparing endpoints. */
const normalizeEndpoint = (endpoint: string): string =>
  endpoint.trim().toLowerCase().replace(/\/+$/, '');

const HOSTED_DEFAULT_ENDPOINTS = [
  officialAPIEndpoint,
  anthropicAPIEndpoint,
].map(normalizeEndpoint);

/**
 * True for the app's own hosted defaults. Their `/v1/models` answers with the
 * whole account inventory — embeddings, tts, whisper, image models — which is
 * a worse picker than the curated catalog, and none of those ids carry the
 * context/pricing metadata the catalog has. Only genuinely custom endpoints
 * (LAN, Tailscale, self-hosted proxies) are worth asking.
 */
export const isHostedDefaultEndpoint = (endpoint: string): boolean =>
  HOSTED_DEFAULT_ENDPOINTS.includes(normalizeEndpoint(endpoint));

/**
 * Maps a chat endpoint to the sibling endpoint that lists models. Returns null
 * when the URL has a shape we don't recognise — a normal outcome that simply
 * means "don't ask", not an error.
 */
export const deriveModelsUrl = (
  endpoint: string,
  apiType: EndpointApiType,
  apiVersion?: string
): string | null => {
  let url: URL;
  try {
    url = new URL(endpoint.trim());
  } catch {
    return null;
  }

  if (apiType === 'openai' && isAzureEndpoint(endpoint)) {
    // The model list lives at the resource root, so the origin alone is the
    // base: keeping the configured path would 404 when the stored endpoint is
    // the full `/openai/deployments/<name>/chat/completions` form.
    const version = apiVersion?.trim() || AZURE_DEFAULT_API_VERSION;
    return `${url.origin}/openai/models?api-version=${version}`;
  }

  const path = url.pathname.replace(/\/+$/, '');
  const suffix = apiType === 'anthropic' ? '/messages' : '/chat/completions';
  if (!path.endsWith(suffix)) return null;

  url.pathname = `${path.slice(0, -suffix.length)}/models`;
  url.search = '';
  url.hash = '';
  return url.toString();
};

const readCache = (): Record<string, string[]> => {
  try {
    const raw = globalThis.localStorage?.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Reads one endpoint's cached ids. The cache is just a localStorage blob any
 * other script (or a previous, buggier version of this one) can have written,
 * so its contents are treated as untrusted: anything that isn't a non-empty
 * string is dropped rather than being handed to the picker.
 */
const readCachedIds = (modelsUrl: string): string[] => {
  const cached = readCache()[modelsUrl];
  if (!Array.isArray(cached)) return [];
  return cached.filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0
  );
};

const writeCache = (modelsUrl: string, ids: string[]): void => {
  try {
    const next: Record<string, string[]> = { ...readCache(), [modelsUrl]: ids };
    const keys = Object.keys(next);
    // Object key order is insertion order, so the oldest entries are first.
    // Math.max guards the under-cap case: slice(0, negative) would count from
    // the end and evict the newest entries instead of none.
    const excess = Math.max(0, keys.length - CACHE_MAX_ENTRIES);
    for (const stale of keys.slice(0, excess)) {
      delete next[stale];
    }
    globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota: the cache is an optimisation, not a requirement.
  }
};

/** Pulls model ids out of every response shape these servers actually return. */
const extractIds = (payload: unknown): string[] => {
  const root = payload as { data?: unknown[]; models?: unknown[] } | null;
  const entries = Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root?.models)
      ? root.models
      : [];

  const ids: string[] = [];
  for (const entry of entries) {
    const record = entry as { id?: unknown; name?: unknown };
    const raw = typeof record?.id === 'string' ? record.id : record?.name;
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
};

/**
 * Asks the configured endpoint which models it serves.
 *
 * The probe is deliberately UNAUTHENTICATED: it runs at startup and on every
 * settings save, before the user has sent anything, so attaching the API key
 * would transmit it to whatever is configured — including a typo'd host — just
 * for a model list. Self-hosted servers (Ollama, LM Studio, vLLM) need no
 * credentials; an endpoint that does require them answers 401, which is
 * treated like any other failure and falls back to the built-in catalog.
 *
 * Best-effort by design: every failure resolves to the last known good list,
 * or to an empty array, so an unreachable or non-conforming endpoint can never
 * block app startup. Hosted defaults are not probed at all.
 */
export const fetchEndpointModels = async ({
  endpoint,
  apiType,
  apiVersion,
}: {
  endpoint: string;
  apiType: EndpointApiType;
  apiVersion?: string;
}): Promise<string[]> => {
  // No request whatsoever for the app's own hosted endpoints.
  if (isHostedDefaultEndpoint(endpoint)) return [];

  const modelsUrl = deriveModelsUrl(endpoint, apiType, apiVersion);
  if (!modelsUrl) return [];

  try {
    assertSafeApiEndpoint(modelsUrl);
  } catch {
    return [];
  }

  // `anthropic-version` is not a credential; Anthropic-compatible servers
  // reject requests without it outright, so the probe would learn nothing.
  const headers: Record<string, string> =
    apiType === 'anthropic' ? { 'anthropic-version': '2023-06-01' } : {};

  try {
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // A dev server or SPA host answers unknown paths with index.html; parsing
    // that as JSON would throw an opaque SyntaxError.
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) throw new Error('not json');

    const ids = extractIds(await response.json());
    if (ids.length > 0) writeCache(modelsUrl, ids);
    return ids;
  } catch {
    return readCachedIds(modelsUrl);
  }
};
