import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The language store reads its starting language when it loads, so each test
 * loads a fresh copy after arranging storage and the browser's languages.
 */

const load = async () => {
  vi.resetModules();
  return import('./i18nStore');
};

const languages = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages');

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  if (languages) {
    Object.defineProperty(Navigator.prototype, 'languages', languages);
  }
});

describe('the starting language', () => {
  it('is the one remembered on this device', async () => {
    localStorage.setItem('tw-locale', 'pt-BR');
    const { useI18nStore } = await load();
    expect(useI18nStore.getState().locale).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('follows the browser’s languages on a first visit', async () => {
    Object.defineProperty(Navigator.prototype, 'languages', {
      configurable: true,
      get: () => ['pt-PT', 'en'],
    });
    const { useI18nStore } = await load();
    expect(useI18nStore.getState().locale).toBe('pt-BR');
  });

  it('falls back to the single browser language when the list is missing', async () => {
    Object.defineProperty(Navigator.prototype, 'languages', {
      configurable: true,
      get: () => undefined,
    });
    const { useI18nStore } = await load();
    expect(useI18nStore.getState().locale).toBe('en-US'); // jsdom says en-US
  });

  it('ignores storage that can’t be read', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { useI18nStore } = await load();
    expect(useI18nStore.getState().locale).toBe('en-US');
  });
});

describe('switching', () => {
  it('remembers the choice and labels the page', async () => {
    const { useI18nStore, getLocale, getT, messagesFor } = await load();
    useI18nStore.getState().setLocale('pt-BR');
    expect(localStorage.getItem('tw-locale')).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(getLocale()).toBe('pt-BR');
    expect(getT()).toBe(messagesFor('pt-BR'));
  });

  it('still switches when the choice can’t be stored', async () => {
    const { useI18nStore } = await load();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    useI18nStore.getState().setLocale('pt-BR');
    expect(useI18nStore.getState().locale).toBe('pt-BR');
  });
});
