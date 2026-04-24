import { useEffect, useReducer } from 'react';
import { isModelsReady, onModelsReady } from '@constants/modelLoader';

const useModelsReady = () => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  useEffect(() => onModelsReady(forceUpdate), []);
  return isModelsReady;
};

export default useModelsReady;
