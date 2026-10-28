import { STATUS_META } from "@/lib/orderStatus";

/** A single status chip shared by customer, kitchen and admin views. */
export default function OrderStatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "muted" };
  return (
    <span className={`status-badge status-badge--${meta.tone}`}>
      {meta.label}
    </span>
  );
}
