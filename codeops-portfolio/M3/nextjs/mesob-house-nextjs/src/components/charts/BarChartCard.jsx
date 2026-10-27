"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartFrame from "./ChartFrame";
import ChartTable from "./ChartTable";
import { chartAxisTick, chartColors, chartTooltipStyle } from "./chartTheme";

/**
 * Generic horizontal bar card. The value axis always starts at zero, which is
 * the honesty rule for bar length. Long category names get a wider Y axis.
 */
export default function BarChartCard({
  title,
  subtitle,
  data = [],
  categoryKey = "label",
  dataKey = "value",
  categoryWidth = 150,
  valueFormatter = (value) => String(value),
  tooltipLabel = "Value",
  barColor = chartColors.brand,
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
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 18, bottom: 0, left: 0 }}
        >
          <CartesianGrid horizontal={false} stroke={chartColors.line} strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, "auto"]}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={chartAxisTick}
            tickFormatter={valueFormatter}
          />
          <YAxis
            type="category"
            dataKey={categoryKey}
            width={categoryWidth}
            tickLine={false}
            axisLine={false}
            tick={chartAxisTick}
          />
          <Tooltip
            formatter={(value) => [valueFormatter(value), tooltipLabel]}
            contentStyle={chartTooltipStyle}
            labelStyle={{ color: chartColors.inkMuted, fontSize: 11 }}
            cursor={{ fill: "rgba(140, 33, 22, 0.05)" }}
          />
          <Bar
            dataKey={dataKey}
            name={tooltipLabel}
            fill={barColor}
            radius={[0, 4, 4, 0]}
            barSize={18}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
