"use client";

import BarChartCard from "./BarChartCard";
import { chartColors, formatCount, formatETBCurrency } from "./chartTheme";

const columns = [
  { key: "rank", label: "Rank", align: "right" },
  { key: "customer", label: "Customer" },
  { key: "email", label: "Email" },
  { key: "orders", label: "Completed orders", align: "right" },
  { key: "revenue", label: "Lifetime spend", align: "right" },
];

/** Admin: the ten customers with the highest completed lifetime spend. */
export default function TopCustomersChart({ data = [] }) {
  return (
    <BarChartCard
      title="Top ten customers"
      subtitle="Completed orders · lifetime spend · ETB · bars start at zero"
      data={data}
      categoryKey="name"
      dataKey="revenue"
      categoryWidth={150}
      valueFormatter={formatETBCurrency}
      tooltipLabel="Lifetime spend"
      barColor={chartColors.gold}
      emptyMessage="No completed orders yet — top customers will appear after the first completed order."
      tableCaption="Top ten customers by completed lifetime spend"
      tableColumns={columns}
      tableRows={data.map((row) => ({
        id: row.id,
        rank: row.rank,
        customer: row.name,
        email: row.email,
        orders: formatCount(row.orders),
        revenue: formatETBCurrency(row.revenue),
      }))}
    />
  );
}
