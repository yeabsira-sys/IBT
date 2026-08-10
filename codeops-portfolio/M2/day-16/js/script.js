const form = document.getElementById("tip-form");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const billAmount = Number(document.getElementById("bill-amount").value);

  const partySize = Number(document.getElementById("party-size").value);

  const result = document.getElementById("result");

  const tipAmount = billAmount > 300 ? billAmount * 0.1 : billAmount * 0.05;

  const totalAmount = billAmount + tipAmount;
  const perPerson = totalAmount / partySize;

  result.innerHTML = `
        Tip Amount: $${tipAmount.toFixed(2)} <br>
        Total Amount: $${totalAmount.toFixed(2)} <br>
        Per Person: $${perPerson.toFixed(2)}
    `;
});
