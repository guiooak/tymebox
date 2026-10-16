/**
 * Find the plot <svg> of a chart rendered inside `container`. Charts also draw
 * small SVGs (legend swatches) that can come first in the DOM, so taking the
 * first <svg> is not enough.
 */
export function findChartSvg(container: Element | null): SVGSVGElement | null {
  return container?.querySelector<SVGSVGElement>('.recharts-wrapper > svg') ?? null;
}

/**
 * Serialize an in-DOM <svg> (e.g. a rendered chart) to a base64 PNG data URL.
 * Used by the meeting report's "copy to clipboard" feature.
 */
export function svgElementToPngDataUrl(
  svg: SVGSVGElement,
  options: { background?: string; scale?: number } = {},
): Promise<string> {
  const { background = '#ffffff', scale = 2 } = options;
  const rect = svg.getBoundingClientRect();
  const width = rect.width || svg.clientWidth || 600;
  const height = rect.height || svg.clientHeight || 300;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  // Rasterized on its own, the SVG can't see the page's stylesheets or web
  // fonts; name a sans-serif stack so labels don't fall back to Times.
  clone.setAttribute(
    'font-family',
    `${getComputedStyle(svg).fontFamily}, system-ui, -apple-system, 'Segoe UI', sans-serif`,
  );
  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterize SVG'));
    };
    image.src = url;
  });
}
