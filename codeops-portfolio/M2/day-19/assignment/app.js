// TODO: Hold items in an array (this is your single source of truth)
let items = [];

// TODO: Select necessary DOM elements (form, input, list, count)

const form = document.querySelector("#add-form");
const input = document.querySelector("#name");
const list = document.querySelector("#list");
const count = document.querySelector("#count");

// TODO: Write a render() function to rebuild the list from the array
// 1. Clear the current list (innerHTML = "")
// 2. Loop through the items array
// 3. Create elements, use data-id on each row, and append to the list
// 4. Update the live count paragraph
function render() {
  // Logic goes here...
  list.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.dataset.id = item.id;

    if (item.done) {
      li.classList.add("done");
    }

    const span = document.createElement("span");
    span.textContent = item.name;

    const button = document.createElement("button");
    button.textContent = "Remove";

    li.appendChild(span);
    li.appendChild(button);

    list.appendChild(li);
  });

  count.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
}

// TODO: Handle form submission
// 1. preventDefault to stop page reload
// 2. Read and validate the input
// 3. Push a new object to the items array (include a unique id and done: false)
// 4. Call render()

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = input.value.trim();
  if (name == "") return;

  const newItem = {
    id: Date.now(),
    name: name,
    done: false,
  };

  items.push(newItem);
  input.value = "";
  input.focus();

  render();
});
// TODO: Set up event delegation on the #list
// 1. Listen for clicks on the parent <ul>
// 2. Use e.target and closest() to find the clicked row
// 3. Determine if the user is toggling ".done" or removing a row
// 4. Update the items array accordingly
// 5. Call render()
list.addEventListener("click", (e) => {
  const row = e.target.closest("li");
  if (!row) return;

  const id = Number(row.dataset.id);

  if (e.target.classList.contains("del")) {
    items = items.filter((item) => item.id !== id);
  } else {
    const item = items.find((item) => item.id === id);
    if (item) {
      item.done = !item.done;
    }
  }
  render();
});

render();
