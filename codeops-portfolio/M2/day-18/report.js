export const totalByType = (txns, type) =>
  txns
    .filter((transaction) => transaction.type === type)
    .reduce((sum, { amount }) => sum + amount, 0);

export const getTransactionsByType = (txns, type) =>
  txns.filter((transaction) => transaction.type === type);

export const createReceipts = (txns) =>
  txns.map(({ customer, amount }) => {
    return `Customer: ${customer} | Amount: ${amount} ETB`;
  });

export const getSummary = (txns) => {
  const credits = totalByType(txns, "credit");
  const debits = totalByType(txns, "debit");

  return {
    credits,
    debits,
    balance: credits - debits,
  };
};
