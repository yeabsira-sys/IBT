const data = `[
  {
    "id": 1,
    "name": "Doro Wat",
    "category": "Main",
    "price": 240,
    "spicy": true
  },
  {
    "id": 2,
    "name": "Shiro",
    "category": "Vegetarian",
    "price": 120,
    "spicy": false
  },
  { "id": 3, "name": "Kitfo", "category": "Main", "price": 320, "spicy": true },
  { "id": 4, "name": "Tibs", "category": "Main", "price": 280, "spicy": true },
  {
    "id": 5,
    "name": "Injera Firfir",
    "category": "Breakfast",
    "price": 100,
    "spicy": true
  },
  {
    "id": 6,
    "name": "Beyaynetu",
    "category": "Vegetarian",
    "price": 150,
    "spicy": false
  },
  {
    "id": 7,
    "name": "Misir Wat",
    "category": "Vegetarian",
    "price": 110,
    "spicy": true
  },
  {
    "id": 8,
    "name": "Gomen",
    "category": "Vegetarian",
    "price": 90,
    "spicy": false
  },
  {
    "id": 9,
    "name": "Atkilt Wot",
    "category": "Vegetarian",
    "price": 100,
    "spicy": false
  },
  {
    "id": 10,
    "name": "Derek Tibs",
    "category": "Main",
    "price": 310,
    "spicy": true
  },
  {
    "id": 11,
    "name": "Key Wat",
    "category": "Main",
    "price": 220,
    "spicy": true
  },
  {
    "id": 12,
    "name": "Alicha Wat",
    "category": "Main",
    "price": 210,
    "spicy": false
  },
  {
    "id": 13,
    "name": "Bozena Shiro",
    "category": "Main",
    "price": 180,
    "spicy": true
  },
  {
    "id": 14,
    "name": "Ayibe",
    "category": "Side",
    "price": 70,
    "spicy": false
  },
  {
    "id": 15,
    "name": "Kocho",
    "category": "Side",
    "price": 60,
    "spicy": false
  },
  {
    "id": 16,
    "name": "Enkulal Firfir",
    "category": "Breakfast",
    "price": 110,
    "spicy": true
  },
  {
    "id": 17,
    "name": "Fuul",
    "category": "Breakfast",
    "price": 90,
    "spicy": true
  },
  {
    "id": 18,
    "name": "Genfo",
    "category": "Breakfast",
    "price": 130,
    "spicy": true
  },
  {
    "id": 19,
    "name": "Chechebsa",
    "category": "Breakfast",
    "price": 120,
    "spicy": true
  },
  {
    "id": 20,
    "name": "Kik Alicha",
    "category": "Vegetarian",
    "price": 100,
    "spicy": false
    }
    ]
    `;

const createDishCard = (dishItem) => {
  let article = document.createElement("article");
  let img = document.createElement("img");
  let div = document.createElement("div");
  let h3 = document.createElement("h3");
  let categoryParag = document.createElement("p");
  let priceParag = document.createElement("p");
  let button = document.createElement("button");

  article.classList.add("food-card");
  // img.src = dishItem.image

  h3.textContent = dishItem.name;
  categoryParag.textContent = dishItem.category;
  priceParag.textContent = dishItem.price + " ETB";
  button.classList.add("add");
  button.textContent = "Add to Cart";
  button.id = dishItem.id;
  div.classList.add("food-card-content");
  div.appendChild(h3);
  div.appendChild(categoryParag);
  div.appendChild(priceParag);
  div.appendChild(button);
  article.appendChild(img);
  article.appendChild(div);

  return article;
};

const createCartCard = (item) => {
  // <article class="cart-item">
  //         <p id="cart-item-name">name</p>
  //         <p id="cart-item-count">count</p>
  //         <p id="cart-item-price">price</p>
  //         <button id="increase">increase</button>
  //         <button id="decrease">decrease</button>
  //         <button id="remove">remove</button>
  //       </article>

  const cartArticle = document.createElement("article");
  const cartItemName = document.createElement("p");
  const cartItemCount = document.createElement("p");
  const cartItemPrice = document.createElement("p");
  const increaseButton = document.createElement("button");
  const decreaseButton = document.createElement("button");
  const removeButton = document.createElement("button");

  cartArticle.classList.add("cart-item");
  cartItemName.textContent = item.name;
  cartItemName.id = "cart-item-name";

  cartItemCount.textContent = item.count;
  cartItemCount.id = "cart-item-count";

  cartItemPrice.textContent = Number(item.price) * Number(item.count);
  cartItemPrice.id = "cart-item-price";

  increaseButton.id = "cart-item-increase";
  decreaseButton.id = "cart-item-decrease";
  removeButton.id = "cart-item-remove";

  cartArticle.appendChild(cartItemName);
  cartArticle.appendChild(cartItemCount);
  cartArticle.appendChild(cartItemPrice);
  cartArticle.appendChild(increaseButton);
  cartArticle.appendChild(decreaseButton);
  cartArticle.appendChild(removeButton);
};

const renderCart = (cartItem) => {
  const cartSection = document.getElementById("cart");
  cartItem &&
    cartItem.map((item) => {
      cartSection.appendChild(createCartCard(item));
    });
};

const addToCart = (id) => {
  let item = menu.filter((item) => {
    item.id === id;
  });
  item.count = 1;
  cart = [...cart, item];
};

// load data

const menu = JSON.parse(data);

// load cart items from the local storage

const cart = localStorage.getItem("cart") || [];

renderCart(cart);

// render food items
menu.map((dishItem) => {
  const dishcard = createDishCard(dishItem);
  const menuSection = document.getElementById("menu");
  menuSection.appendChild(dishcard);
});

// render cart items

// add to cart functionality

const addToCartButton = document.querySelectorAll(".add");
addToCartButton.forEach((button) => {
  button.addEventListener("click", addToCart(button.id));
});

// <!-- <article class="food-card">
//         <img src="..." alt="Doro Wat" />

//         <div class="food-card-content">
//           <h3>Doro Wat</h3>
//           <p>Spicy Ethiopian chicken stew</p>
//           <p class="price">240 ETB</p>

//           <button class="add">Add to Cart</button>
//         </div>
//       </article> -->
