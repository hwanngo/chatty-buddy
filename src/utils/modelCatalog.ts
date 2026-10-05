/** Validated public model metadata. Browser storage is an optional cache only. */
export interface ModelData {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: unknown;
  is_stream_supported: boolean;
}
export interface ModelsJson {
  data: ModelData[];
}
export const MODEL_CACHE_KEY = 'openrouter_models_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseModelCatalog(value: unknown): ModelsJson {
  if (!isRecord(value) || !Array.isArray(value.data))
    throw new Error('Invalid model catalog.');
  const data = value.data.map((entry): ModelData => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      !entry.id.trim() ||
      !isRecord(entry.pricing) ||
      !isRecord(entry.architecture) ||
      typeof entry.architecture.modality !== 'string' ||
      typeof entry.context_length !== 'number' ||
      !Number.isFinite(entry.context_length) ||
      entry.context_length <= 0
    ) {
      throw new Error('Invalid model catalog entry.');
    }
    const price = (key: string): string => {
      const raw = (entry.pricing as Record<string, unknown>)[key];
      if (raw === undefined && (key === 'image' || key === 'request'))
        return '0';
      if (
        (typeof raw !== 'string' && typeof raw !== 'number') ||
        String(raw).trim() === '' ||
        !Number.isFinite(Number(raw)) ||
        Number(raw) < -1
      ) {
        throw new Error(`Invalid model ${key} price.`);
      }
      // OpenRouter uses -1 for dynamic routing prices; retain it as unknown.
      return String(raw);
    };
    const provider = isRecord(entry.top_provider) ? entry.top_provider : {};
    const maxOutput = provider.max_completion_tokens;
    return {
      id: entry.id,
      name: typeof entry.name === 'string' ? entry.name : entry.id,
      description:
        typeof entry.description === 'string' ? entry.description : '',
      pricing: {
        prompt: price('prompt'),
        completion: price('completion'),
        image: price('image'),
        request: price('request'),
      },
      context_length: entry.context_length,
      architecture: {
        modality: entry.architecture.modality,
        tokenizer:
          typeof entry.architecture.tokenizer === 'string'
            ? entry.architecture.tokenizer
            : 'unknown',
        instruct_type:
          typeof entry.architecture.instruct_type === 'string'
            ? entry.architecture.instruct_type
            : null,
      },
      top_provider: {
        context_length: entry.context_length,
        max_completion_tokens:
          typeof maxOutput === 'number' &&
          Number.isFinite(maxOutput) &&
          maxOutput > 0
            ? maxOutput
            : null,
        is_moderated: provider.is_moderated === true,
      },
      per_request_limits: entry.per_request_limits ?? null,
      is_stream_supported: entry.is_stream_supported !== false,
    };
  });
  return { data };
}

async function fetchCatalog(url: string): Promise<ModelsJson> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) {
    throw new Error(`Could not load model catalog (${response.status}).`);
  }
  return parseModelCatalog(await response.json());
}

export async function fetchModelsJson(): Promise<ModelsJson> {
  try {
    const raw = localStorage.getItem(MODEL_CACHE_KEY);
    if (raw) {
      const cached: unknown = JSON.parse(raw);
      if (
        isRecord(cached) &&
        typeof cached.timestamp === 'number' &&
        cached.timestamp <= Date.now() &&
        Date.now() - cached.timestamp < CACHE_TTL_MS
      ) {
        return parseModelCatalog(cached.data);
      }
      localStorage.removeItem(MODEL_CACHE_KEY);
    }
  } catch {
    try {
      localStorage.removeItem(MODEL_CACHE_KEY);
    } catch {
      /* Storage is optional. */
    }
  }
  try {
    const data = await fetchCatalog('https://openrouter.ai/api/v1/models');
    try {
      localStorage.setItem(
        MODEL_CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data })
      );
    } catch {
      /* A quota failure must not discard a successful network response. */
    }
    return data;
  } catch {
    return fetchCatalog(`${import.meta.env.BASE_URL}models.json`);
  }
}
