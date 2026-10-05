import { StoreSlice } from './store';
import { initializeModels } from '@constants/modelLoader';

export interface CustomModel {
  id: string;
  name: string;
  architecture: {
    instruct_type: null;
    modality: 'text->text' | 'text+image->text';
    tokenizer: string;
  };
  context_length: number;
  per_request_limits: null;
  pricing: {
    completion: string;
    image: string;
    prompt: string;
    request: string;
  };
  top_provider: {
    context_length: number;
    is_moderated: boolean;
    max_completion_tokens: number;
  };
  is_stream_supported: boolean;
}

export interface CustomModelsSlice {
  customModels: CustomModel[];
  addCustomModel: (
    model: Omit<
      CustomModel,
      'architecture' | 'per_request_limits' | 'top_provider'
    > & {
      architecture: Pick<
        CustomModel['architecture'],
        'modality' | 'tokenizer' | 'instruct_type'
      >;
      top_provider?: CustomModel['top_provider'];
    }
  ) => void;
  removeCustomModel: (modelId: string) => void;
}

const defaultModelValues = {
  architecture: {
    instruct_type: null,
    tokenizer: 'cl100k_base',
  },
  per_request_limits: null,
  top_provider: {
    context_length: 128000,
    max_completion_tokens: 16384,
    is_moderated: true,
  },
  is_stream_supported: true,
};

export const createCustomModelsSlice: StoreSlice<CustomModelsSlice> = (
  set
) => ({
  customModels: [],
  addCustomModel: (model) => {
    if (
      !model.id.trim() ||
      !model.name.trim() ||
      !Number.isFinite(model.context_length) ||
      model.context_length < 1
    )
      return;
    set((state) => ({
      ...state,
      customModels: [
        ...state.customModels.filter((item) => item.id !== model.id.trim()),
        {
          ...defaultModelValues,
          ...model,
          id: model.id.trim(),
          name: model.name.trim(),
          top_provider: {
            ...defaultModelValues.top_provider,
            context_length: model.context_length,
            ...model.top_provider,
          },
          architecture: {
            ...defaultModelValues.architecture,
            modality: model.architecture.modality,
            instruct_type: model.architecture.instruct_type,
            tokenizer: model.architecture.tokenizer,
          },
        },
      ],
    }));
    // Reload models after adding a new one
    initializeModels();
  },
  removeCustomModel: (modelId) => {
    set((state) => {
      const newState = {
        ...state,
        customModels: state.customModels.filter((m) => m.id !== modelId),
      };
      return newState;
    });
    void initializeModels();
  },
});
