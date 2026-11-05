import { getPrisma } from "@/lib/prisma";
import { findUserByEmail } from "@/lib/db";
import {
  cancelOrderForUser,
  createOrder,
  getOrderForUser,
  updateOrderStatus,
} from "@/lib/orders";

const prisma = getPrisma();

async function cleanup(orderUuid) {
  await prisma.auditLog.deleteMany({
    where: { entityType: "order", entityId: orderUuid },
  });
  await prisma.order.delete({ where: { id: orderUuid } });
}

async function main() {
  const guest = await findUserByEmail("guest@mesob.house");
  const admin = await findUserByEmail("admin@mesob.house");
  if (!guest || !admin) throw new Error("Demo accounts are missing; run the seed.");

  const order = await createOrder({
    user: guest,
    items: [
      { menuItemSlug: "doro-wat", quantity: 1, options: [] },
      { menuItemSlug: "misir-wat", quantity: 1, options: [] },
      { menuItemSlug: "house-tej-carafe", quantity: 1, options: [] },
    ],
    couponCode: "GURSHA2025",
    note: "Order flow smoke test",
    fulfillment: "delivery",
    contact: {
      name: guest.fullName,
      phone: guest.phone || "911000000",
      email: guest.email,
    },
    delivery: {
      subCity: "Bole Medhanialem (Near Mesob House)",
      street: "Bole Medhanialem, Test Building, 3rd floor",
      landmark: "Near the church",
      timing: "immediate",
    },
    method: "cash",
  });

  const checks = {
    publicId: order.id.startsWith("MH-"),
    status: order.status === "received",
    subtotal: order.totals.subtotal === 136000 / 100,
    discount: order.totals.discount === 20000 / 100,
    vat: order.totals.vat === 15130 / 100,
    delivery: order.totals.delivery === 5000 / 100,
    total: order.totals.total === 121000 / 100,
    items: order.items.length === 3,
    itemSlugs: order.items.every((item) =>
      ["doro-wat", "misir-wat", "house-tej-carafe"].includes(item.id),
    ),
    history: order.statusHistory.length === 1,
  };

  const ownOrder = await getOrderForUser(guest.id, order.id);
  checks.ownership = ownOrder?.id === order.id;

  const cancelled = await cancelOrderForUser(order.id, guest.id);
  checks.cancel = cancelled.ok && cancelled.order.status === "cancelled";
  checks.cancelHistory = cancelled.ok && cancelled.order.statusHistory.length === 2;

  const second = await createOrder({
    user: guest,
    items: [{ menuItemSlug: "doro-wat", quantity: 1, options: [] }],
    couponCode: null,
    note: "Status transition smoke test",
    fulfillment: "pickup",
    contact: {
      name: guest.fullName,
      phone: guest.phone || "911000000",
      email: guest.email,
    },
    delivery: { subCity: "", street: "", landmark: "", timing: "immediate" },
    method: "cash",
  });

  const transitions = [];
  for (const status of ["preparing", "ready", "completed"]) {
    const result = await updateOrderStatus(second.id, status, admin);
    transitions.push({ status, ok: result.ok, actual: result.order?.status });
  }
  checks.transitions = transitions.every((row) => row.ok && row.actual === row.status);
  const completed = await getOrderForUser(guest.id, second.id);
  checks.completedAt = Boolean(completed?.completedAt);
  checks.completedHistory = completed?.statusHistory.length === 4;

  console.log(
    JSON.stringify(
      {
        order: {
          id: order.id,
          totals: order.totals,
          items: order.items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
          })),
        },
        transitions,
        checks,
      },
      null,
      2,
    ),
  );

  await cleanup(order.orderUuid);
  await cleanup(second.orderUuid);

  if (Object.values(checks).some((value) => !value)) {
    throw new Error("Order flow smoke test failed");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
