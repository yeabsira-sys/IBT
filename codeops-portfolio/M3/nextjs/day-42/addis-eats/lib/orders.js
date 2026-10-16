import "server-only";

// Demo fixtures only. Replace with persistent database queries.
const orders = [
  {
    id: "order-1001",
    userId: "customer-1",
    status: "Preparing",
    totalETB: 650,
    items: [{ name: "Classic Doro Wat", quantity: 1 }],
  },
  {
    id: "order-1002",
    userId: "customer-2",
    status: "Delivered",
    totalETB: 580,
    items: [{ name: "Prime Siga Wat", quantity: 1 }],
  },
];

export async function getOrdersFor(userId) {
  return orders.filter((order) => order.userId === userId);
}

export async function getOrderById(orderId) {
  return orders.find((order) => order.id === orderId) ?? null;
}

export async function cancelOrderRecord(orderId) {
  const order = orders.find((item) => item.id === orderId);

  if (!order) return false;

  order.status = "Cancelled";
  return true;
}
