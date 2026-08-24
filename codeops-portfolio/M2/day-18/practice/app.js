// map, filter, reduce

const prices = [100, 250, 500, 800, 1200, 1500, 300];

const pricesWithVat = prices.map((price) => price * 1.15);

console.log("Prices with VAT:");
console.log(pricesWithVat);

const pricesUnder1000 = pricesWithVat.filter((price) => price < 1000);

console.log("Prices under 1000 ETB:");
console.log(pricesUnder1000);

// Calculate grand total using reduce()
const grandTotal = pricesUnder1000.reduce((total, price) => total + price, 0);

console.log("Grand Total:", grandTotal, "ETB");

const customer = {
  name: "Yeabsira",
  city: "Addis Ababa",
  balance: 2500,
};

for (const [key, value] of Object.entries(customer)) {
  console.log(`${key}: ${value}`);
}

const { name, city } = customer;

console.log("Customer name:", name);
console.log("Customer city:", city);

function greet({ name }) {
  console.log(`Hello, ${name}!`);
}

greet(customer);

const updatedCustomer = {
  ...customer,
  city: "Bole",
  phone: "0912345678",
};

console.log("Original customer:");
console.log(customer);

console.log("Updated customer:");
console.log(updatedCustomer);

import { addVat, VAT } from "./money.js";

const price = 500;

console.log("VAT rate:", VAT);
console.log("Price:", price);
console.log("Price with VAT:", addVat(price));
