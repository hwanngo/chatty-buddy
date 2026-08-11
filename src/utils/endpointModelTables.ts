import type { ModelCost } from '@type/chat';
import type { CustomModel } from '@store/custom-models-slice';

/** The subset of a models.json entry needed to describe a model. */
export interface CatalogEntry {
  id: string;
  context_length: number;
  pricing: { prompt: string; completion: string; image: string };
  architecture: { modality: string };
}

export interface ModelTables {
  modelOptions: string[];
  modelMaxToken: { [key: string]: number };
  modelCost: ModelCost;
  modelTypes: { [key: string]: string };
  modelStreamSupport: { [key: string]: boolean };
  modelDisplayNames: { [key: string]: string };
}

/**
 * Endpoints report ids and nothing else, so a model the catalog has never heard
 * of gets a deliberately small context window: over-estimating it would let the
 * history trimmer build a prompt the server silently truncates.
 */
const DEFAULT_CONTEXT_LENGTH = 8192;

const priceOf = (value: string): number => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const zeroCost = () => ({
  prompt: { price: 0, unit: 1 },
  completion: { price: 0, unit: 1 },
  image: { price: 0, unit: 1 },
});

/**
 * Turns the ids an endpoint reports into the lookup tables the picker consumes.
 * Metadata precedence: the user's own custom model, then a catalog entry with a
 * matching id, then conservative defaults.
 */
export const buildEndpointModelTables = ({
  ids,
  customModels,
  catalog,
  customLabel = '(custom)',
}: {
  ids: string[];
  customModels: CustomModel[];
  catalog: CatalogEntry[];
  customLabel?: string;
}): ModelTables => {
  const tables: ModelTables = {
    modelOptions: [],
    modelMaxToken: {},
    modelCost: {},
    modelTypes: {},
    modelStreamSupport: {},
    modelDisplayNames: {},
  };

  // Catalog ids carry a provider prefix (`openai/gpt-5`); the picker uses the
  // bare id, matching the existing loader's `split('/').pop()` normalisation.
  const byId = new Map<string, CatalogEntry>();
  for (const entry of catalog) {
    if (!entry?.id) continue;
    byId.set(entry.id, entry);
    const bare = entry.id.split('/').pop();
    if (bare && !byId.has(bare)) byId.set(bare, entry);
  }

  const customById = new Map(customModels.map((model) => [model.id, model]));

  // Custom models first so the user's own entries stay at the top of the picker,
  // then whatever the endpoint reports.
  const ordered = [
    ...customModels.map((model) => model.id),
    ...ids.filter((id) => !customById.has(id)),
  ];

  for (const id of ordered) {
    if (tables.modelOptions.includes(id)) continue;
    tables.modelOptions.push(id);

    const custom = customById.get(id);
    if (custom) {
      tables.modelMaxToken[id] = custom.context_length;
      tables.modelCost[id] = {
        prompt: { price: priceOf(custom.pricing.prompt), unit: 1 },
        completion: { price: priceOf(custom.pricing.completion), unit: 1 },
        image: { price: priceOf(custom.pricing.image), unit: 1 },
      };
      tables.modelTypes[id] = custom.architecture.modality.includes('image')
        ? 'image'
        : 'text';
      tables.modelStreamSupport[id] = custom.is_stream_supported;
      tables.modelDisplayNames[id] = `${custom.name} ${customLabel}`;
      continue;
    }

    const entry = byId.get(id);
    if (entry) {
      const isImage =
        entry.architecture.modality.split('->')[0].includes('image') ||
        priceOf(entry.pricing.image) > 0;
      tables.modelMaxToken[id] = entry.context_length;
      tables.modelCost[id] = {
        prompt: { price: priceOf(entry.pricing.prompt), unit: 1 },
        completion: { price: priceOf(entry.pricing.completion), unit: 1 },
        image: { price: isImage ? priceOf(entry.pricing.image) : 0, unit: 1 },
      };
      tables.modelTypes[id] = isImage ? 'image' : 'text';
      tables.modelStreamSupport[id] = true;
      tables.modelDisplayNames[id] = id;
      continue;
    }

    tables.modelMaxToken[id] = DEFAULT_CONTEXT_LENGTH;
    tables.modelCost[id] = zeroCost();
    // Optimistic, like the streaming default above: an id nobody has heard of
    // is typically a locally served model, and local vision models (llava,
    // qwen2.5-vl, gemma3) are a motivating case for endpoint-sourced lists.
    // Guessing 'text' hides the image-attach UI entirely, which is a silent
    // dead end with no in-app remedy short of re-registering the model by hand
    // under Custom Models; guessing 'image' at worst offers an attachment the
    // server then rejects with a visible error the user can act on.
    tables.modelTypes[id] = 'image';
    tables.modelStreamSupport[id] = true;
    tables.modelDisplayNames[id] = id;
  }

  return tables;
};
