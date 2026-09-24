import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useNavigate } from "react-router-dom";
import { FaHeadset } from "react-icons/fa6";

import Navbar from "../components/layout/Navbar";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import Footer from "../components/layout/Footer";
import OrderSteps from "../components/checkout/OrderSteps";
import FulfillmentToggle from "../components/checkout/FulfillmentToggle";
import ContactDetailsCard from "../components/checkout/ContactDetailsCard";
import DeliveryLocationCard from "../components/checkout/DeliveryLocationCard";
import PaymentMethodCard from "../components/checkout/PaymentMethodCard";
import PromiseBanner from "../components/checkout/PromiseBanner";
import CheckoutSummary from "../components/checkout/CheckoutSummary";

import { footer, navLinks } from "../data/content";
import { checkoutSteps as basketSteps } from "../data/basket";

import {
  contact,
  delivery,
  fulfillmentOptions,
  payment,
  promise,
} from "../data/checkout";

import { useStore } from "../stores/useStores";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

const checkoutBreadcrumbs = [
  { label: "Home", to: "/" },
  { label: "Menu", to: "/menu" },
  { label: "Cart", to: "/cart" },
  { label: "Delivery & Payment" },
];

const checkoutSchema = z.object({
  fulfillment: z.enum(["delivery", "pickup"]),

  name: z.string().trim().min(2, "Enter the recipient's name."),

  phone: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .refine(
      (value) => /^\d{9}$/.test(value),
      "Enter 9 digits after +251, e.g. 911 234 567.",
    ),

  email: z.string().trim().email("Enter a valid email address."),

  subCity: z.string().min(1, "Select your sub-city or neighborhood."),

  street: z
    .string()
    .trim()
    .min(3, "Enter your street, building, or flat number."),

  landmark: z.string().trim().min(3, "Enter a landmark or gate instruction."),

  timing: z.string().min(1, "Select a dispatch timing."),

  telebirrPhone: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .refine((value) => /^\d{9}$/.test(value), "Enter 9 digits after +251."),

  method: z.string().min(1, "Select a payment method."),
});

export default function CheckoutPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const checkout = useStore((state) => state.checkout);
  const updateCheckout = useStore((state) => state.updateCheckout);
  const updateCheckoutValue = useStore((state) => state.updateCheckoutValue);

  const cartItems = useStore((state) => state.cartItems);

  const getTotals = useStore((state) => state.getTotals);

  const placeOrder = useStore((state) => state.placeOrder);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),

    defaultValues: {
      fulfillment: checkout.fulfillment || "delivery",

      name: "",
      phone: "",
      email: "",

      subCity: "",
      street: "",
      landmark: "",
      timing: "",

      telebirrPhone: "",
      method: checkout.method || "telebirr",
    },

    mode: "onBlur",
  });

  const fulfillment = watch("fulfillment");
  const timing = watch("timing");
  const method = watch("method");

  // useEffect(() => {
  //   setValue("fulfillment", checkout.fulfillment || "delivery");
  //   setValue("method", checkout.method || "telebirr");
  // }, [checkout.fulfillment, checkout.method, setValue]);

  const { cart: navCart, user: navUser } = useNavbarState();

  const totals = getTotals();

  const handleFulfillmentChange = (value) => {
    setValue("fulfillment", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleTimingChange = (value) => {
    setValue("timing", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleMethodChange = (value) => {
    setValue("method", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleVerify = () => {
    const phone = watch("telebirrPhone");

    toast(`Verification code sent to +251 ${phone}`, "info");
  };

  const handleConfirm = (values) => {
    updateCheckout("contact", {
      name: values.name,
      phone: values.phone,
      email: values.email,
    });

    updateCheckout("delivery", {
      subCity: values.subCity,
      street: values.street,
      landmark: values.landmark,
      timing: values.timing,
    });

    updateCheckoutValue("fulfillment", values.fulfillment);

    updateCheckoutValue("telebirrPhone", values.telebirrPhone);

    updateCheckoutValue("method", values.method);

    const result = placeOrder();

    toast(result.message, result.ok ? "success" : "error");

    if (result.ok) {
      navigate("/");
    }
  };

  const summaryItems = cartItems.map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    description: item.description,
    image: item.image,
    tag: item.tags?.[0] ?? {
      text: "Dish",
      tone: "brand",
    },
  }));

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const summaryProps = {
    eyebrow: "Habesha Feast",

    title: "Order Summary",

    editHref: "/cart",

    items: summaryItems,

    deliveringTo: {
      status: "Active Corridor",
      address: watch("subCity"),
      eta: "Estimated arrival ~35–45 mins from clay oven sealing",
    },

    costs: [
      {
        label: `Items Subtotal (${itemCount} item${
          itemCount === 1 ? "" : "s"
        })`,
        value: `ETB ${totals.subtotal.toLocaleString()}`,
      },

      {
        label: "100% Teff Injera (4 Rolls)",
        value: "Included",
        tone: "positive",
      },

      {
        label: "Insulated Traditional Clay-Pak",
        value: "Free",
        tone: "positive",
      },

      {
        label: "City VAT & Tourism Levy (15%)",
        value: `ETB ${totals.vat.toLocaleString()}`,
      },

      ...(totals.discount > 0
        ? [
            {
              label: "Coupon Discount",
              value: `− ETB ${totals.discount}`,
              tone: "positive",
            },
          ]
        : []),
    ],

    total: totals.total.toLocaleString(),

    guarantee:
      "Guaranteed steaming hot in woven sealed carriers or 100% remade.",

    ctaLabel: `Confirm Order & Pay ETB ${totals.total.toLocaleString()}`,

    support: {
      icon: <FaHeadset />,
      title: "Need Phone Support?",
      text: "Direct kitchen desk: +251 911 234 567",
      phone: "+251911234567",
    },
  };

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <main className="container">
        <div className="checkout-head">
          <Breadcrumbs items={checkoutBreadcrumbs} />
        </div>

        <OrderSteps steps={basketSteps} current={2} />

        <FulfillmentToggle
          options={fulfillmentOptions}
          value={fulfillment}
          onChange={handleFulfillmentChange}
        />

        {errors.fulfillment && (
          <p className="field__hint field__hint--error">
            {errors.fulfillment.message}
          </p>
        )}

        <form onSubmit={handleSubmit(handleConfirm)} noValidate>
          <div className="checkout-layout">
            <div className="checkout-main">
              <ContactDetailsCard
                badge={contact.badge}
                register={register}
                errors={errors}
              />

              <DeliveryLocationCard
                badge={delivery.badge}
                subCities={delivery.subCities}
                register={register}
                errors={errors}
                timingOptions={delivery.timingOptions}
                timing={timing}
                onTimingChange={handleTimingChange}
                route={delivery.route}
              />

              <PaymentMethodCard
                telebirr={payment.telebirr}
                register={register}
                errors={errors}
                phone={watch("telebirrPhone")}
                onPhoneChange={(value) =>
                  setValue("telebirrPhone", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                onVerify={handleVerify}
                otherMethods={payment.otherMethods}
                selectedMethod={method}
                onSelectMethod={handleMethodChange}
              />

              <PromiseBanner {...promise} />
            </div>

            <CheckoutSummary {...summaryProps} />
          </div>
        </form>
      </main>

      <Footer {...footer} />
    </>
  );
}
