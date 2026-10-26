import { create } from 'zustand';

/**
 * State abstraction over Zustand. Feature stores are created with
 * `createStore<State>()(initializer)` and never import zustand directly.
 */
export const createStore = create;
export type { StoreApi, UseBoundStore } from 'zustand';
