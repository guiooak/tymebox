import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

/*
 * Recharts draws nothing in jsdom (no layout, so no size). Its parts are
 * replaced by stand-ins that show the props they got, to check what LineChart
 * hands over and how it turns tooltip data into entries.
 */

type AnyProps = Record<string, unknown> & { children?: ReactNode };
const show = (name: string) =>
  function Part({ children, content, ...props }: AnyProps & { content?: unknown }) {
    return (
      <div data-part={name} data-props={JSON.stringify(props)}>
        {typeof content === 'function' ? <Tooltips render={content as Render} /> : null}
        {children}
      </div>
    );
  };

type Render = (props: unknown) => ReactNode;
/** Plays the tooltip in the states Recharts can call it with. */
function Tooltips({ render }: { render: Render }) {
  const point = { x: 1, y: 2, label: 'Done' };
  const states = [
    { active: false, payload: [] },
    { active: true, payload: [] },
    {
      active: true,
      payload: [
        { name: 'Progress', color: '#00f', payload: point },
        { name: undefined, stroke: '#0f0', payload: point },
        { name: 'Bare', payload: point },
        { name: 'Ghost', payload: undefined },
      ],
    },
  ];
  return (
    <>
      {states.map((state, index) => (
        <div key={index} data-testid={`tooltip-${index}`}>
          {render(state)}
        </div>
      ))}
    </>
  );
}

vi.mock('recharts', () => ({
  ResponsiveContainer: show('container'),
  LineChart: show('chart'),
  CartesianGrid: show('grid'),
  XAxis: show('x'),
  YAxis: show('y'),
  Tooltip: show('tooltip'),
  Legend: show('legend'),
  Line: show('line'),
}));

const { LineChart } = await import('./LineChart');

const props = (part: string, container: HTMLElement) =>
  [...container.querySelectorAll(`[data-part="${part}"]`)].map((element) =>
    JSON.parse(element.getAttribute('data-props') ?? '{}'),
  );

const series = [
  { id: 'a', name: 'Tendency', color: '#999', data: [{ x: 0, y: 3 }], dashed: true },
  {
    id: 'b',
    name: 'Progress',
    color: '#00f',
    data: [{ x: 0, y: 3 }],
    strokeWidth: 3,
    connectNulls: false,
  },
];

describe('LineChart', () => {
  it('draws one line per series, dashed or solid, with sensible defaults', () => {
    const { container } = render(<LineChart series={series} />);
    expect(props('container', container)[0]).toMatchObject({ height: 280 });
    expect(props('x', container)[0].domain).toEqual(['dataMin', 'dataMax']);
    expect(props('y', container)[0].domain).toEqual([0, 'auto']);
    const [tendency, progress] = props('line', container);
    expect(tendency).toMatchObject({
      name: 'Tendency',
      strokeDasharray: '6 4',
      strokeWidth: 2,
      connectNulls: true,
      isAnimationActive: false,
    });
    expect(progress).toMatchObject({ strokeWidth: 3, connectNulls: false });
    expect(progress.strokeDasharray).toBeUndefined();
    expect(props('tooltip', container)).toEqual([]);
    expect(props('legend', container)).toEqual([]);
  });

  it('passes domains, colours and animation through', () => {
    const { container } = render(
      <LineChart
        series={series}
        height={120}
        xDomain={[0, 10]}
        yDomain={[0, 5]}
        gridColor="#eee"
        axisColor="#333"
        animationDuration={300}
        showLegend
      />,
    );
    expect(props('container', container)[0].height).toBe(120);
    expect(props('x', container)[0]).toMatchObject({ domain: [0, 10], stroke: '#333' });
    expect(props('y', container)[0].domain).toEqual([0, 5]);
    expect(props('grid', container)[0].stroke).toBe('#eee');
    expect(props('line', container)[0].isAnimationActive).toBe(true);
    expect(props('legend', container)).toHaveLength(1);
  });

  it('hands the tooltip one entry per series under the pointer', () => {
    const renderTooltip = vi.fn((entries: unknown[]) => `entries:${entries.length}`);
    render(<LineChart series={series} renderTooltip={renderTooltip} />);
    expect(screen.getByTestId('tooltip-0')).toBeEmptyDOMElement();
    expect(screen.getByTestId('tooltip-1')).toBeEmptyDOMElement();
    expect(screen.getByTestId('tooltip-2')).toHaveTextContent('entries:3');
    expect(renderTooltip).toHaveBeenCalledWith([
      { name: 'Progress', color: '#00f', point: { x: 1, y: 2, label: 'Done' } },
      { name: '', color: '#0f0', point: { x: 1, y: 2, label: 'Done' } },
      { name: 'Bare', color: '#000', point: { x: 1, y: 2, label: 'Done' } },
    ]);
  });
});
