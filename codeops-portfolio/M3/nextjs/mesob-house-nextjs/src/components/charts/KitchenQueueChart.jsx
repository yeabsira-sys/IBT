"use client";

import BarChartCard from "./BarChartCard";
import { formatCount } from "./chartTheme";

const columns = [
  { key: "stage", label: "Kitchen stage" },
  { key: "tickets", label: "Tickets", align: "right" },
];

/** Kitchen: where the active queue is concentrated. */
export default function KitchenQueueChart({ data = [] }) {
  return (
    <BarChartCard
      title="Active tickets by stage"
      subtitle="Live queue · tickets · bars start at zero"
      data={data}
      categoryKey="label"
      dataKey="tickets"
      categoryWidth={130}
      valueFormatter={formatCount}
      tooltipLabel="Tickets"
      emptyMessage="The queue is clear — no active tickets right now."
      tableCaption="Active kitchen tickets by stage"
      tableColumns={columns}
      tableRows={data.map((row) => ({
        id: row.status,
        stage: row.label,
        tickets: formatCount(row.tickets),
      }))}
    />
  );
}
