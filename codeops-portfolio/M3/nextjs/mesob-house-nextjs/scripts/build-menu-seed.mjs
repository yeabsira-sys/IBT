import fs from "node:fs";
import path from "node:path";

const source = JSON.parse(
  fs.readFileSync("/tmp/opencode/legacy-menu.json", "utf8"),
);

const activeItems = source.items.filter((item) => item.is_active);
const itemBySlug = new Map(activeItems.map((item) => [item.id, item]));
const categoryBySlug = new Map(source.categories.map((category) => [category.slug, category]));

const standardAllergens = {
  Gluten: "gluten",
  Dairy: "milk",
  Egg: "eggs",
  Fish: "fish",
};

const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const unique = (values) => [...new Set(values.filter(Boolean))];

const inferIngredientUnit = (name) => {
  const value = name.toLowerCase();
  if (
    /(water|oil|honey|tej|coffee|tea|milk|cream|wine|vinegar|stock|broth|juice|sauce|syrup)/.test(
      value,
    )
  ) {
    return "ML";
  }
  if (
    /(chicken|beef|lamb|fish|onion|berbere|garlic|ginger|butter|kibbeh|flour|teff|lentil|chickpea|green|collard|tomato|potato|carrot|cabbage|rice|salt|pepper|spice|cardamom|cinnamon|clove|nutmeg|fenugreek|korerima|mitmita|awaze|cheese|injera|shiro|misir|kik|gomen|spinach|beet|pumpkin|bean|pea|mushroom|meat|bone|rib|leg|breast|thigh)/.test(
      value,
    )
  ) {
    return "G";
  }
  return "PIECE";
};

const parseServing = (servings) => {
  const value = String(servings ?? "").trim();
  if (!value) return { size: null, unit: null };
  if (/\d+\s*-\s*\d+/.test(value)) return { size: null, unit: null };

  let match = value.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (match) return { size: Number(match[1]), unit: "ML" };

  match = value.match(/(\d+)\s*(?:large\s+)?injera/i);
  if (match) return { size: Number(match[1]), unit: "PIECE" };

  match = value.match(/(\d+)\s*rolls?/i);
  if (match) return { size: Number(match[1]), unit: "PIECE" };

  match = value.match(/^1\s+egg/i);
  if (match) return { size: 1, unit: "PIECE" };

  match = value.match(/^serves\s+(\d+)\b/i);
  if (match) return { size: Number(match[1]), unit: "PORTION" };

  return { size: null, unit: null };
};

const mapSpiceLevel = (spice) => {
  const value = String(spice ?? "");
  if (!value) return null;
  if (/3\/3|extra hot|fiery|hot awaze|robust berbere/i.test(value)) {
    return "EXTRA_HOT";
  }
  if (/2\/3|medium-hot|warm berbere|spicy/i.test(value)) return "HOT";
  if (/medium/i.test(value)) return "MEDIUM";
  if (/1\/3|mild|cooling|zesty/i.test(value)) return "MILD";
  return "NONE";
};

const mapServingTemperature = (item) => {
  if (item.category === "drinks") {
    return /tej/i.test(item.name) ? "COLD" : "HOT";
  }
  if (item.category === "sides") return "ROOM_TEMPERATURE";
  if (item.category === "kitfo") return "ROOM_TEMPERATURE";
  return "HOT";
};

const shortDescription = (item) => {
  const value = String(item.tagline ?? "").trim() || String(item.description ?? "").trim();
  if (value.length <= 180) return value;
  return `${value.slice(0, 177).trimEnd()}...`;
};

const searchKeywords = (item) => {
  const category = categoryBySlug.get(item.category);
  const ingredientNames = (item.ingredients ?? []).map((ingredient) => ingredient);
  const values = unique([
    item.name,
    item.native_name,
    category?.label,
    item.spice_level,
    item.servings,
    ...(item.tags ?? []),
    ...ingredientNames,
  ].flatMap((value) => {
    const text = String(value ?? "").trim();
    if (!text) return [];
    return [
      text,
      ...text
        .toLowerCase()
        .split(/[^a-z0-9\u1200-\u137f]+/i)
        .filter((word) => word.length > 2),
    ];
  }));

  return values.map((value) => value.toLowerCase()).slice(0, 40);
};

const optionGroups = [
  {
    key: "heat",
    title: "Heat & Spice Level",
    description: "Choose how much berbere warmth you would like.",
    isRequired: true,
    selectionType: "SINGLE",
    minSelections: 1,
    maxSelections: 1,
    displayType: "RADIO",
    sortOrder: 1,
    options: [
      {
        value: "mild",
        title: "Mild",
        description: "Alicha touch, fragrant cardamoms",
        priceDeltaMinor: 0,
        isDefault: false,
        maxQuantity: 1,
        sortOrder: 1,
      },
      {
        value: "traditional",
        title: "Traditional",
        description: "Berbere warmth (recommended)",
        priceDeltaMinor: 0,
        isDefault: true,
        maxQuantity: 1,
        sortOrder: 2,
      },
      {
        value: "fiery",
        title: "Fiery Awaze",
        description: "Served with awaze & mitmita dip",
        priceDeltaMinor: 0,
        isDefault: false,
        maxQuantity: 1,
        sortOrder: 3,
      },
    ],
  },
  {
    key: "injera",
    title: "Traditional Injera Base",
    description: "Choose the injera served with your dish.",
    isRequired: true,
    selectionType: "SINGLE",
    minSelections: 1,
    maxSelections: 1,
    displayType: "RADIO",
    sortOrder: 2,
    options: [
      {
        value: "standard",
        title: "Standard Teff & Barley Blend",
        description: "Spongy, tart sourdough, naturally soft (traditional)",
        priceDeltaMinor: 0,
        isDefault: true,
        maxQuantity: 1,
        sortOrder: 1,
      },
      {
        value: "pure-teff",
        title: "100% Pure Organic Brown Teff",
        description: "Naturally gluten-free, iron-rich nutty grain",
        priceDeltaMinor: 6000,
        isDefault: false,
        maxQuantity: 1,
        sortOrder: 2,
      },
    ],
  },
  {
    key: "sides-meat",
    title: "Complimentary Side Accents",
    description: "Choose up to two side accents for meat dishes.",
    isRequired: false,
    selectionType: "MULTIPLE",
    minSelections: 0,
    maxSelections: 2,
    displayType: "CHECKBOX",
    sortOrder: 3,
    options: [
      {
        value: "ayib",
        title: "Fresh Ayib",
        description: "Mild fresh cottage curd",
        priceDeltaMinor: 0,
        isDefault: true,
        maxQuantity: 1,
        sortOrder: 1,
      },
      {
        value: "gomen",
        title: "Stewed Gomen",
        description: "Garlic-infused collard greens",
        priceDeltaMinor: 0,
        isDefault: false,
        maxQuantity: 1,
        sortOrder: 2,
      },
      {
        value: "awaze",
        title: "House Awaze Paste",
        description: "Aged tej and berbere sauce",
        priceDeltaMinor: 0,
        isDefault: false,
        maxQuantity: 1,
        sortOrder: 3,
      },
      {
        value: "extra-braised-egg",
        title: "Extra Braised Egg",
        description: "Slow-cooked in the wat broth",
        priceDeltaMinor: 4000,
        isDefault: false,
        maxQuantity: 1,
        sortOrder: 4,
      },
    ],
  },
  {
    key: "sides-fasting",
    title: "Complimentary Side Accents",
    description: "Choose up to two side accents for fasting dishes.",
    isRequired: false,
    selectionType: "MULTIPLE",
    minSelections: 0,
    maxSelections: 2,
    displayType: "CHECKBOX",
    sortOrder: 3,
    options: [
      {
        value: "gomen",
        title: "Stewed Gomen",
        description: "Garlic-infused collard greens",
        priceDeltaMinor: 0,
        isDefault: true,
        maxQuantity: 1,
        sortOrder: 1,
      },
      {
        value: "awaze",
        title: "House Awaze Paste",
        description: "Aged tej and berbere sauce",
        priceDeltaMinor: 0,
        isDefault: false,
        maxQuantity: 1,
        sortOrder: 2,
      },
      {
        value: "extra-teff-injera",
        title: "Extra Teff Injera",
        description: "A basket of three warm rolls",
        priceDeltaMinor: 9000,
        isDefault: false,
        maxQuantity: 1,
        sortOrder: 3,
      },
      {
        value: "pure-teff-injera",
        title: "100% Pure Teff Injera",
        description: "Naturally gluten-free whole injera",
        priceDeltaMinor: 6000,
        isDefault: false,
        maxQuantity: 1,
        sortOrder: 4,
      },
    ],
  },
];

const optionGroupByItem = new Map();
for (const group of source.groups) {
  if (!group.is_active) continue;
  const current = optionGroupByItem.get(group.menu_item_id) ?? [];
  current.push(group.key);
  optionGroupByItem.set(group.menu_item_id, current);
}

const items = activeItems.map((item) => {
  const serving = parseServing(item.servings);
  const category = categoryBySlug.get(item.category);
  const legacyGroups = optionGroupByItem.get(item.id) ?? [];
  const groups = legacyGroups.includes("heat") && legacyGroups.includes("injera")
    ? ["heat", "injera", item.is_fasting ? "sides-fasting" : "sides-meat"]
    : [];

  const allergens = unique(
    (item.allergens ?? []).map((allergen) => standardAllergens[allergen]),
  ).map((code) => ({
    code,
    source: "INGREDIENT",
    isConfirmed: false,
    notes: "Imported candidate from the legacy menu; requires admin confirmation.",
  }));

  const ingredients = unique((item.ingredients ?? []).map((name) => String(name).trim()));
  const ingredientRows = ingredients.map((name, index) => {
    const unit = inferIngredientUnit(name);
    return {
      name,
      slug: slugify(name),
      defaultUnit: unit,
      quantity: null,
      unit,
      sortOrder: index,
    };
  });

  return {
    slug: item.id,
    sku: null,
    name: item.name,
    nativeName: item.native_name || "",
    shortDescription: shortDescription(item),
    description: item.long_description || item.description || "",
    searchKeywords: searchKeywords(item),
    sortOrder: item.sort_order ?? 0,
    spiceLevel: mapSpiceLevel(item.spice_level),
    spiceNotes: item.spice_level || "",
    isSpecial: Boolean(item.is_special),
    preparationTimeMinutes: null,
    cookingTimeMinutes: null,
    preparationMethods: [],
    preparationNotes: "",
    servingSize: serving.size,
    servingUnit: serving.unit,
    servingTemperature: mapServingTemperature(item),
    servingNotes: item.servings || "",
    difficultyLevel: null,
    basePriceMinor: item.price_cents,
    currency: "ETB",
    compareAtPriceMinor: null,
    costPriceMinor: null,
    taxCategoryCode: "VAT",
    isTaxInclusive: true,
    serviceChargeApplicable: true,
    badgeText: item.badge_text || "",
    badgeTone: item.badge_tone || "brand",
    categorySlug: item.category,
    optionGroupKeys: groups,
    media: item.image_url
      ? [
          {
            url: item.image_url,
            altText: item.name,
            mediaType: "IMAGE",
            isPrimary: true,
            sortOrder: 1,
          },
        ]
      : [],
    translations: item.native_name
      ? [
          {
            locale: "am",
            name: item.native_name,
            shortDescription: "",
            description: "",
            nativeName: item.native_name,
          },
        ]
      : [],
    ingredients: ingredientRows,
    allergens,
    dietary: item.is_fasting
      ? [
          {
            code: "FASTING",
            verificationStatus: "VERIFIED",
            verifiedAt: null,
            verifiedBy: null,
          },
        ]
      : [],
    legacyCategory: category?.slug ?? item.category,
  };
});

const pairings = [];
for (const pairing of source.pairings) {
  const item = itemBySlug.get(pairing.menu_item_id);
  const paired = itemBySlug.get(pairing.paired_menu_item_id);
  if (!item || !paired) continue;
  const type =
    paired.category === "drinks"
      ? "DRINK"
      : paired.category === "sides"
        ? "SIDE"
        : "RECOMMENDED";
  pairings.push({
    menuItemSlug: item.id,
    pairedMenuItemSlug: paired.id,
    type,
    sortOrder: pairing.sort_order ?? 0,
  });
}

const seed = {
  source: "legacy migration 004 (menu_items, menu_categories, menu_option_groups, menu_options, menu_pairings)",
  categories: source.categories
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => ({
      slug: category.slug,
      name: category.label,
      description: category.description || "",
      sortOrder: category.sort_order,
    })),
  optionGroups,
  items,
  pairings,
};

const target = path.resolve("scripts/data/menu.seed.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(seed, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      target,
      categories: seed.categories.length,
      items: seed.items.length,
      optionGroups: seed.optionGroups.length,
      pairings: seed.pairings.length,
      ingredients: new Set(
        seed.items.flatMap((item) => item.ingredients.map((ingredient) => ingredient.slug)),
      ).size,
      allergens: new Set(
        seed.items.flatMap((item) => item.allergens.map((allergen) => allergen.code)),
      ).size,
    },
    null,
    2,
  ),
);
