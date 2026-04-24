import { defaultAPIEndpoint } from '@constants/auth';
import { StoreSlice } from './store';

export type ApiType = 'openai' | 'anthropic';

export interface AuthSlice {
  apiKey?: string;
  apiEndpoint: string;
  apiVersion?: string;
  apiType: ApiType;
  firstVisit: boolean;
  setApiKey: (apiKey: string) => void;
  setApiEndpoint: (apiEndpoint: string) => void;
  setApiVersion: (apiVersion: string) => void;
  setApiType: (apiType: ApiType) => void;
  setFirstVisit: (firstVisit: boolean) => void;
}

export const createAuthSlice: StoreSlice<AuthSlice> = (set, _get) => ({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || undefined,
  apiEndpoint: defaultAPIEndpoint,
  apiVersion: undefined,
  apiType: 'openai',
  firstVisit: true,
  setApiKey: (apiKey: string) => {
    set((prev: AuthSlice) => ({ ...prev, apiKey }));
  },
  setApiEndpoint: (apiEndpoint: string) => {
    set((prev: AuthSlice) => ({ ...prev, apiEndpoint }));
  },
  setApiVersion: (apiVersion: string) => {
    set((prev: AuthSlice) => ({ ...prev, apiVersion }));
  },
  setApiType: (apiType: ApiType) => {
    set((prev: AuthSlice) => ({ ...prev, apiType }));
  },
  setFirstVisit: (firstVisit: boolean) => {
    set((prev: AuthSlice) => ({ ...prev, firstVisit }));
  },
});
