"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartFrame from "./ChartFrame";
import ChartTable from "./ChartTable";
import { chartAxisTick, chartColors, chartTooltipStyle, formatCount } from "./chartTheme";

/** Generic time-series card: one line, a heading, a tooltip and the data table. */
export default function LineChartCard({
  title,
  subtitle,
  data = [],
  xKey = "label",
  dataKey = "orders",
  unit = "orders",
  tooltipLabel = "Orders",
  emptyMessage,
  tableCaption,
  tableColumns,
  tableRows,
}) {
  const empty = data.length === 0 || data.every((row) => Number(row[dataKey]) === 0);

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      empty={empty}
      emptyMessage={emptyMessage}
      table={
        <ChartTable
          caption={tableCaption ?? title}
          columns={tableColumns}
          rows={tableRows}
          emptyMessage={emptyMessage}
        />
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={chartColors.line} strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={chartAxisTick}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            width={38}
            tickLine={false}
            axisLine={false}
            tick={chartAxisTick}
            tickFormatter={formatCount}
          />
          <Tooltip
            formatter={(value) => [formatCount(value), tooltipLabel]}
            contentStyle={chartTooltipStyle}
            labelStyle={{ color: chartColors.inkMuted, fontSize: 11 }}
            cursor={{ stroke: chartColors.line }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={tooltipLabel}
            unit={` ${unit}`}
            stroke={chartColors.brand}
            strokeWidth={2}
            dot={{ r: 2, fill: chartColors.brand, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
