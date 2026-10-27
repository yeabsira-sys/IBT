"use client";

import BarChartCard from "./BarChartCard";
import { formatCount, formatETBCurrency } from "./chartTheme";

const columns = [
  { key: "rank", label: "Rank", align: "right" },
  { key: "name", label: "Dish" },
  { key: "quantity", label: "Units sold", align: "right" },
  { key: "revenue", label: "Item revenue", align: "right" },
];

/** Admin: the dishes customers actually order most, ranked by units sold. */
export default function BestSellingItemsChart({ data = [] }) {
  return (
    <BarChartCard
      title="Best-selling food items"
      subtitle="Completed orders · units sold · bars start at zero"
      data={data}
      categoryKey="name"
      dataKey="quantity"
      categoryWidth={180}
      valueFormatter={formatCount}
      tooltipLabel="Units sold"
      emptyMessage="No completed orders yet — best-selling dishes will appear after the first completed order."
      tableCaption="Best-selling food items by units sold"
      tableColumns={columns}
      tableRows={data.map((row) => ({
        id: row.id,
        rank: row.rank,
        name: row.name,
        quantity: formatCount(row.quantity),
        revenue: formatETBCurrency(row.revenue),
      }))}
    />
  );
}
