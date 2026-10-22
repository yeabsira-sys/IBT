import { when } from "./format";

/**
 * Escape one CSV cell.
 *
 * A comma, quote or newline inside a value must be protected:
 * - commas/newlines need the whole cell quoted;
 * - a quote is escaped by doubling it;
 * - the result is wrapped in quotes.
 *
 * This is the difference between a clean export and a file where one address
 * or dish name shifts every column after it.
 */
export function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Convert a matrix of values into a CRLF-delimited CSV document. */
export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/**
 * The customer's order history as a spreadsheet-friendly CSV.
 * Money stays numeric so the file can be summed in Excel/Sheets; the column
 * names carry the ETB unit.
 */
export function orderHistoryCsv(orders = []) {
  const header = [
    "Order ID",
    "Placed",
    "Status",
    "Fulfilment",
    "Items",
    "Subtotal (ETB)",
    "VAT (ETB)",
    "Discount (ETB)",
    "Total (ETB)",
    "Address",
    "Contact",
    "Note",
  ];

  const rows = orders.map((order) => {
    const address =
      order.fulfillment === "pickup"
        ? "Mesob House, Bole Medhanialem"
        : [order.delivery?.street, order.delivery?.subCity, order.delivery?.landmark]
            .filter(Boolean)
            .join(", ");

    const contact = [order.contact?.name, order.contact?.phone ? `+251 ${order.contact.phone}` : ""]
      .filter(Boolean)
      .join(" · ");

    return [
      order.id,
      when.format(new Date(order.createdAt)),
      order.status,
      order.fulfillment,
      (order.items ?? []).map((item) => `${item.quantity} × ${item.name}`).join("; "),
      Number(order.totals?.subtotal ?? 0),
      Number(order.totals?.vat ?? 0),
      Number(order.totals?.discount ?? 0),
      Number(order.totals?.total ?? 0),
      address,
      contact,
      order.note ?? "",
    ];
  });

  return toCsv([header, ...rows]);
}

/** Trigger a browser download and release the object URL afterwards. */
export function downloadCsv(filename, csv) {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
