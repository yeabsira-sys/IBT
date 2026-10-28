"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import ChartFrame from "./ChartFrame";
import ChartTable from "./ChartTable";
import {
  chartColors,
  chartTooltipStyle,
  formatCount,
  formatPercent,
  pieColors,
} from "./chartTheme";

/**
 * Generic donut card for share-of-total questions. The legend is the table
 * below, which keeps every slice named and gives exact numbers instead of
 * relying on colour alone. The centre shows the total so the slices have a
 * visible denominator.
 */
export default function PieChartCard({
  title,
  subtitle,
  data = [],
  nameKey = "name",
  dataKey = "value",
  valueFormatter = formatCount,
  tooltipLabel = "Units sold",
  centerCaption,
  emptyMessage,
  tableCaption,
  tableColumns,
  tableRows,
}) {
  const total = data.reduce(
    (sum, row) => sum + (Number(row[dataKey]) || 0),
    0,
  );
  const empty = data.length === 0 || total === 0;
  const dense = data.length > 12;
  const sliceColor = (index) => {
    if (index < pieColors.length) return pieColors[index];
    return `hsl(${(index * 47 + 12) % 360} 42% 42%)`;
  };

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
      <div className="pie-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius="54%"
              outerRadius="88%"
              paddingAngle={dense ? 0.8 : 2}
              stroke={chartColors.surface}
              strokeWidth={dense ? 1 : 2}
              isAnimationActive={false}
            >
              {data.map((row, index) => (
                <Cell
                  key={row.id ?? row[nameKey] ?? index}
                  fill={sliceColor(index)}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, item) => [
                `${valueFormatter(value)} · ${formatPercent(item?.payload?.share ?? 0)}`,
                item?.payload?.[nameKey] ?? name,
              ]}
              contentStyle={chartTooltipStyle}
              itemStyle={{ color: chartColors.ink }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pie-chart__center" aria-hidden="true">
          <strong>{valueFormatter(total)}</strong>
          <span>{centerCaption ?? tooltipLabel}</span>
        </div>
      </div>
    </ChartFrame>
  );
}
