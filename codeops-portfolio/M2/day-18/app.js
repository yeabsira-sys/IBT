import { transactions } from "./transactions.js";

import {
  totalByType,
  getTransactionsByType,
  createReceipts,
  getSummary,
} from "./report.js";

// ============================================
// 1. TOTAL CREDITS AND DEBITS
// ============================================

const totalCredits = totalByType(transactions, "credit");

const totalDebits = totalByType(transactions, "debit");

console.log("===== TELEBIRR TRANSACTION REPORT =====");

console.log(`Total Credits: ${totalCredits} ETB`);

console.log(`Total Debits: ${totalDebits} ETB`);

const credits = getTransactionsByType(transactions, "credit");

const debits = getTransactionsByType(transactions, "debit");

console.log("\nCredit Transactions:");

console.log(credits);

console.log("\nDebit Transactions:");

console.log(debits);

const receipts = createReceipts(transactions);

console.log("\nReceipts:");

receipts.forEach((receipt) => {
  console.log(receipt);
});

const originalTransaction = transactions[0];

const correctedTransaction = {
  ...originalTransaction,
  amount: 300,
};

console.log("\nOriginal Transaction:");

console.log(originalTransaction);

console.log("\nCorrected Transaction:");

console.log(correctedTransaction);

const summary = getSummary(transactions);

console.log("\n===== SUMMARY =====");

console.log(`Credits: ${summary.credits} ETB`);

console.log(`Debits: ${summary.debits} ETB`);

console.log(`Balance: ${summary.balance} ETB`);
