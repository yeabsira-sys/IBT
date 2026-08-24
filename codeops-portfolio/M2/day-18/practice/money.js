export const VAT = 0.15;

export const addVat = (price) => {
  return price * (1 + VAT);
};
