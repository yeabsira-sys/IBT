const API_URLS = [
  "https://www.themealdb.com/api/json/v1/1/filter.php?c=Beef",
  "https://www.themealdb.com/api/json/v1/1/filter.php?c=Chicken",
  // "https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian",
  // "https://www.themealdb.com/api/json/v1/1/filter.php?c=Seafood",
  // "https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast",
];

// state

let menu = [];

let cartItems = JSON.parse(localStorage.getItem("cart")) || [];

//dom elements

const menuSection = document.getElementById("menu");
const cart = document.getElementById("cart");
const cartItemsContainer = document.getElementById("cart-items");
const cartSummary = document.getElementById("cart-summary");
const cartToggle = document.getElementById("cart-toggle");
const cartClose = document.getElementById("cart-close");
const cartCount = document.getElementById("cart-count");
const searchInput = document.getElementById("search");

// status message
const statusMessage = document.createElement("div");
statusMessage.id = "menu-status";
menuSection.appendChild(statusMessage);

// save cart

const saveCart = () => {
  localStorage.setItem("cart", JSON.stringify(cartItems));
};

// get total cart items

const getCartCount = () => {
  return cartItems.reduce((total, item) => {
    return total + item.count;
  }, 0);
};

//get total price

const getCartTotal = () => {
  return cartItems.reduce((total, item) => {
    return total + Number(item.price) * item.count;
  }, 0);
};

// update cart count

const updateCartCount = () => {
  cartCount.textContent = getCartCount();
};

// create food card

const createDishCard = (dishItem) => {
  const article = document.createElement("article");
  article.classList.add("food-card");

  // image

  const img = document.createElement("img");
  img.src = dishItem.image;
  img.alt = dishItem.name;

  // content

  const content = document.createElement("div");
  content.classList.add("food-card-content");

  // name

  const title = document.createElement("h3");

  title.textContent = dishItem.name;

  // category

  const category = document.createElement("p");
  category.textContent = dishItem.category;

  // spicy

  if (dishItem.spicy) {
    const spicy = document.createElement("span");
    spicy.classList.add("spicy");
    spicy.textContent = "🌶️ Spicy";
    content.appendChild(spicy);
  }

  // price

  const price = document.createElement("p");
  price.classList.add("price");
  price.textContent = `${dishItem.price} ETB`;

  // button

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("add");
  button.textContent = "Add to Cart";
  button.dataset.id = dishItem.id;

  // append

  content.appendChild(title);
  content.appendChild(category);
  content.appendChild(price);
  content.appendChild(button);
  article.appendChild(img);
  article.appendChild(content);

  return article;
};

// render menu

let currentPage = 1;
const itemsPerPage = 30;

const renderMenu = (items) => {
  menuSection.innerHTML = "";
  menuSection.appendChild(statusMessage);

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.classList.add("empty-menu");
    empty.textContent = "No food found.";
    menuSection.appendChild(empty);

    return;
  }

  // calculate starting and ending indexs

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const currentItems = items.slice(start, end);

  currentItems.forEach((item) => {
    menuSection.appendChild(createDishCard(item));
  });

  // pagination container
  const pagination = document.createElement("div");
  pagination.classList.add("pagination");

  if (end < items.length) {
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.classList.add("next");
    nextButton.addEventListener("click", () => {
      currentPage++;
      renderMenu(items);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
    pagination.appendChild(nextButton);
  }
  // previous button
  if (currentPage > 1) {
    const previousButton = document.createElement("button");
    previousButton.textContent = "Previous";
    previousButton.classList.add("previous");
    previousButton.addEventListener("click", () => {
      currentPage--;

      renderMenu(items);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });

    pagination.insertBefore(previousButton, pagination.firstChild);
  }

  menuSection.appendChild(pagination);
};

// create cart ittm

const createCartCard = (item) => {
  const article = document.createElement("article");

  article.classList.add("cart-item");

  // important for event

  article.dataset.id = item.id;

  // name

  const name = document.createElement("p");
  name.classList.add("cart-item-name");
  name.textContent = item.name;

  // quantity container

  const quantity = document.createElement("div");
  quantity.classList.add("quantity-controls");

  // decrease

  const decrease = document.createElement("button");
  decrease.type = "button";
  decrease.classList.add("cart-item-decrease");
  decrease.dataset.action = "decrease";
  decrease.textContent = "−";

  // count

  const count = document.createElement("span");
  count.classList.add("cart-item-count");
  count.textContent = item.count;

  // increase

  const increase = document.createElement("button");
  increase.type = "button";
  increase.classList.add("cart-item-increase");
  increase.dataset.action = "increase";
  increase.textContent = "+";
  quantity.appendChild(decrease);
  quantity.appendChild(count);
  quantity.appendChild(increase);

  // price

  const price = document.createElement("p");
  price.classList.add("cart-item-price");
  const itemTotal = item.price * item.count;
  price.textContent = `${itemTotal} ETB`;

  // remove

  const remove = document.createElement("button");
  remove.type = "button";
  remove.classList.add("cart-item-remove");
  remove.dataset.action = "remove";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Remove ${item.name}`);

  // append

  article.appendChild(name);
  article.appendChild(quantity);
  article.appendChild(price);
  article.appendChild(remove);

  return article;
};

// render cart

const renderCart = () => {
  cartItemsContainer.innerHTML = "";
  cartSummary.innerHTML = "";

  // empty cart

  if (cartItems.length === 0) {
    const empty = document.createElement("p");
    empty.classList.add("empty");
    empty.textContent = "Your cart is empty.";
    cartItemsContainer.appendChild(empty);
    updateCartCount();

    return;
  }

  // render items

  cartItems.forEach((item) => {
    cartItemsContainer.appendChild(createCartCard(item));
  });

  // summary

  const summary = document.createElement("div");
  summary.classList.add("cart-summary");

  // total items

  const itemTotal = document.createElement("div");
  itemTotal.classList.add("summary-row");
  itemTotal.innerHTML = `
    <span>Items</span>
    <strong>${getCartCount()}</strong>
  `;

  // total price

  const total = document.createElement("div");

  total.classList.add("summary-row", "total-row");

  total.innerHTML = `
    <span>Total</span>
    <strong>${getCartTotal()} ETB</strong>
  `;

  // checkout

  const checkout = document.createElement("button");
  checkout.type = "button";
  checkout.classList.add("checkout");
  checkout.textContent = "Checkout";
  summary.appendChild(itemTotal);
  summary.appendChild(total);
  summary.appendChild(checkout);
  cartSummary.appendChild(summary);
  updateCartCount();
};

// add to cart

const addToCart = (id) => {
  const food = menu.find((item) => String(item.id) === String(id));

  if (!food) {
    console.error("Food not found:", id);
    return;
  }

  const existing = cartItems.find((item) => String(item.id) === String(id));

  if (existing) {
    existing.count += 1;
  }

  // new cart item
  else {
    cartItems.push({
      id: food.id,
      name: food.name,
      category: food.category,
      price: food.price,
      image: food.image,
      count: 1,
    });
  }

  saveCart();
  renderCart();
};

// increase item

const increaseItem = (id) => {
  const item = cartItems.find((item) => String(item.id) === String(id));

  if (!item) {
    return;
  }

  item.count += 1;

  saveCart();
  renderCart();
};

// decrease item

const decreaseItem = (id) => {
  const item = cartItems.find((item) => String(item.id) === String(id));

  if (!item) {
    return;
  }
  item.count -= 1;

  // remove item when quantity become 0

  if (item.count <= 0) {
    cartItems = cartItems.filter(
      (cartItem) => String(cartItem.id) !== String(id),
    );
  }

  saveCart();
  renderCart();
};

// remove item

const removeItem = (id) => {
  cartItems = cartItems.filter((item) => String(item.id) !== String(id));

  saveCart();
  renderCart();
};

// menu event

menuSection.addEventListener("click", (event) => {
  const button = event.target.closest(".add");

  if (!button) {
    return;
  }
  const id = button.dataset.id;
  addToCart(id);
});

// add to cart event

cartItemsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }
  const cartItem = button.closest(".cart-item");
  if (!cartItem) {
    return;
  }

  const id = cartItem.dataset.id;
  const action = button.dataset.action;

  if (action === "increase") {
    increaseItem(id);
  } else if (action === "decrease") {
    decreaseItem(id);
  } else if (action === "remove") {
    removeItem(id);
  }
});

// search

searchInput.addEventListener("input", (event) => {
  const search = event.target.value.trim().toLowerCase();

  const filtered = menu.filter((item) => {
    return (
      item.name.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search)
    );
  });

  renderMenu(filtered);
});

// open cart

cartToggle.addEventListener("click", () => {
  cart.classList.add("open");
});

// close cart

cartClose.addEventListener("click", () => {
  cart.classList.remove("open");
});

// fetch menu

const fetchMenu = async () => {
  try {
    statusMessage.textContent = "Loading menu...";
    statusMessage.className = "menu-status loading";

    menuSection.innerHTML = "";
    menuSection.appendChild(statusMessage);

    const responses = await Promise.all(API_URLS.map((url) => fetch(url)));

    const data = await Promise.all(
      responses.map((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch menu: ${response.status} ${response.statusText}`,
          );
        }

        return response.json();
      }),
    );

    const meals = data.flatMap((result) => result.meals || []);
    console.log(meals);
    menu = meals.map((meal) => ({
      id: Number(meal.idMeal),
      name: meal.strMeal,
      category: "Food",
      price: 200,
      image: meal.strMealThumb,
      spicy: false,
    }));

    statusMessage.textContent = `Showing ${menu.length} foods`;

    statusMessage.className = "menu-status success";

    renderMenu(menu);
  } catch (error) {
    console.error("Menu fetch error:", error);

    menu = [];

    menuSection.innerHTML = "";

    const errorMessage = document.createElement("div");

    errorMessage.classList.add("menu-status", "error");

    errorMessage.innerHTML = `
      <strong>Unable to load menu.</strong>
      <br>
      Please check your internet connection.
      <br><br>
      <button
        id="retry-menu"
        type="button"
        class="retry"
      >
        Try Again
      </button>
    `;

    menuSection.appendChild(errorMessage);
  }
};

// order form

// render form

const renderCheckoutForm = () => {
  const container = document.createElement("div");
  container.id = "checkout-container";

  const form = document.createElement("form");
  form.id = "checkout-form";

  const title = document.createElement("h2");
  title.textContent = "Complete Your Order";

  const nameGroup = document.createElement("div");

  const nameLabel = document.createElement("label");
  nameLabel.htmlFor = "user-name";
  nameLabel.textContent = "Full Name";

  const nameInput = document.createElement("input");
  nameInput.id = "user-name";
  nameInput.name = "name";
  nameInput.type = "text";
  nameInput.placeholder = "Enter your full name";
  nameInput.required = true;

  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);

  const phoneGroup = document.createElement("div");

  const phoneLabel = document.createElement("label");
  phoneLabel.htmlFor = "phone";
  phoneLabel.textContent = "Phone Number";

  const phoneInput = document.createElement("input");
  phoneInput.id = "phone";
  phoneInput.name = "phone";
  phoneInput.type = "tel";
  phoneInput.placeholder = "09XXXXXXXX";
  phoneInput.required = true;

  phoneGroup.appendChild(phoneLabel);
  phoneGroup.appendChild(phoneInput);

  const addressGroup = document.createElement("div");

  const addressLabel = document.createElement("label");
  addressLabel.htmlFor = "address";
  addressLabel.textContent = "Delivery Address";

  const addressInput = document.createElement("textarea");
  addressInput.id = "address";
  addressInput.name = "address";
  addressInput.placeholder = "Enter your delivery address";
  addressInput.required = true;

  addressGroup.appendChild(addressLabel);
  addressGroup.appendChild(addressInput);

  const paymentGroup = document.createElement("div");

  const paymentLabel = document.createElement("label");
  paymentLabel.htmlFor = "payment";
  paymentLabel.textContent = "Payment Method";

  const paymentSelect = document.createElement("select");
  paymentSelect.id = "payment";
  paymentSelect.name = "payment";
  paymentSelect.required = true;

  const telebirrOption = document.createElement("option");
  telebirrOption.value = "TeleBirr";
  telebirrOption.textContent = "TeleBirr";

  const cashOption = document.createElement("option");
  cashOption.value = "Cash on Delivery";
  cashOption.textContent = "Cash on Delivery";

  paymentSelect.appendChild(telebirrOption);
  paymentSelect.appendChild(cashOption);

  paymentGroup.appendChild(paymentLabel);
  paymentGroup.appendChild(paymentSelect);

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.count),
    0,
  );

  const totalParagraph = document.createElement("p");
  totalParagraph.classList.add("checkout-total");
  totalParagraph.textContent = `Total: ${total.toLocaleString()} ETB`;

  const buttons = document.createElement("div");
  buttons.classList.add("checkout-buttons");

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.id = "cancel-checkout";
  cancelButton.textContent = "Cancel";

  const orderButton = document.createElement("button");
  orderButton.type = "submit";
  orderButton.classList.add("place-order");
  orderButton.textContent = "Place Order";

  buttons.appendChild(cancelButton);
  buttons.appendChild(orderButton);

  form.appendChild(title);
  form.appendChild(nameGroup);
  form.appendChild(phoneGroup);
  form.appendChild(addressGroup);
  form.appendChild(paymentGroup);
  form.appendChild(totalParagraph);
  form.appendChild(buttons);

  container.appendChild(form);

  return container;
};

// checkout

cartSummary.addEventListener("click", (event) => {
  if (event.target.classList.contains("checkout")) {
    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (document.querySelector("#checkout-container")) {
      return;
    }

    document.body.appendChild(renderCheckoutForm());

    const checkoutForm = document.querySelector("#checkout-form");

    checkoutForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(checkoutForm);

      const customerName = formData.get("name").trim();
      const phone = formData.get("phone").trim();
      const address = formData.get("address").trim();
      const payment = formData.get("payment");

      if (!customerName || !phone || !address) {
        alert("Please fill in all required fields.");
        return;
      }

      if (phone.length < 9) {
        alert("Please enter a valid phone number.");
        return;
      }

      const total = cartItems.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.count),
        0,
      );

      const order = {
        id: Date.now(),
        customer: {
          name: customerName,
          phone: phone,
          address: address,
        },
        paymentMethod: payment,
        items: [...cartItems],
        total: total,
        status: "Pending",
        createdAt: new Date().toISOString(),
      };

      const existingOrders = JSON.parse(localStorage.getItem("orders")) || [];

      existingOrders.push(order);

      localStorage.setItem("orders", JSON.stringify(existingOrders));

      cartItems = [];

      localStorage.setItem("cart", JSON.stringify(cartItems));

      renderCart(cartItems);

      document.querySelector("#checkout-container").remove();

      showOrderSuccess(order);
    });
  }
});

document.addEventListener("click", (event) => {
  if (event.target.id === "cancel-checkout") {
    const checkoutContainer = document.querySelector("#checkout-container");

    if (checkoutContainer) {
      checkoutContainer.remove();
    }
  }
});

const showOrderSuccess = (order) => {
  const message = document.createElement("div");

  message.id = "order-success";

  message.innerHTML = `
    <div class="success-content">
      <h2>Order Placed Successfully!</h2>
      <p>Thank you, ${order.customer.name}.</p>
      <p>
        Your order total is
        <strong>${order.total.toLocaleString()} ETB</strong>
      </p>
      <p>Payment: ${order.paymentMethod}</p>
      <p>Delivery to: ${order.customer.address}</p>
      <p class="order-number">
        Order #${order.id}
      </p>
      <button id="close-success">
        Continue Shopping
      </button>
    </div>
  `;

  document.body.appendChild(message);
};

document.addEventListener("click", (event) => {
  if (event.target.id === "close-success") {
    const success = document.querySelector("#order-success");

    if (success) {
      success.remove();
    }
  }
});

//initial call

renderCart();
fetchMenu();
