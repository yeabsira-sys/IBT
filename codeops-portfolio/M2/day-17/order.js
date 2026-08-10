"use strict";

/**
 * TODO: Write subtotal(...prices) using a reduce callback.
 * Use rest parameters to accept any number of prices [2, 3].
 */
const subtotal = (...prices) => {
  // Use prices.reduce here [3]
  return prices.reduce((acc, price) => acc + price, 0);
};

/**
 * TODO: Write discountBy(rate) as a factory returning an arrow function.
 * This is a Higher-Order Function (HOF) that creates a closure over the rate [2, 3].
 */
const discountBy = (rate) => {
  // Return an arrow function that applies the discount [3]
  return (amount) => amount * (1 - rate);
};

/**
 * TODO: Add withVat as a small pure helper.
 * It should add 15% VAT to a given amount [2, 3].
 */
const withVat = (n) => {
  // Logic: n * 1.15 [3]
  return n * 1.15;
};

/**
 * TODO: Add toETB as a small pure helper.
 * It should format a number to 2 decimal places followed by " ETB" [2, 3].
 */
const toETB = (n) => {
  // Logic: Use n.toFixed(2) [3]
  return `${n.toFixed(2)} ETB`;
};

/**
 * TODO: Build makeReceiptMaker() with a private order number.
 * This function uses a closure to maintain the state of orderNo across calls [4, 5].
 * Inside, it should pre-build a 10% member discount function using discountBy(0.10) [5].
 */
function makeReceiptMaker() {
  let orderNo = 0; // Private state [4]
  const memberOff = discountBy(0.1);

  return function (...items) {
    // 1. Increment orderNo [5]
    orderNo++;
    // 2. Calculate subtotal of items [5]
    const subtotalAmount = subtotal(...items);
    // 3. Compose: apply discount, then VAT [5]
    const discountedAmount = memberOff(subtotalAmount);
    const finalAmount = withVat(discountedAmount);
    // 4. Format and return receipt string (e.g., "#1: 538.20 ETB") [5]
    return `#${orderNo}: ${toETB(finalAmount)}`;
  };
}

const receipt = makeReceiptMaker();

// Almaz orders Doro Wat (220), Tibs (180), and Shiro (120)
console.log(receipt(220, 180, 120));

// Dawit orders Firfir (140) and Buna (60)
console.log(receipt(140, 60));
