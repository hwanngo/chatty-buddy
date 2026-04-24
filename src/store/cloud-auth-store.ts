import { StoreApi, create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CloudAuthSlice, createCloudAuthSlice } from './cloud-auth-slice';

export type StoreState = CloudAuthSlice;

export type StoreSlice<T> = (
  set: StoreApi<StoreState>['setState'],
  get: StoreApi<StoreState>['getState']
) => T;

const useCloudAuthStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createCloudAuthSlice(set, get),
    }),
    {
      name: 'cloud',
      partialize: (state) => ({
        cloudSync: state.cloudSync,
        fileId: state.fileId,
      }),
      version: 1,
      // Passthrough: preserve persisted sync prefs across version bumps instead
      // of discarding them (and silences the "no migrate function" warning).
      migrate: (persistedState) =>
        persistedState as Pick<CloudAuthSlice, 'cloudSync' | 'fileId'>,
    }
  )
);

export default useCloudAuthStore;
