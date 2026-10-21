"use client";

import BarChartCard from "./BarChartCard";
import { formatCount, formatETBCurrency } from "./chartTheme";

const columns = [
  { key: "area", label: "Delivery area" },
  { key: "orders", label: "Completed orders", align: "right" },
  { key: "revenue", label: "Revenue", align: "right" },
];

/** Admin: completed revenue by neighbourhood, with pickup kept explicit. */
export default function RevenueByAreaChart({ data = [] }) {
  return (
    <BarChartCard
      title="Completed revenue by area"
      subtitle="All completed orders · ETB · bars start at zero"
      data={data}
      categoryKey="area"
      dataKey="revenue"
      categoryWidth={180}
      valueFormatter={formatETBCurrency}
      tooltipLabel="Revenue"
      emptyMessage="No completed orders yet — revenue by delivery area will appear when an order is completed."
      tableCaption="Completed revenue by delivery area"
      tableColumns={columns}
      tableRows={data.map((row) => ({
        id: row.area,
        area: row.area,
        orders: formatCount(row.orders),
        revenue: formatETBCurrency(row.revenue),
      }))}
    />
  );
}
