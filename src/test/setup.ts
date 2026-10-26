import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/*
 * What jsdom doesn't have, stubbed for every test. Stores are reset by
 * render.tsx, for the tests that use them.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const nativeMatchMedia = window.matchMedia;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: { writeText: vi.fn(async () => {}), write: vi.fn(async () => {}) },
  });
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:stub';
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {};
  }
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.matchMedia = nativeMatchMedia;
  localStorage.clear();
});
