"use client";

import LineChartCard from "./LineChartCard";
import { formatCount } from "./chartTheme";

const columns = [
  { key: "time", label: "Time" },
  { key: "orders", label: "Orders", align: "right" },
];

/** Kitchen: today's order pace in two-hour buckets. */
export default function OrdersByHourChart({ data = [] }) {
  return (
    <LineChartCard
      title="Orders received today"
      subtitle="Today · two-hour buckets · orders"
      data={data}
      xKey="label"
      dataKey="orders"
      unit="orders"
      tooltipLabel="Orders"
      emptyMessage="No orders have been received today yet — the hourly pace will appear with the first order."
      tableCaption="Orders received today by two-hour bucket"
      tableColumns={columns}
      tableRows={data.map((row) => ({
        id: row.hour,
        time: row.label,
        orders: formatCount(row.orders),
      }))}
    />
  );
}
