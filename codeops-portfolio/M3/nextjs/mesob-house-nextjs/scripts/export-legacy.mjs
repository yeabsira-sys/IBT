import fs from "node:fs";
import { Client } from "pg";

const client = new Client({
  connectionString: "postgresql://postgres@localhost:55432/mesob_legacy",
});
await client.connect();

async function rows(sql) {
  return (await client.query(sql)).rows;
}

const data = {
  categories: await rows("SELECT * FROM menu_categories ORDER BY sort_order"),
  items: await rows("SELECT * FROM menu_items ORDER BY category, sort_order, name"),
  groups: await rows("SELECT * FROM menu_option_groups ORDER BY menu_item_id, sort_order"),
  options: await rows("SELECT * FROM menu_options ORDER BY group_id, sort_order"),
  pairings: await rows("SELECT * FROM menu_pairings ORDER BY menu_item_id, sort_order"),
};

fs.writeFileSync("/tmp/opencode/legacy-menu.json", JSON.stringify(data, null, 2));
console.log(
  JSON.stringify({
    categories: data.categories.length,
    items: data.items.length,
    groups: data.groups.length,
    options: data.options.length,
    pairings: data.pairings.length,
  }),
);
await client.end();
