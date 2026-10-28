"use client";

import PieChartCard from "./PieChartCard";
import { formatCount, formatETBCurrency, formatPercent } from "./chartTheme";

const columns = [
  { key: "rank", label: "Rank", align: "right" },
  { key: "name", label: "Dish" },
  { key: "quantity", label: "Units sold", align: "right" },
  { key: "share", label: "Share", align: "right" },
  { key: "revenue", label: "Item revenue", align: "right" },
];

/** Admin: every sold menu item, with exact units, share and revenue below. */
export default function MenuItemSalesChart({ data = [] }) {
  return (
    <PieChartCard
      title="Menu item sales"
      subtitle="Completed orders · all menu items · share of units sold"
      data={data}
      nameKey="name"
      dataKey="quantity"
      valueFormatter={formatCount}
      tooltipLabel="Units sold"
      centerCaption="units sold"
      emptyMessage="No completed orders yet — menu item sales will appear after the first completed order."
      tableCaption="Menu item sales by units sold"
      tableColumns={columns}
      tableRows={data.map((row) => ({
        id: row.id,
        rank: row.rank,
        name: row.name,
        quantity: formatCount(row.quantity),
        share: formatPercent(row.share),
        revenue: formatETBCurrency(row.revenue),
      }))}
    />
  );
}
