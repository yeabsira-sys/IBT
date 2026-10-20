import {
  FaBowlFood,
  FaBuildingColumns,
  FaKitchenSet,
  FaLocationCrosshairs,
  FaQrcode,
  FaRoute,
  FaShieldHeart,
  FaStore,
  FaTruckFast,
} from "react-icons/fa6";

export const checkoutBreadcrumbSteps = ["Review Order", "Delivery & Payment", "Confirmation"];

export const fulfillmentOptions = [
  { value: "delivery", label: "Prompt Delivery across Addis", icon: <FaTruckFast /> },
  { value: "pickup", label: "Dine-in Pickup (Bole)", icon: <FaStore /> },
];

export const contact = {
  badge: "Habesha Hospitality",
};

export const delivery = {
  badge: { icon: <FaKitchenSet />, label: "Insulated Mesob Carrier" },
  subCities: [
    "Bole Medhanialem (Near Mesob House)",
    "Kazanchis",
    "Sarbet",
    "Old Airport",
    "CMC",
  ],
  timingOptions: [
    {
      value: "immediate",
      title: "Immediate Dispatch",
      description: "Fresh & hot off clay stove (~35–45 min)",
    },
    {
      value: "scheduled",
      title: "Schedule for Dinner",
      description: "Set for evening feast (e.g., 7:30 PM)",
    },
  ],
  route: {
    icon: <FaRoute />,
    title: "Direct Kitchen-to-Door Route",
    text: "Dispatched with heated earthen tray covers.",
    badge: "Bole Zone Priority",
  },
};

export const payment = {
  telebirr: {
    name: "Telebirr",
    badge: "Popular",
    text: "Instant SuperApp QR prompt or USSD confirmation",
    tint: "#8a6116",
    mark: "tb",
    icon: <FaQrcode />,
    qrIcon: <FaQrcode size={44} />,
    panelTitle: "Telebirr Quick Merchant Pay",
    panelText: "Merchant ID: MESOB-7781. Enter your Telebirr-registered phone to authorize instant debit.",
  },
  otherMethods: [
    {
      name: "CBE Birr / CBE Mobile Banking",
      text: "Direct settlement via Commercial Bank of Ethiopia",
      tint: "#1f5d45",
      mark: "CBE",
      icon: <FaBuildingColumns />,
    },
    {
      name: "Cash or Card on Delivery",
      text: "Rider delivers with wireless POS card terminal + change for cash",
      tint: "#9d2b12",
      mark: "POS",
      icon: <FaBowlFood />,
    },
    {
      name: "Amole / Awash Birr",
      text: "Dashen Amole wallet or Awash Birr direct integration",
      tint: "#c7b299",
      mark: "AB",
      icon: <FaLocationCrosshairs />,
    },
  ],
};

export const promise = {
  icon: <FaShieldHeart />,
  title: "The Mesob House Promise",
  text: "Each communal platter arrives with four extra folds of authentic 100% pure teff injera, warm wet towels, and our hand-blended Mitmita spice on the side.",
};
