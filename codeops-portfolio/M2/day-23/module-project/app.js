const API_URLS = [
  "https://www.themealdb.com/api/json/v1/1/filter.php?c=Beef",
  "https://www.themealdb.com/api/json/v1/1/filter.php?c=Chicken",
  "https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian",
  "https://www.themealdb.com/api/json/v1/1/filter.php?c=Seafood",
  "https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast",
];

// STATE

let menu = [];

let cartItems = JSON.parse(localStorage.getItem("cart")) || [];

// DOM ELEMENTS

const menuSection = document.getElementById("menu");
const cart = document.getElementById("cart");
const cartItemsContainer = document.getElementById("cart-items");
const cartSummary = document.getElementById("cart-summary");
const cartToggle = document.getElementById("cart-toggle");
const cartClose = document.getElementById("cart-close");
const cartCount = document.getElementById("cart-count");
const searchInput = document.getElementById("search");

// STATUS MESSAGE
const statusMessage = document.createElement("div");
statusMessage.id = "menu-status";
menuSection.appendChild(statusMessage);

// SAVE CART

const saveCart = () => {
  localStorage.setItem("cart", JSON.stringify(cartItems));
};

// GET TOTAL CART ITEMS

const getCartCount = () => {
  return cartItems.reduce((total, item) => {
    return total + item.count;
  }, 0);
};

// GET TOTAL CART PRICE

const getCartTotal = () => {
  return cartItems.reduce((total, item) => {
    return total + Number(item.price) * item.count;
  }, 0);
};

// UPDATE CART COUNT IN HEADER

const updateCartCount = () => {
  cartCount.textContent = getCartCount();
};

// CREATE FOOD CARD

const createDishCard = (dishItem) => {
  const article = document.createElement("article");

  article.classList.add("food-card");

  // Image

  const img = document.createElement("img");

  img.src = dishItem.image;

  img.alt = dishItem.name;

  // Content

  const content = document.createElement("div");

  content.classList.add("food-card-content");

  // Name

  const title = document.createElement("h3");

  title.textContent = dishItem.name;

  // Category

  const category = document.createElement("p");

  category.textContent = dishItem.category;

  // Spicy

  if (dishItem.spicy) {
    const spicy = document.createElement("span");

    spicy.classList.add("spicy");

    spicy.textContent = "🌶️ Spicy";

    content.appendChild(spicy);
  }

  // Price

  const price = document.createElement("p");

  price.classList.add("price");

  price.textContent = `${dishItem.price} ETB`;

  // Button

  const button = document.createElement("button");

  button.type = "button";

  button.classList.add("add");

  button.textContent = "Add to Cart";

  button.dataset.id = dishItem.id;

  // Append

  content.appendChild(title);

  content.appendChild(category);

  content.appendChild(price);

  content.appendChild(button);

  article.appendChild(img);

  article.appendChild(content);

  return article;
};

// RENDER MENU

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

  items.forEach((item) => {
    menuSection.appendChild(createDishCard(item));
  });
};

// CREATE CART ITEM

const createCartCard = (item) => {
  const article = document.createElement("article");

  article.classList.add("cart-item");

  // Important for event delegation

  article.dataset.id = item.id;

  // Name

  const name = document.createElement("p");

  name.classList.add("cart-item-name");

  name.textContent = item.name;

  // Quantity container

  const quantity = document.createElement("div");

  quantity.classList.add("quantity-controls");

  // Decrease

  const decrease = document.createElement("button");

  decrease.type = "button";

  decrease.classList.add("cart-item-decrease");

  decrease.dataset.action = "decrease";

  decrease.textContent = "−";

  // Count

  const count = document.createElement("span");

  count.classList.add("cart-item-count");

  count.textContent = item.count;

  // Increase

  const increase = document.createElement("button");

  increase.type = "button";

  increase.classList.add("cart-item-increase");

  increase.dataset.action = "increase";

  increase.textContent = "+";

  quantity.appendChild(decrease);

  quantity.appendChild(count);

  quantity.appendChild(increase);

  // Price

  const price = document.createElement("p");

  price.classList.add("cart-item-price");

  const itemTotal = item.price * item.count;

  price.textContent = `${itemTotal} ETB`;

  // Remove

  const remove = document.createElement("button");

  remove.type = "button";

  remove.classList.add("cart-item-remove");

  remove.dataset.action = "remove";

  remove.textContent = "×";

  remove.setAttribute("aria-label", `Remove ${item.name}`);

  // Append

  article.appendChild(name);

  article.appendChild(quantity);

  article.appendChild(price);

  article.appendChild(remove);

  return article;
};

// RENDER CART

const renderCart = () => {
  // Clear only the cart content.
  // We DON'T clear #cart itself because
  // #cart contains the close button and heading.

  cartItemsContainer.innerHTML = "";

  cartSummary.innerHTML = "";

  // Empty cart

  if (cartItems.length === 0) {
    const empty = document.createElement("p");

    empty.classList.add("empty");

    empty.textContent = "Your cart is empty.";

    cartItemsContainer.appendChild(empty);

    updateCartCount();

    return;
  }

  // Render items

  cartItems.forEach((item) => {
    cartItemsContainer.appendChild(createCartCard(item));
  });

  // SUMMARY

  const summary = document.createElement("div");

  summary.classList.add("cart-summary");

  // Total items

  const itemTotal = document.createElement("div");

  itemTotal.classList.add("summary-row");

  itemTotal.innerHTML = `
    <span>Items</span>
    <strong>${getCartCount()}</strong>
  `;

  // Total price

  const total = document.createElement("div");

  total.classList.add("summary-row", "total-row");

  total.innerHTML = `
    <span>Total</span>
    <strong>${getCartTotal()} ETB</strong>
  `;

  // Checkout

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

// ADD TO CART

const addToCart = (id) => {
  const food = menu.find((item) => String(item.id) === String(id));

  if (!food) {
    console.error("Food not found:", id);

    return;
  }

  const existing = cartItems.find((item) => String(item.id) === String(id));

  // Already in cart

  if (existing) {
    existing.count += 1;
  }

  // New cart item
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

// INCREASE ITEM

const increaseItem = (id) => {
  const item = cartItems.find((item) => String(item.id) === String(id));

  if (!item) {
    return;
  }

  item.count += 1;

  saveCart();

  renderCart();
};

// DECREASE ITEM

const decreaseItem = (id) => {
  const item = cartItems.find((item) => String(item.id) === String(id));

  if (!item) {
    return;
  }

  item.count -= 1;

  // Remove item if quantity becomes 0

  if (item.count <= 0) {
    cartItems = cartItems.filter(
      (cartItem) => String(cartItem.id) !== String(id),
    );
  }

  saveCart();

  renderCart();
};

// REMOVE ITEM

const removeItem = (id) => {
  cartItems = cartItems.filter((item) => String(item.id) !== String(id));

  saveCart();

  renderCart();
};

// MENU EVENT DELEGATION

menuSection.addEventListener("click", (event) => {
  const button = event.target.closest(".add");

  if (!button) {
    return;
  }

  const id = button.dataset.id;

  addToCart(id);
});

// CART EVENT DELEGATION

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

// SEARCH

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

// OPEN CART

cartToggle.addEventListener("click", () => {
  cart.classList.add("open");
});

// CLOSE CART

cartClose.addEventListener("click", () => {
  cart.classList.remove("open");
});

// FETCH MENU

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

// CHECKOUT

cartSummary.addEventListener("click", (event) => {
  if (event.target.classList.contains("checkout")) {
    if (cartItems.length === 0) {
      alert("Your cart is empty.");

      return;
    }

    alert(`Order total: ${getCartTotal()} ETB`);
  }
});

// INITIALIZE APP

renderCart();

fetchMenu();
