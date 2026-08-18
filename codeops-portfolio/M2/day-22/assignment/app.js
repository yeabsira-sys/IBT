const state = {
  rates: {},
  watchlist: JSON.parse(localStorage.getItem("watchlist")) || [],
  lastAmount: localStorage.getItem("lastAmount") || "",
  lastCurrency: localStorage.getItem("lastCurrency") || "",
  status: "loading",
};

const status = document.querySelector("#status");
const form = document.querySelector("#converter-form");
const amountInput = document.querySelector("#amount");
const currencySelect = document.querySelector("#currency");
const result = document.querySelector("#result");
const watchlist = document.querySelector("#watchlist");
const addWatchlistButton = document.querySelector("#add-watchlist");

function renderStatus() {
  if (state.status === "loading") {
    status.textContent = "Loading exchange rates...";
  }

  if (state.status === "success") {
    status.textContent = "Exchange rates loaded successfully.";
  }

  if (state.status === "error") {
    status.textContent = "Unable to load exchange rates.";
  }
}

function renderCurrencies() {
  currencySelect.innerHTML = '<option value="">Select currency</option>';

  Object.keys(state.rates).forEach((currency) => {
    const option = document.createElement("option");

    option.value = currency;
    option.textContent = currency;

    currencySelect.appendChild(option);
  });

  if (state.lastCurrency) {
    currencySelect.value = state.lastCurrency;
  }
}

function renderWatchlist() {
  watchlist.innerHTML = "";

  state.watchlist.forEach((currency) => {
    const li = document.createElement("li");

    li.dataset.currency = currency;

    const span = document.createElement("span");
    span.textContent = currency;

    const button = document.createElement("button");
    button.textContent = "Remove";
    button.classList.add("remove");
    button.type = "button";

    li.appendChild(span);
    li.appendChild(button);

    watchlist.appendChild(li);
  });
}

function saveWatchlist() {
  localStorage.setItem("watchlist", JSON.stringify(state.watchlist));
}

function addToWatchlist(currency) {
  if (state.watchlist.includes(currency)) {
    return;
  }

  state.watchlist.push(currency);

  saveWatchlist();
  renderWatchlist();
}

async function fetchRates() {
  state.status = "loading";
  renderStatus();

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/ETB");

    if (!response.ok) {
      throw new Error("Failed to fetch rates");
    }

    const data = await response.json();

    state.rates = data.rates;
    state.status = "success";

    renderCurrencies();
    renderStatus();
    renderWatchlist();
  } catch (error) {
    console.error(error);

    state.status = "error";
    renderStatus();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const amount = Number(amountInput.value);
  const currency = currencySelect.value;

  if (!amount || amount <= 0) {
    result.textContent = "Enter a valid amount.";
    return;
  }

  if (!currency) {
    result.textContent = "Select a currency.";
    return;
  }

  const rate = state.rates[currency];

  if (!rate) {
    result.textContent = "Rate unavailable.";
    return;
  }

  const converted = amount * rate;

  result.textContent = `${amount} ETB = ${converted.toFixed(2)} ${currency}`;

  state.lastAmount = amount;
  state.lastCurrency = currency;

  localStorage.setItem("lastAmount", amount);
  localStorage.setItem("lastCurrency", currency);
});

addWatchlistButton.addEventListener("click", () => {
  const currency = currencySelect.value;

  if (!currency) {
    return;
  }

  addToWatchlist(currency);
});

watchlist.addEventListener("click", (e) => {
  const button = e.target.closest(".remove");

  if (!button) {
    return;
  }

  const row = button.closest("li");

  if (!row) {
    return;
  }

  const currency = row.dataset.currency;

  state.watchlist = state.watchlist.filter((item) => item !== currency);

  saveWatchlist();
  renderWatchlist();
});

amountInput.value = state.lastAmount;

renderStatus();
renderWatchlist();
fetchRates();
