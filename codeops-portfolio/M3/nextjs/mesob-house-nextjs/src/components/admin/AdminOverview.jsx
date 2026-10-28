"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  FiArrowRight,
  FiClipboard,
  FiDollarSign,
  FiRefreshCw,
  FiTool,
  FiUsers,
} from "react-icons/fi";
import OrderStatusBadge from "../orders/OrderStatusBadge";
import MenuItemSalesChart from "../charts/MenuItemSalesChart";
import OrdersPerDayChart from "../charts/OrdersPerDayChart";
import RevenueByAreaChart from "../charts/RevenueByAreaChart";
import TopCustomersChart from "../charts/TopCustomersChart";
import { fetcher } from "@/lib/fetcher";
import { etb, when } from "@/lib/format";
import PieChartCard from "../charts/PieChartCard";

const cards = [
  { key: "orders", label: "All orders", icon: <FiClipboard /> },
  { key: "active", label: "Active now", icon: <FiRefreshCw /> },
  {
    key: "revenue",
    label: "Completed revenue",
    icon: <FiDollarSign />,
    money: true,
  },
  { key: "customers", label: "Customers", icon: <FiUsers /> },
  { key: "staff", label: "Staff accounts", icon: <FiTool /> },
];

/** AdminOverview — live metrics and the newest orders, seeded by the server. */
export default function AdminOverview({ initialStats }) {
  const { data, error, mutate, isValidating } = useSWR(
    "/api/admin/stats",
    fetcher,
    {
      fallbackData: { data: initialStats },
      refreshInterval:
        parseInt(process.env.ADMIN_PAGE_REFRESH_INTERVAL) || 30000,
      revalidateOnFocus: true,
    },
  );
  const stats = data?.data ?? initialStats;

  return (
    <div className="admin-overview">
      <div className="portal-toolbar">
        <p className="portal-toolbar__note">
          <FiRefreshCw
            className={isValidating ? "is-spinning" : undefined}
            aria-hidden="true"
          />
          {isValidating
            ? "Refreshing metrics…"
            : `Metrics refresh every ${(parseInt(process.env.ADMIN_PAGE_REFRESH_INTERVAL) || 30000) / 1000} seconds.`}
        </p>
        <div className="portal-toolbar__links">
          <Link href="/admin/orders">
            All orders <FiArrowRight />
          </Link>
          <Link href="/admin/users">
            Users <FiArrowRight />
          </Link>
          <Link href="/kitchen">
            Kitchen <FiArrowRight />
          </Link>
        </div>
      </div>

      <div className="admin-stats">
        {cards.map((card) => (
          <article className="admin-stat" key={card.key}>
            <span className="admin-stat__icon" aria-hidden="true">
              {card.icon}
            </span>
            <span className="admin-stat__label">{card.label}</span>
            <strong>
              {card.money
                ? etb.format(Number(stats[card.key]) || 0)
                : stats[card.key]}
            </strong>
          </article>
        ))}
      </div>

      {error && (
        <p className="form-error">
          Could not refresh the dashboard. Showing the last known metrics.
          <button
            type="button"
            className="form-error__retry"
            onClick={() => mutate()}
          >
            Retry
          </button>
        </p>
      )}

      <div className="chart-grid">
        <MenuItemSalesChart data={stats.charts?.menuItemShare} />
        <TopCustomersChart data={stats.charts?.topCustomers} />
        <OrdersPerDayChart data={stats.charts?.ordersPerDay} />
        <RevenueByAreaChart data={stats.charts?.revenueByArea} />
      </div>

      <section className="portal-card">
        <div className="portal-card__head">
          <h2>Recent orders</h2>
          <Link href="/admin/orders">View all</Link>
        </div>
        {stats.recent?.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <caption className="visually-hidden">Recent orders</caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Placed</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.id}</strong>
                    </td>
                    <td>{order.customer?.name}</td>
                    <td>{when.format(new Date(order.createdAt))}</td>
                    <td>{etb.format(Number(order.totals?.total) || 0)}</td>
                    <td>
                      <OrderStatusBadge status={order.status} />
                    </td>
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
