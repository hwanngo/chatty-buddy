import { ModelCost } from '@type/chat';
import { loadModels } from '@utils/modelReader';

let modelOptions: string[] = [];
let modelMaxToken: { [key: string]: number } = {};
let modelCost: ModelCost = {};
let modelTypes: { [key: string]: string } = {};
let modelStreamSupport: { [key: string]: boolean } = {};
let modelDisplayNames: { [key: string]: string } = {};

export let isModelsReady = false;
const listeners = new Set<() => void>();

export const onModelsReady = (fn: () => void): (() => void) => {
  if (isModelsReady) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const initializeModels = async () => {
  const models = await loadModels();
  modelOptions = models.modelOptions;
  modelMaxToken = models.modelMaxToken;
  modelCost = models.modelCost;
  modelTypes = models.modelTypes;
  modelStreamSupport = models.modelStreamSupport;
  modelDisplayNames = models.modelDisplayNames;
  isModelsReady = true;
  listeners.forEach((fn) => fn());
  listeners.clear();
};

initializeModels();

export {
  modelOptions,
  modelMaxToken,
  modelCost,
  modelTypes,
  modelStreamSupport,
};
