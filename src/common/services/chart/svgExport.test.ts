import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findChartSvg, svgElementToPngDataUrl } from './svgExport';

describe('findChartSvg', () => {
  it('picks the plot, not a legend swatch that comes first', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <ul class="recharts-default-legend">
        <li class="recharts-legend-item"><svg class="recharts-surface" id="swatch"></svg></li>
      </ul>
      <div class="recharts-wrapper"><svg class="recharts-surface" id="plot"></svg></div>
    `;
    expect(findChartSvg(container)?.id).toBe('plot');
  });

  it('returns null when there is no chart', () => {
    expect(findChartSvg(document.createElement('div'))).toBeNull();
    expect(findChartSvg(null)).toBeNull();
  });
});

describe('svgElementToPngDataUrl', () => {
  let outcome: 'load' | 'error' = 'load';
  let context: Record<string, unknown> | null;

  beforeEach(() => {
    outcome = 'load';
    context = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' };
    vi.stubGlobal(
      'Image',
      class {
        onload?: () => void;
        onerror?: () => void;
        set src(_url: string) {
          queueMicrotask(() => (outcome === 'load' ? this.onload?.() : this.onerror?.()));
        }
      } as unknown as typeof Image,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => context as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,AAA',
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:svg');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function plot(width = 0, height = 0): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML = '<path stroke="#111111" fill="#222222"/>';
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ width, height } as DOMRect);
    return svg;
  }

  it('draws the chart on a background at double size and returns a PNG', async () => {
    const blobs: Blob[] = [];
    vi.mocked(URL.createObjectURL).mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return 'blob:svg';
    });
    const url = await svgElementToPngDataUrl(plot(400, 200), {
      background: '#fafafa',
      recolor: [
        ['#111111', '#222222'],
        ['#222222', '#333333'],
        ['', '#444444'],
        ['#555555', '#555555'],
      ],
    });
    expect(url).toBe('data:image/png;base64,AAA');
    expect(context?.fillStyle).toBe('#fafafa');
    expect(context?.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 400);
    const svgText = await blobs[0].text();
    // Each colour swapped once: #111 became #222, and the original #222 became #333.
    expect(svgText).toContain('stroke="#222222"');
    expect(svgText).toContain('fill="#333333"');
    expect(svgText).toContain('width="400"');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:svg');
  });

  it('falls back to the element’s own size, then a default', async () => {
    const svg = plot();
    Object.defineProperty(svg, 'clientWidth', { value: 300 });
    await svgElementToPngDataUrl(svg, { scale: 1 });
    expect(context?.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 300, 300);

    await svgElementToPngDataUrl(plot());
    expect(context?.drawImage).toHaveBeenLastCalledWith(
      expect.anything(),
      0,
      0,
      1200,
      600,
    );
  });

  it('fails cleanly without a 2D canvas, or when the SVG won’t load', async () => {
    context = null;
    await expect(svgElementToPngDataUrl(plot(10, 10))).rejects.toThrow(
      'Canvas 2D context unavailable',
    );
    outcome = 'error';
    await expect(svgElementToPngDataUrl(plot(10, 10))).rejects.toThrow(
      'Failed to rasterize SVG',
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
