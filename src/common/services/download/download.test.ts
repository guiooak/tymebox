import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob, downloadJson, printPage, toFileStem } from './download';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toFileStem', () => {
  it('slugifies a title', () => {
    expect(toFileStem('Weekly Planning — Q3!')).toBe('weekly-planning-q3');
    expect(toFileStem('  spaced  out  ')).toBe('spaced-out');
  });

  it('falls back when nothing usable is left', () => {
    expect(toFileStem('———')).toBe('timebox-report');
    expect(toFileStem('', 'fallback')).toBe('fallback');
  });
});

describe('printPage', () => {
  it('opens the browser’s print dialog', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    printPage();
    expect(print).toHaveBeenCalled();
  });
});

describe('downloadBlob', () => {
  it('clicks a download link for the blob, then frees its URL', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const blob = new Blob(['hi'], { type: 'text/plain' });
    downloadBlob(blob, 'hi.txt');
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(create).toHaveBeenCalledWith(blob);
    expect(link.download).toBe('hi.txt');
    expect(link.href).toBe('blob:file');
    expect(revoke).toHaveBeenCalledWith('blob:file');
  });
});

describe('downloadJson', () => {
  it('downloads the value as pretty-printed JSON', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:json');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadJson({ a: 1 }, 'data.json');
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe('{\n  "a": 1\n}');
  });
});
