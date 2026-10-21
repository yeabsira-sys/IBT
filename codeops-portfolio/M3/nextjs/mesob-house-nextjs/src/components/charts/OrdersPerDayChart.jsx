"use client";

import LineChartCard from "./LineChartCard";
import { formatCount } from "./chartTheme";

const columns = [
  { key: "label", label: "Day" },
  { key: "orders", label: "Orders", align: "right" },
];

/** Admin: daily order volume for the last two weeks. */
export default function OrdersPerDayChart({ data = [] }) {
  return (
    <LineChartCard
      title="Orders placed per day"
      subtitle="Last 14 days · orders placed"
      data={data}
      dataKey="orders"
      unit="orders"
      tooltipLabel="Orders"
      emptyMessage="No orders have been placed yet — the daily trend will appear after the first order."
      tableCaption="Orders placed per day, last 14 days"
      tableColumns={columns}
      tableRows={data.map((row) => ({
        id: row.date,
        label: row.label,
        orders: formatCount(row.orders),
      }))}
    />
  );
}
