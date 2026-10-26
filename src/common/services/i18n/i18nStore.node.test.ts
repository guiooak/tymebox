// @vitest-environment node
import { describe, expect, it } from 'vitest';

/*
 * Outside a browser (the database integration tests run in Node) there is no
 * window, storage or document: the store starts in the default language and
 * switching still works.
 */

describe('the language store without a browser', () => {
  it('starts in English and switches without touching a page', async () => {
    const { useI18nStore } = await import('./i18nStore');
    expect(useI18nStore.getState().locale).toBe('en-US');
    useI18nStore.getState().setLocale('pt-BR');
    expect(useI18nStore.getState().locale).toBe('pt-BR');
  });
});
