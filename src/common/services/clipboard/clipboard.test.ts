import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyRich, copyText } from '.';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copyText', () => {
  it('puts plain text on the clipboard', async () => {
    await copyText('Hello');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello');
  });
});

describe('copyRich', () => {
  it('puts both HTML and plain text on the clipboard where the browser can', async () => {
    const items: unknown[] = [];
    vi.stubGlobal(
      'ClipboardItem',
      vi.fn(function (this: unknown, data: Record<string, Blob>) {
        items.push(data);
      }),
    );
    await copyRich({ html: '<b>Hi</b>', text: 'Hi' });
    expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
    const data = items[0] as Record<string, Blob>;
    expect(await data['text/html'].text()).toBe('<b>Hi</b>');
    expect(await data['text/plain'].text()).toBe('Hi');
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('falls back to plain text without ClipboardItem', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    await copyRich({ html: '<b>Hi</b>', text: 'Hi' });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hi');
  });

  it('falls back to plain text when the clipboard can’t take rich content', async () => {
    vi.stubGlobal('ClipboardItem', vi.fn());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText: vi.fn(async () => {}) },
    });
    await copyRich({ html: '<b>Hi</b>', text: 'Hi' });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hi');
  });
});
