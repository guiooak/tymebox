import { findChartSvg } from './svgExport';

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
