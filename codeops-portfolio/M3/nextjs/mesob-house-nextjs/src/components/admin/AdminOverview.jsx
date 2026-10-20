"use client";

import Link from "next/link";
import useSWR from "swr";
import { FiArrowRight, FiClipboard, FiDollarSign, FiRefreshCw, FiTool, FiUsers } from "react-icons/fi";
import OrderStatusBadge from "../orders/OrderStatusBadge";
import { fetcher } from "@/lib/fetcher";
import { formatETB, formatOrderDate } from "@/lib/orderStatus";

const cards = [
  { key: "orders", label: "All orders", icon: <FiClipboard /> },
  { key: "active", label: "Active now", icon: <FiRefreshCw /> },
  { key: "revenue", label: "Completed revenue", icon: <FiDollarSign />, money: true },
  { key: "customers", label: "Customers", icon: <FiUsers /> },
  { key: "staff", label: "Staff accounts", icon: <FiTool /> },
];

/** AdminOverview — live metrics and the newest orders, seeded by the server. */
export default function AdminOverview({ initialStats }) {
  const { data, isValidating } = useSWR("/api/admin/stats", fetcher, {
    fallbackData: { data: initialStats },
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });
  const stats = data?.data ?? initialStats;

  return (
    <div className="admin-overview">
      <div className="portal-toolbar">
        <p className="portal-toolbar__note">
          <FiRefreshCw className={isValidating ? "is-spinning" : undefined} aria-hidden="true" />
          {isValidating ? "Refreshing metrics…" : "Metrics refresh every 15 seconds."}
        </p>
        <div className="portal-toolbar__links">
          <Link href="/admin/orders">All orders <FiArrowRight /></Link>
          <Link href="/admin/users">Users <FiArrowRight /></Link>
          <Link href="/kitchen">Kitchen <FiArrowRight /></Link>
        </div>
      </div>

      <div className="admin-stats">
        {cards.map((card) => (
          <article className="admin-stat" key={card.key}>
            <span className="admin-stat__icon" aria-hidden="true">{card.icon}</span>
            <span className="admin-stat__label">{card.label}</span>
            <strong>{card.money ? `ETB ${formatETB(stats[card.key])}` : stats[card.key]}</strong>
          </article>
        ))}
      </div>

      <section className="portal-card">
        <div className="portal-card__head">
          <h2>Recent orders</h2>
          <Link href="/admin/orders">View all</Link>
        </div>
        {stats.recent?.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.id}</strong></td>
                    <td>{order.customer?.name}</td>
                    <td>{formatOrderDate(order.createdAt)}</td>
                    <td>ETB {formatETB(order.totals?.total)}</td>
                    <td><OrderStatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="portal-empty-inline">No orders have been placed yet.</p>
        )}
      </section>
    </div>
  );
}
