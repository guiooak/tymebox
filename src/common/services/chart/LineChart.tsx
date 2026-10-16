import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import type { ChartPoint, ChartTooltipEntry, LineChartProps } from './types';

function buildTooltip(renderTooltip: LineChartProps['renderTooltip']) {
  return function TooltipContent(
    props: TooltipContentProps<TooltipValueType, string | number>,
  ) {
    if (!props.active || !props.payload?.length || !renderTooltip) {
      return null;
    }
    const entries: ChartTooltipEntry[] = props.payload.flatMap((item) => {
      // Each series' data is ChartPoint[], so that's what Recharts hands back.
      const point = item.payload as ChartPoint | undefined;
      if (!point) {
        return [];
      }
      return [
        {
          name: String(item.name ?? ''),
          color: item.color ?? (item as { stroke?: string }).stroke ?? '#000',
          point: { x: point.x, y: point.y, label: point.label },
        },
      ];
    });
    return <>{renderTooltip(entries)}</>;
  };
}

/** Agnostic multi-series line chart rendered on top of Recharts. */
export function LineChart({
  series,
  height = 280,
  xDomain,
  yDomain = [0, 'auto'],
  xTickFormatter,
  yTickFormatter,
  renderTooltip,
  showLegend,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="x"
          type="number"
          domain={xDomain ?? ['dataMin', 'dataMax']}
          tickFormatter={xTickFormatter}
          tick={{ fontSize: 12 }}
          allowDuplicatedCategory={false}
        />
        <YAxis
          type="number"
          domain={yDomain}
          tickFormatter={yTickFormatter}
          tick={{ fontSize: 12 }}
          allowDecimals={false}
        />
        {renderTooltip ? <Tooltip content={buildTooltip(renderTooltip)} /> : null}
        {showLegend ? (
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        ) : null}
        {series.map((line) => (
          <Line
            key={line.id}
            data={line.data}
            dataKey="y"
            name={line.name}
            stroke={line.color}
            strokeWidth={line.strokeWidth ?? 2}
            strokeDasharray={line.dashed ? '6 4' : undefined}
            connectNulls={line.connectNulls ?? true}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
