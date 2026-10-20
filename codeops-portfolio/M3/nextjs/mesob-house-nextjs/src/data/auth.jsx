import {
  FaCircleHalfStroke,
  FaMoneyBillTransfer,
  FaQrcode,
} from "react-icons/fa6";
import { FaShieldHalved, FaLeaf, FaClock, FaPhone } from "react-icons/fa6";

const photo = (id, w = 700) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const signInBreadcrumbs = [
  { label: "Home", to: "/" },
  { label: "Account", to: "/account" },
  { label: "Sign In" },
];

export const signInPanel = {
  badge: "Mesob Feast Circle & Perks",
  title: "A table shared is a bond celebrated.",
  lede:
    "Sign into your culinary sanctuary. Track your seasonal fasting platters, express your Jebena preferences, and summon traditional Addis feasts straight to your door.",
  image: {
    image: photo("1528605248644-14dd04022da1"),
    alt: "Sunday jebena buna coffee ceremony spread",
    title: "Sunday Jebena Buna Circle",
    note: "Exclusive roasting access for verified members",
  },
  perks: [
    {
      icon: <FaCircleHalfStroke />,
      title: "10 Gursha Points / ETB 100",
      description: "Redeem against rare honey tej batches or special communal platters.",
    },
    {
      icon: <FaMoneyBillTransfer />,
      title: "Free Bole & Kazanchis Delivery",
      description: "Priority courier dispatch with heat-insulated clay-stone trays.",
    },
    {
      icon: <FaQrcode />,
      title: "Instant Telebirr & CBE Birr",
      description: "Zero-fee instant table settlement and 1-tap reordering.",
    },
  ],
  quote: {
    mark: "ጉ ር ሻ",
    quote: "The table ordering is as seamless as eating from our grandmother's mesob.",
    source: "Dr. Selamawit H. — Bole Member",
  },
};

export const trust = [
  { icon: <FaShieldHalved />, label: "Encrypted Security", sub: "Telebirr PIN & CBE Birr verified" },
  { icon: <FaLeaf />, label: "Fasting Feasts", sub: "Tsom Beyaynetu on Wed & Fri" },
  { icon: <FaClock />, label: "Fresh Injera Steam", sub: "Baked three times each day" },
  { icon: <FaPhone />, label: "Bole Concierge", sub: "+251 911 234 567" },
];
