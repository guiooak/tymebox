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

// Some test files run in Node (no browser); everything below is browser-only.
const browser = typeof window !== 'undefined';
const nativeMatchMedia = browser ? window.matchMedia : undefined;

beforeEach(() => {
  if (!browser) {
    return;
  }
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
  vi.unstubAllGlobals();
  if (!browser) {
    return;
  }
  cleanup();
  // Anything a test left in the page (portals, a drag ghost) goes too.
  document.body.innerHTML = '';
  window.matchMedia = nativeMatchMedia as typeof window.matchMedia;
  localStorage.clear();
});
