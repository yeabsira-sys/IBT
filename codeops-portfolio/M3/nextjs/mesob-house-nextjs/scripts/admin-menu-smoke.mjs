import { getPrisma } from "@/lib/prisma";
import { findUserByEmail } from "@/lib/db";
import {
  createMenuItem,
  deactivateMenuItem,
  updateMenuItem,
} from "@/lib/adminMenu";
import { getMenuForAdmin } from "@/lib/menu";

const prisma = getPrisma();
const slug = "smoke-test-dish";

const input = {
  id: slug,
  name: "Smoke Test Dish",
  nativeName: "የፍተሻ ምግብ",
  tagline: "A temporary dish used to verify the admin catalogue.",
  description: "Short smoke-test description.",
  longDescription: "Long smoke-test description with a little more detail.",
  category: "stews",
  priceCents: 12300,
  imageUrl: "https://example.com/smoke-test.jpg",
  spiceLevel: "Medium",
  servings: "Serves 2",
  ingredients: ["Smoke Test Ingredient"],
  allergens: ["Sesame", "Cereals containing gluten"],
  tags: ["fasting", "popular"],
  badgeText: "Test",
  badgeTone: "gold",
  isSpecial: true,
  isActive: true,
  isFasting: true,
  isComplimentary: false,
  isSide: false,
  sortOrder: 999,
  optionGroups: [
    {
      key: "smoke-option",
      title: "Smoke Option",
      icon: "",
      badge: "Optional",
      columns: 1,
      isMulti: false,
      maxSelections: 1,
      sortOrder: 0,
      isActive: true,
      options: [
        {
          value: "one",
          title: "One",
          description: "",
          note: "",
          priceDeltaCents: 0,
          isDefault: true,
          isActive: true,
          sortOrder: 0,
        },
      ],
    },
  ],
  pairingIds: ["doro-wat"],
};

async function cleanup() {
  const item = await prisma.menuItem.findFirst({
    where: { slug },
    select: { id: true },
  });
  if (item) {
    await prisma.auditLog.deleteMany({
      where: { entityType: "menu_item", entityId: item.id },
    });
    await prisma.menuItem.delete({ where: { id: item.id } });
  }
  await prisma.ingredient.deleteMany({ where: { slug: "smoke-test-ingredient" } });
  await prisma.menuOptionGroup.deleteMany({ where: { key: "smoke-option" } });
}

async function main() {
  const admin = await findUserByEmail("admin@mesob.house");
  if (!admin) throw new Error("Admin demo account is missing");

  await cleanup();
  const created = await createMenuItem(input, admin);
  const afterCreate = await getMenuForAdmin();
  const createdItem = afterCreate.items.find((item) => item.id === slug);
  const checks = {
    created: created.id === slug,
    listed: Boolean(createdItem),
    price: createdItem?.priceCents === 12300,
    special: createdItem?.isSpecial === true,
    fasting: createdItem?.isFasting === true,
    allergens: (createdItem?.allergens ?? []).length === 2,
    optionGroup: createdItem?.optionGroups?.[0]?.key === "smoke-option",
    pairing: createdItem?.pairingIds?.includes("doro-wat"),
    ingredient: createdItem?.ingredients?.includes("Smoke Test Ingredient"),
  };

  const updated = await updateMenuItem(
    slug,
    {
      ...input,
      name: "Smoke Test Dish Updated",
      priceCents: 13300,
      allergens: ["Sesame"],
      optionGroups: [
        {
          ...input.optionGroups[0],
          options: [
            ...input.optionGroups[0].options,
            {
              value: "two",
              title: "Two",
              description: "",
              note: "",
              priceDeltaCents: 500,
              isDefault: false,
              isActive: true,
              sortOrder: 1,
            },
          ],
        },
      ],
    },
    admin,
  );
  const afterUpdate = await getMenuForAdmin();
  const updatedItem = afterUpdate.items.find((item) => item.id === slug);
  checks.updated = updated.id === slug;
  checks.updatedName = updatedItem?.name === "Smoke Test Dish Updated";
  checks.updatedPrice = updatedItem?.priceCents === 13300;
  checks.updatedAllergens = updatedItem?.allergens?.length === 1;
  checks.updatedOptions = updatedItem?.optionGroups?.[0]?.options?.length === 2;

  const retired = await deactivateMenuItem(slug, admin);
  const afterRetire = await getMenuForAdmin();
  checks.retired = retired.isActive === false;
  checks.removed = !afterRetire.items.some((item) => item.id === slug);

  console.log(JSON.stringify({ checks, createdItem, updatedItem }, null, 2));

  await cleanup();
  if (Object.values(checks).some((value) => !value)) {
    throw new Error("Admin menu smoke test failed");
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
